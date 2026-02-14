import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import api from '../../api/client';
import { ToastContext } from '../../App';
import SearchableSelect from '../common/SearchableSelect';

export default function GeneratorPage() {
  const showToast = useContext(ToastContext);
  const planRef = useRef(null);
  const lightboxRef = useRef(null);

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

  const openLightbox = () => setLightboxOpen(true);

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

  // Escape schliesst die Lightbox, Fullscreen-Änderungen tracken
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

  useEffect(() => {
    api.get('/classes').then(res => setClasses(res.data)).catch(() => {});
    api.get('/rooms').then(res => setRooms(res.data)).catch(() => {});
  }, []);

  const generate = async () => {
    if (!selectedClass || !selectedRoom) {
      showToast('Bitte Klasse und Zimmer wählen', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/generator/generate', {
        classId: parseInt(selectedClass),
        roomId: parseInt(selectedRoom),
      });
      setResult(res.data);
      if (res.data.warning) {
        showToast(res.data.warning, 'warning');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Fehler beim Generieren', 'error');
    }
    setGenerating(false);
  };

  const handleClassChange = (val) => {
    setSelectedClass(val);
    const cls = classes.find(c => c.id === parseInt(val));
    setClassName(cls?.name || '');
    setResult(null);
  };

  const handleRoomChange = (val) => {
    setSelectedRoom(val);
    const room = rooms.find(r => r.id === parseInt(val));
    setRoomName(room?.name || '');
    setResult(null);
  };

  const downloadPng = async () => {
    if (!planRef.current) return;
    try {
      const dataUrl = await toPng(planRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `sitzmix-${className || 'plan'}-${roomName || 'zimmer'}.png`;
      link.href = dataUrl;
      link.click();
      showToast('PNG heruntergeladen');
    } catch {
      showToast('Fehler beim Export', 'error');
    }
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

        <div className="mt-4 flex gap-3">
          <button
            onClick={generate}
            disabled={!selectedClass || !selectedRoom || generating}
            className="bg-lime-500 hover:bg-lime-600 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors disabled:opacity-30"
          >
            {generating ? 'Generiere...' : result ? 'Neu mischen' : 'Sitzplan generieren'}
          </button>
          {result && (
            <button
              onClick={downloadPng}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
            >
              Als PNG herunterladen
            </button>
          )}
        </div>
      </div>

      {result && result.room && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{className} – {roomName}</h2>
            {!result.success && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-3 py-1 rounded-full">
                Nicht alle Regeln eingehalten
              </span>
            )}
          </div>
          <div ref={planRef} className="relative bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in" onClick={openLightbox} title="Klicken zum Vergrössern">
            {result.room.floorplan_image_path ? (
              <img
                src={`/api/uploads/${result.room.floorplan_image_path}`}
                alt="Grundriss"
                className="w-full block"
                draggable={false}
              />
            ) : (
              <div className="aspect-video bg-gray-200 flex items-center justify-center text-gray-400">
                Kein Grundriss vorhanden
              </div>
            )}

            {result.assignments.map((a, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${a.xPosition}%`,
                  top: `${a.yPosition}%`,
                }}
              >
                {a.student ? (
                  <>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-800 shadow-md border-2 border-white"
                      style={{ backgroundColor: a.student.color }}
                    >
                      {a.seatNumber}
                    </div>
                    <span className="mt-0.5 text-[10px] font-semibold text-gray-800 bg-white/95 px-1.5 py-0.5 rounded shadow-sm text-center leading-tight overflow-visible">
                      {a.student.name.includes(' ')
                        ? <><span className="whitespace-nowrap">{a.student.name.split(' ')[0]}</span><br /><span className="font-normal whitespace-nowrap">{a.student.name.split(' ').slice(1).join(' ')}</span></>
                        : a.student.name}
                    </span>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-500 border-2 border-white shadow-sm">
                    {a.seatNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
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
          {/* Toolbar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent z-10">
            <h3 className="text-white font-semibold text-sm">{className} – {roomName}</h3>
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

          {/* Sitzplan gross */}
          <div className="relative max-w-[95vw] max-h-[90vh] overflow-auto">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              {result.room.floorplan_image_path ? (
                <img
                  src={`/api/uploads/${result.room.floorplan_image_path}`}
                  alt="Grundriss"
                  className="block max-h-[88vh] w-auto"
                  draggable={false}
                />
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center text-gray-400 min-w-[60vw]">
                  Kein Grundriss vorhanden
                </div>
              )}

              {result.assignments.map((a, i) => (
                <div
                  key={i}
                  className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${a.xPosition}%`,
                    top: `${a.yPosition}%`,
                  }}
                >
                  {a.student ? (
                    <>
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold text-gray-800 shadow-md border-2 border-white"
                        style={{ backgroundColor: a.student.color }}
                      >
                        {a.seatNumber}
                      </div>
                      <span className="mt-0.5 text-xs font-semibold text-gray-800 bg-white/95 px-2 py-0.5 rounded shadow-sm text-center leading-tight overflow-visible">
                        {a.student.name.includes(' ')
                          ? <><span className="whitespace-nowrap">{a.student.name.split(' ')[0]}</span><br /><span className="font-normal whitespace-nowrap">{a.student.name.split(' ').slice(1).join(' ')}</span></>
                          : a.student.name}
                      </span>
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-500 border-2 border-white shadow-sm">
                      {a.seatNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
