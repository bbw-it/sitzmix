import { useRef, useState, useEffect, useCallback } from 'react';
import { createRectangle, createCircle, insertVertex, removeVertex, moveVertex, toFileFormat } from '../../lib/sketch';

export default function SketchEditor({ initialSketch, onSave, onClose }) {
  const width = initialSketch?.width || 1000;
  const height = initialSketch?.height || 700;
  const svgRef = useRef(null);
  const [shapes, setShapes] = useState(initialSketch?.shapes ? initialSketch.shapes.map(s => ({ ...s })) : []);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVertex, setSelectedVertex] = useState(null); // { shapeId, index }
  const [drag, setDrag] = useState(null);

  const clampX = (x) => Math.max(0, Math.min(width, x));
  const clampY = (y) => Math.max(0, Math.min(height, y));

  const toUnits = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: clampX(((clientX - rect.left) / rect.width) * width),
      y: clampY(((clientY - rect.top) / rect.height) * height),
    };
  }, [width, height]);

  const updateShape = (id, fn) => setShapes(list => list.map(s => (s.id === id ? fn(s) : s)));

  const onPointerMove = (e) => {
    if (!drag) return;
    const p = toUnits(e.clientX, e.clientY);
    if (drag.kind === 'move-shape') {
      const dx = p.x - drag.last.x, dy = p.y - drag.last.y;
      updateShape(drag.id, s => {
        if (s.type === 'polygon') return { ...s, points: s.points.map(pt => ({ x: clampX(pt.x + dx), y: clampY(pt.y + dy) })) };
        return { ...s, cx: clampX(s.cx + dx), cy: clampY(s.cy + dy) };
      });
      setDrag({ ...drag, last: p });
    } else if (drag.kind === 'move-vertex') {
      updateShape(drag.id, s => ({ ...s, points: moveVertex(s.points, drag.index, p.x, p.y) }));
    } else if (drag.kind === 'radius') {
      updateShape(drag.id, s => ({ ...s, r: Math.max(width * 0.02, Math.hypot(p.x - s.cx, p.y - s.cy)) }));
    }
  };
  const endDrag = () => setDrag(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (selectedVertex) {
        e.preventDefault();
        updateShape(selectedVertex.shapeId, s => ({ ...s, points: removeVertex(s.points, selectedVertex.index) }));
        setSelectedVertex(null);
      } else if (selectedId) {
        e.preventDefault();
        setShapes(list => list.filter(s => s.id !== selectedId));
        setSelectedId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedVertex, selectedId]);

  const addRect = () => { const r = createRectangle(width, height); setShapes(s => [...s, r]); setSelectedId(r.id); setSelectedVertex(null); };
  const addCircle = () => { const c = createCircle(width, height); setShapes(s => [...s, c]); setSelectedId(c.id); setSelectedVertex(null); };
  const saveJson = () => {
    const blob = new Blob([JSON.stringify(toFileFormat({ version: 1, width, height, shapes }), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sitzmix-grundriss.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const vr = Math.max(width, height) * 0.012; // vertex handle radius
  const sw = Math.max(width, height) * 0.004;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-gray-900">Grundriss skizzieren</h2>
          <div className="flex items-center gap-2">
            <button onClick={addRect} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">+ Rechteck</button>
            <button onClick={addCircle} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">+ Kreis</button>
            <button onClick={saveJson} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Als JSON speichern</button>
          </div>
        </div>

        <div className="p-6 overflow-auto">
          <p className="text-xs text-gray-500 mb-3">
            Form anklicken zum Auswählen · Körper ziehen zum Verschieben · Eckpunkte ziehen · hohle <span className="font-bold">+</span>-Punkte auf den Kanten fügen Ecken hinzu · Delete löscht Punkt/Form.
          </p>
          <div className="bg-white border border-gray-200 rounded-lg select-none" style={{ aspectRatio: `${width} / ${height}` }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full"
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onClick={(e) => { if (e.target === e.currentTarget || e.target.tagName === 'rect') { setSelectedId(null); setSelectedVertex(null); } }}
            >
              <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />
              {shapes.map(s => {
                const selected = s.id === selectedId;
                if (s.type === 'polygon') {
                  return (
                    <g key={s.id}>
                      <polygon
                        points={s.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="#e5e7eb" stroke={selected ? '#2563eb' : '#475569'} strokeWidth={sw} strokeLinejoin="round"
                        style={{ cursor: 'move' }}
                        onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setSelectedVertex(null); setDrag({ kind: 'move-shape', id: s.id, last: toUnits(e.clientX, e.clientY) }); }}
                      />
                      {selected && s.points.map((p, i) => {
                        const b = s.points[(i + 1) % s.points.length];
                        const mid = { x: (p.x + b.x) / 2, y: (p.y + b.y) / 2 };
                        const isSel = selectedVertex && selectedVertex.shapeId === s.id && selectedVertex.index === i;
                        return (
                          <g key={i}>
                            <circle cx={mid.x} cy={mid.y} r={vr * 0.8} fill="white" stroke="#2563eb" strokeWidth={sw}
                              style={{ cursor: 'copy' }}
                              onPointerDown={(e) => { e.stopPropagation(); updateShape(s.id, sh => ({ ...sh, points: insertVertex(sh.points, i) })); setSelectedVertex({ shapeId: s.id, index: i + 1 }); }} />
                            <circle cx={p.x} cy={p.y} r={vr} fill={isSel ? '#2563eb' : 'white'} stroke="#2563eb" strokeWidth={sw}
                              style={{ cursor: 'grab' }}
                              onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setSelectedVertex({ shapeId: s.id, index: i }); setDrag({ kind: 'move-vertex', id: s.id, index: i }); }} />
                          </g>
                        );
                      })}
                    </g>
                  );
                }
                return (
                  <g key={s.id}>
                    <circle cx={s.cx} cy={s.cy} r={s.r} fill="#e5e7eb" stroke={selected ? '#2563eb' : '#475569'} strokeWidth={sw}
                      style={{ cursor: 'move' }}
                      onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setSelectedVertex(null); setDrag({ kind: 'move-shape', id: s.id, last: toUnits(e.clientX, e.clientY) }); }} />
                    {selected && (
                      <circle cx={s.cx + s.r} cy={s.cy} r={vr} fill="white" stroke="#2563eb" strokeWidth={sw}
                        style={{ cursor: 'ew-resize' }}
                        onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setDrag({ kind: 'radius', id: s.id }); }} />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button onClick={() => { if (selectedId) { setShapes(list => list.filter(s => s.id !== selectedId)); setSelectedId(null); } }}
            disabled={!selectedId} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30">Form löschen</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Abbrechen</button>
            <button onClick={() => onSave({ version: 1, width, height, shapes })} className="px-4 py-2 text-sm font-medium text-white bg-lime-600 hover:bg-lime-700 rounded-lg">Fertig</button>
          </div>
        </div>
      </div>
    </div>
  );
}
