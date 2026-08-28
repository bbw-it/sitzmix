import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useStore } from '../../store/StoreProvider';
import { ToastContext } from '../../App';
import SearchableSelect from '../common/SearchableSelect';
import Button from '../common/Button';
import AbsentList from './AbsentList';
import { swapOrMove, markAbsent, placeStudent, nextFreeSeatIndex } from '../../lib/seatingPlan';
import { computeExportPixelRatio } from '../../lib/pngExport';

export default function GeneratorPage() {
  const showToast = useContext(ToastContext);
  const { listClasses, listRooms, generate, getImageUrl } = useStore();
  const planRef = useRef(null);
  const lightboxRef = useRef(null);
  const dragIndexRef = useRef(null);
  const resultRef = useRef(null);
  const shouldScrollRef = useRef(false);
  const [planImageUrl, setPlanImageUrl] = useState(null);
  const [seats, setSeats] = useState([]);   // bearbeitbare Kopie von result.assignments
  const [absent, setAbsent] = useState([]);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [studentView, setStudentView] = useState(false);   // Normalansicht: false = Lehrpersonen-Sicht (Standard)
  const [lightboxStudentView, setLightboxStudentView] = useState(true);   // Vollbild: startet in Lernenden-Sicht

  // Drag-Zustand sicher aufräumen, egal wo der Drag endet (auch von der Abwesenden-Liste)
  useEffect(() => {
    const clear = () => { setDraggingIndex(null); setDragOverIndex(null); };
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
    return () => { window.removeEventListener('dragend', clear); window.removeEventListener('drop', clear); };
  }, []);

  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [className, setClassName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fillMode, setFillMode] = useState('sequential');
  const [personsPerArea, setPersonsPerArea] = useState(3);
  const [order, setOrder] = useState('random');   // 'random' | 'alphabetical'

  const openLightbox = () => { setLightboxStudentView(true); setLightboxOpen(true); };   // Vollbild standardmässig in Lernenden-Sicht

  const closeLightbox = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
    setLightboxOpen(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!lightboxRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      await lightboxRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
    };
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [lightboxOpen, closeLightbox]);

  // Tastenkürzel: 'L' wechselt die Perspektive, 'F' öffnet/schliesst das Vollbild
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (lightboxOpen) setLightboxStudentView(v => !v);
        else setStudentView(v => !v);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!result) return;
        e.preventDefault();
        if (lightboxOpen) closeLightbox();
        else openLightbox();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, result, closeLightbox]);

  useEffect(() => {
    const classList = listClasses();
    const roomList = listRooms();
    setClasses(classList);
    setRooms(roomList);
    // Wenn nur ein Zimmer existiert: automatisch auswählen
    if (roomList.length === 1) {
      const room = roomList[0];
      setSelectedRoom(room.id);
      setRoomName(room.name);
      setFillMode(room.hasAreas ? 'per_area' : 'sequential');
    }
    // Analog: nur eine Klasse → automatisch auswählen
    if (classList.length === 1) {
      const cls = classList[0];
      setSelectedClass(cls.id);
      setClassName(cls.name);
    }
  }, []);

  // Nach dem ersten Generieren sanft zum Plan scrollen (kurze Verzögerung, damit
  // der Grundriss geladen ist und die Seite ihre volle Höhe erreicht hat)
  useEffect(() => {
    if (result && shouldScrollRef.current) {
      shouldScrollRef.current = false;
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, [result]);

  // Grundriss-Bild des Ergebnisses als Object-URL auflösen
  useEffect(() => {
    let active = true;
    const imgId = result?.room?.floorplan_image_path;
    if (imgId) {
      getImageUrl(imgId).then(u => { if (active) setPlanImageUrl(u); });
    } else {
      setPlanImageUrl(null);
    }
    return () => { active = false; };
  }, [result?.room?.floorplan_image_path]);

  const selectedRoomHasAreas = selectedRoom
    ? rooms.find(r => r.id === selectedRoom)?.hasAreas
    : false;

  const handleGenerate = () => {
    if (!selectedClass || !selectedRoom) {
      showToast('Bitte Klasse und Zimmer wählen', 'warning');
      return;
    }
    setGenerating(true);
    try {
      // Abwesende bleiben abwesend, auch beim Neu-Mischen.
      const payload = { classId: selectedClass, roomId: selectedRoom, absentIds: absent.map(s => s.id), order };
      if (selectedRoomHasAreas && fillMode === 'per_area') {
        payload.fillMode = 'per_area';
        payload.personsPerArea = personsPerArea;
      }
      if (!result) shouldScrollRef.current = true;   // beim ersten Generieren zum Plan scrollen
      const res = generate(payload);
      setResult(res);
      setSeats(res.assignments.map(a => ({ ...a })));
      if (res.warning) showToast(res.warning, 'warning');
    } catch (err) {
      showToast(err.message || 'Fehler beim Generieren', 'error');
    }
    setGenerating(false);
  };

  const handleClassChange = (val) => {
    setSelectedClass(val);
    const cls = classes.find(c => c.id === val);
    setClassName(cls?.name || '');
    setResult(null);
    setSeats([]);
    setAbsent([]);
    setStudentView(false);
  };

  const handleRoomChange = (val) => {
    setSelectedRoom(val);
    const room = rooms.find(r => r.id === val);
    setRoomName(room?.name || '');
    setResult(null);
    setSeats([]);
    setAbsent([]);
    setStudentView(false);
    setFillMode(room?.hasAreas ? 'per_area' : 'sequential');
  };

  // ── Ephemere Plan-Bearbeitung ──
  const handleMarkAbsent = (idx) => {
    const { seats: next, student } = markAbsent(seats, idx);
    if (!student) return;
    setSeats(next);
    setAbsent(prev => [...prev, student]);
  };

  const handleSeatDrop = (toIdx) => {
    const fromIdx = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIdx == null || fromIdx === toIdx) return;
    setSeats(prev => swapOrMove(prev, fromIdx, toIdx));
  };

  const handleAbsentDropOnSeat = (toIdx, studentId) => {
    const student = absent.find(s => s.id === studentId);
    if (!student) return;
    const { seats: next, placed } = placeStudent(seats, student, toIdx);
    if (!placed) return;   // besetzter Platz → ignorieren
    setSeats(next);
    setAbsent(prev => prev.filter(s => s.id !== studentId));
  };

  const handleReturnAbsent = (studentId) => {
    const idx = nextFreeSeatIndex(seats);
    if (idx === -1) { showToast('Kein freier Platz vorhanden', 'warning'); return; }
    handleAbsentDropOnSeat(idx, studentId);
  };

  const downloadPng = async () => {
    const node = planRef.current;
    if (!node) return;
    try {
      // Der Plan-Container hat keine eigene Höhe: sie entsteht erst durch das
      // Grundriss-Bild (die Sitze sind absolut positioniert). Wird exportiert,
      // bevor das Bild dekodiert ist, rendert html-to-image auf ein 0×0-Canvas
      // und liefert eine leere PNG-Datei — bei grüner Erfolgsmeldung.
      await Promise.all(
        [...node.querySelectorAll('img')].map(img =>
          img.complete ? Promise.resolve() : img.decode().catch(() => {})
        )
      );
      if (!node.offsetWidth || !node.offsetHeight) {
        showToast('Grundriss noch nicht geladen — bitte kurz warten', 'warning');
        return;
      }

      // Pixeldichte an Gerät und Plangrösse anpassen (scharf, aber gedeckelt),
      // statt fix 2 — sonst frieren schwache Geräte beim Rastern ein.
      const pixelRatio = computeExportPixelRatio({
        width: node.offsetWidth,
        height: node.offsetHeight,
        deviceMemory: navigator.deviceMemory,
      });
      const dataUrl = await toPng(node, {
        pixelRatio,
        backgroundColor: '#ffffff',
        filter: (n) => !(n.classList && n.classList.contains('export-hide')),
      });
      // Letzte Sicherung: ein leeres Canvas liefert exakt "data:,".
      if (!dataUrl || dataUrl.length < 32) {
        showToast('Fehler beim Export', 'error');
        return;
      }

      const link = document.createElement('a');
      link.download = `sitzmix-${className || 'plan'}-${roomName || 'zimmer'}.png`;
      link.href = dataUrl;
      link.click();
      showToast('PNG heruntergeladen');
    } catch {
      showToast('Fehler beim Export', 'error');
    }
  };

  const renderSeatingPlan = (sizeVariant = 'normal') => {
    const circleClass = sizeVariant === 'large' ? 'w-11 h-11 text-xs' : 'w-9 h-9 text-[10px]';
    const emptyCircleClass = sizeVariant === 'large' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
    const textClass = sizeVariant === 'large' ? 'text-xs' : 'text-[10px]';

    const flipped = sizeVariant === 'large' ? lightboxStudentView : studentView;
    const flipTransform = flipped ? 'scaleX(-1) scaleY(-1)' : 'none';
    return (
      <>
        {planImageUrl ? (
          <img
            src={planImageUrl}
            alt="Grundriss"
            className={sizeVariant === 'large' ? 'block max-h-[88vh] w-auto' : 'w-full block'}
            style={{ transform: flipTransform }}
            draggable={false}
          />
        ) : (
          <div className={`aspect-video bg-gray-200 flex items-center justify-center text-gray-400 ${sizeVariant === 'large' ? 'min-w-[60vw]' : ''}`}>
            Kein Grundriss vorhanden
          </div>
        )}

        {seats.map((a, i) => {
          const interactive = sizeVariant === 'normal';
          const isDragSource = interactive && draggingIndex === i;
          const isDropTarget = interactive && dragOverIndex === i && draggingIndex !== i;
          return (
          <div
            key={a.seatId ?? i}
            className={`group absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-opacity ${isDragSource ? 'opacity-30' : ''}`}
            style={{
              left: `${flipped ? 100 - a.xPosition : a.xPosition}%`,
              top: `${flipped ? 100 - a.yPosition : a.yPosition}%`,
            }}
            {...(interactive ? {
              draggable: !!a.student,
              onDragStart: () => { dragIndexRef.current = i; setDraggingIndex(i); },
              onDragEnd: () => { setDraggingIndex(null); setDragOverIndex(null); },
              onDragOver: (e) => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i); },
              onDragLeave: () => { setDragOverIndex(prev => (prev === i ? null : prev)); },
              onDrop: (e) => {
                e.preventDefault();
                const absentId = e.dataTransfer.getData('text/absent-id');
                if (absentId) handleAbsentDropOnSeat(i, absentId);
                else handleSeatDrop(i);
                setDraggingIndex(null); setDragOverIndex(null);
              },
            } : {})}
          >
            {a.student ? (
              <>
                <div className="relative">
                  {interactive && (
                    <button
                      className="export-hide absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Als abwesend markieren"
                      onClick={(e) => { e.stopPropagation(); handleMarkAbsent(i); }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                  <div
                    className={`${circleClass} rounded-full flex items-center justify-center font-bold text-gray-800 shadow-md border-2 border-white transition-transform ${interactive ? 'cursor-grab active:cursor-grabbing group-hover:scale-110' : ''} ${isDropTarget ? 'ring-4 ring-blue-400 ring-offset-1 scale-110' : ''}`}
                    style={{ backgroundColor: a.student.color }}
                  >
                    {a.seatNumber}
                  </div>
                </div>
                <span className={`mt-0.5 ${textClass} font-semibold text-gray-800 bg-white/95 px-1.5 py-0.5 rounded shadow-sm text-center leading-tight overflow-visible`}>
                  {a.student.name.includes(' ')
                    ? <><span className="whitespace-nowrap">{a.student.name.split(' ')[0]}</span><br /><span className="font-normal whitespace-nowrap">{a.student.name.split(' ').slice(1).join(' ')}</span></>
                    : a.student.name}
                </span>
              </>
            ) : (
              <div className={`${emptyCircleClass} rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm transition-all ${isDropTarget ? 'bg-blue-100 text-blue-500 ring-4 ring-blue-400 scale-110' : 'bg-gray-300 text-gray-500'}`}>
                {a.seatNumber}
              </div>
            )}
          </div>
          );
        })}
      </>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Sitzplan Generator</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Klasse</label>
            <SearchableSelect
              value={selectedClass}
              onChange={handleClassChange}
              placeholder="Klasse wählen..."
              options={classes.map(c => ({ value: c.id, label: `${c.name} (${c.studentCount} Lernende)` }))}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Zimmer</label>
            <SearchableSelect
              value={selectedRoom}
              onChange={handleRoomChange}
              placeholder="Zimmer wählen..."
              options={rooms.map(r => ({ value: r.id, label: `${r.name} (${r.seatCount} Plätze)` }))}
            />
          </div>
        </div>

        {/* Fill mode selector (only when room has areas) */}
        {selectedRoomHasAreas && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-sm font-bold text-gray-900 mb-2">Belegungsregel</label>
            <div className="flex flex-wrap items-stretch gap-3">
              {(() => {
                const frame = (active) =>
                  `flex items-center gap-2.5 px-4 h-12 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-1 ${
                    active ? 'border-lime-500 bg-lime-50 text-lime-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`;
                const radio = (active) => (
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'border-lime-600' : 'border-gray-300'}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-lime-600" />}
                  </span>
                );
                const seqActive = fillMode === 'sequential';
                const areaActive = fillMode === 'per_area';
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setFillMode('sequential')}
                      aria-pressed={seqActive}
                      className={frame(seqActive)}
                    >
                      {radio(seqActive)}
                      Alle Plätze auffüllen
                    </button>

                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={areaActive}
                      onClick={() => setFillMode('per_area')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFillMode('per_area'); } }}
                      className={`${frame(areaActive)} cursor-pointer`}
                    >
                      {radio(areaActive)}
                      Pro Bereich
                      {areaActive && (
                        <span
                          className="flex items-center gap-2 ml-1 pl-3 border-l border-lime-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={personsPerArea}
                            onChange={(e) => setPersonsPerArea(parseInt(e.target.value) || 1)}
                            className="w-14 h-8 border border-lime-300 bg-white rounded-md px-2 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                          />
                          <span className="font-normal text-lime-700">Personen pro Bereich</span>
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Reihenfolge – unabhängig von der Belegungsregel, daher immer sichtbar */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-bold text-gray-900 mb-2">Reihenfolge</label>
          <div className="flex flex-wrap items-stretch gap-3">
            {(() => {
              const frame = (active) =>
                `flex items-center gap-2.5 px-4 h-12 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-1 ${
                  active ? 'border-lime-500 bg-lime-50 text-lime-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`;
              const radio = (active) => (
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'border-lime-600' : 'border-gray-300'}`}>
                  {active && <span className="w-2 h-2 rounded-full bg-lime-600" />}
                </span>
              );
              const opts = [
                ['random', 'Zufällig', 'Lernende werden zufällig verteilt'],
                ['alphabetical', 'Alphabetisch', 'Platz 1 = erste Person alphabetisch, Platz 2 = zweite usw.'],
              ];
              return opts.map(([val, label, title]) => {
                const active = order === val;
                return (
                  <button
                    key={val}
                    type="button"
                    title={title}
                    onClick={() => setOrder(val)}
                    aria-pressed={active}
                    className={frame(active)}
                  >
                    {radio(active)}
                    {label}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={!selectedClass || !selectedRoom || generating}
          >
            {generating ? 'Generiere…' : 'Sitzplan generieren'}
          </Button>
        </div>
      </div>

      {result && result.room && (
        <div ref={resultRef} className="bg-white border border-gray-200 rounded-xl px-6 pb-6 scroll-mt-4">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur -mx-6 px-6 pt-5 pb-3 mb-4 border-b border-gray-100 rounded-t-xl">
           <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">{className} – {roomName}</h2>
              {!result.success && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-3 py-1 rounded-full">
                  Nicht alle Regeln eingehalten
                </span>
              )}
              {result.success && result.alphabeticalShifts > 0 && (
                <span
                  className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full"
                  title="Verbotene Paare hätten sonst nebeneinander gesessen — die betroffenen Lernenden sind auf den nächsten zulässigen Platz gerückt."
                >
                  Reihenfolge wegen Regeln angepasst
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="primary" size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generiere…' : (order === 'alphabetical' ? 'Neu berechnen' : 'Neu mischen')}
              </Button>
              <div className="inline-flex items-center rounded-full bg-gray-100 p-1 text-sm" title="Perspektive wechseln (Taste L)">
                <button
                  onClick={() => setStudentView(false)}
                  aria-pressed={!studentView}
                  className={`px-4 py-1.5 rounded-full transition-all ${!studentView ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500 font-medium hover:text-gray-700'}`}
                >
                  Lehrpersonen-Sicht
                </button>
                <button
                  onClick={() => setStudentView(true)}
                  aria-pressed={studentView}
                  className={`px-4 py-1.5 rounded-full transition-all ${studentView ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-500 font-medium hover:text-gray-700'}`}
                >
                  Lernenden-Sicht
                </button>
              </div>
              <Button variant="secondary" size="sm" onClick={downloadPng}>
                Als PNG herunterladen
              </Button>
            </div>
           </div>
           {absent.length > 0 && (
             <div className="mt-3 pt-3 border-t border-gray-100">
               <AbsentList absent={absent} onReturn={handleReturnAbsent} />
             </div>
           )}
          </div>
          <div ref={planRef} className="relative bg-gray-100 rounded-lg overflow-hidden">
            {renderSeatingPlan('normal')}
            <button
              onClick={openLightbox}
              title="Vollbild (Taste F)"
              className="export-hide absolute top-2 right-2 z-20 bg-white/85 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg p-2 shadow-sm backdrop-blur transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" /></svg>
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Tipp: Lernende per Drag &amp; Drop verschieben · <span className="text-gray-500">×</span> markiert abwesend · Taste <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">L</kbd> wechselt die Perspektive · <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">F</kbd> öffnet das Vollbild.
          </p>
        </div>
      )}

      {!result && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-16 text-center">
          <p className="text-gray-400 text-lg">Wähle eine Klasse und ein Zimmer, um einen Sitzplan zu generieren.</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && result && result.room && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
        >
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent z-10">
            <h3 className="text-white font-semibold text-sm">
              {className} – {roomName}
              <span className="ml-2 font-normal text-white/70">
                · {lightboxStudentView ? 'Lernenden-Sicht' : 'Lehrpersonen-Sicht'} (Taste L)
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4M9 15l-5 5m0 0v-4m0 4h4m6-6l5-5m0 0v4m0-4h-4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
                  </svg>
                )}
              </button>
              <button
                onClick={closeLightbox}
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                title="Schliessen (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="relative max-w-[95vw] max-h-[90vh] overflow-auto">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              {renderSeatingPlan('large')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
