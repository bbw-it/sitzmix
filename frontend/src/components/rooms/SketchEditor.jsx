import { useRef, useState, useEffect, useCallback } from 'react';
import {
  createRect, createEllipse, insertVertex, removeVertex, moveVertex, toFileFormat,
  toBox, fromBox, boxCorners, boxHandles, rotationHandle, resizeBox, rotateShape,
  moveShape, rectToPolygon, shapeCenter, angleFromPointer, normalizeShapes, snapValue,
} from '../../lib/sketch';
import Button from '../common/Button';

const HANDLE_CURSORS = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
};

export default function SketchEditor({ initialSketch, onSave, onClose }) {
  const width = initialSketch?.width || 1000;
  const height = initialSketch?.height || 700;
  const svgRef = useRef(null);
  const [shapes, setShapes] = useState(() => normalizeShapes(initialSketch?.shapes || []));
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVertex, setSelectedVertex] = useState(null); // { shapeId, index }
  const [snapOn, setSnapOn] = useState(true);
  const dragRef = useRef(null);

  const maxDim = Math.max(width, height);
  const gridStep = Math.round(maxDim / 40);          // Raster-Schrittweite
  const minSize = Math.max(gridStep, Math.round(maxDim * 0.03));
  const vr = maxDim * 0.011;                          // Griff-Radius
  const sw = maxDim * 0.0035;                         // Strichstärke
  const rotGap = maxDim * 0.06;                       // Abstand Dreh-Griff

  const selected = shapes.find(s => s.id === selectedId) || null;

  const clamp = (v, max) => Math.max(0, Math.min(max, v));
  const toUnits = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }, [width, height]);

  const updateShape = (id, fn) => setShapes(list => list.map(s => (s.id === id ? fn(s) : s)));

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toUnits(e.clientX, e.clientY);
    const step = (snapOn && !e.altKey) ? gridStep : 0;

    if (drag.kind === 'move-shape') {
      let dx = p.x - drag.last.x, dy = p.y - drag.last.y;
      updateShape(drag.id, s => {
        if (step) {
          const c = shapeCenter(s);
          dx = snapValue(c.x + dx, step) - c.x;
          dy = snapValue(c.y + dy, step) - c.y;
        }
        return moveShape(s, dx, dy);
      });
      dragRef.current = { ...drag, last: { x: drag.last.x + dx, y: drag.last.y + dy } };
    } else if (drag.kind === 'resize') {
      updateShape(drag.id, s => {
        const box = resizeBox(toBox(s), drag.handle, p, { snapStep: step, keepAspect: e.shiftKey, min: minSize });
        box.cx = clamp(box.cx, width); box.cy = clamp(box.cy, height);
        return fromBox(s.type, box, s.id);
      });
    } else if (drag.kind === 'rotate') {
      updateShape(drag.id, s => {
        let deg = angleFromPointer(shapeCenter(s), p);
        if (e.shiftKey || (snapOn && !e.altKey)) deg = Math.round(deg / 15) * 15;
        return rotateShape(s, deg);
      });
    } else if (drag.kind === 'move-vertex') {
      const x = step ? snapValue(p.x, step) : p.x;
      const y = step ? snapValue(p.y, step) : p.y;
      updateShape(drag.id, s => ({ ...s, points: moveVertex(s.points, drag.index, clamp(x, width), clamp(y, height)) }));
    }
  };
  const endDrag = () => { dragRef.current = null; };

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

  const addShape = (factory) => {
    const s = factory(width, height);
    setShapes(list => [...list, s]);
    setSelectedId(s.id); setSelectedVertex(null);
  };
  const convertToPolygon = () => {
    if (!selected || selected.type !== 'rect') return;
    updateShape(selected.id, rectToPolygon);
    setSelectedVertex(null);
  };
  const deleteSelected = () => {
    if (!selectedId) return;
    setShapes(list => list.filter(s => s.id !== selectedId));
    setSelectedId(null); setSelectedVertex(null);
  };
  const saveJson = () => {
    const blob = new Blob([JSON.stringify(toFileFormat({ width, height, shapes }), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sitzmix-grundriss.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const beginMove = (e, s) => {
    e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId);
    setSelectedId(s.id); setSelectedVertex(null);
    dragRef.current = { kind: 'move-shape', id: s.id, last: toUnits(e.clientX, e.clientY) };
  };

  const renderBoxOverlay = (s) => {
    const box = toBox(s);
    const corners = boxCorners(box);
    const handles = boxHandles(box);
    const rotPos = rotationHandle(box, rotGap);
    const topMid = handles.n;
    return (
      <g>
        <polygon points={corners.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth={sw} strokeDasharray={`${vr} ${vr}`} pointerEvents="none" />
        <line x1={topMid.x} y1={topMid.y} x2={rotPos.x} y2={rotPos.y} stroke="#2563eb" strokeWidth={sw} pointerEvents="none" />
        <circle cx={rotPos.x} cy={rotPos.y} r={vr} fill="white" stroke="#2563eb" strokeWidth={sw} style={{ cursor: 'grab' }}
          onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); dragRef.current = { kind: 'rotate', id: s.id }; }} />
        {Object.entries(handles).map(([h, pos]) => (
          <rect key={h} x={pos.x - vr} y={pos.y - vr} width={vr * 2} height={vr * 2} fill="white" stroke="#2563eb" strokeWidth={sw}
            style={{ cursor: HANDLE_CURSORS[h] }}
            onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); dragRef.current = { kind: 'resize', id: s.id, handle: h }; }} />
        ))}
      </g>
    );
  };

  const renderPolygonOverlay = (s) => {
    // Dreh-Griff über der Bounding-Box des Polygons
    const xs = s.points.map(p => p.x), ys = s.points.map(p => p.y);
    const topMid = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Math.min(...ys) };
    const rotPos = { x: topMid.x, y: topMid.y - rotGap };
    return (
      <g>
        <line x1={topMid.x} y1={topMid.y} x2={rotPos.x} y2={rotPos.y} stroke="#2563eb" strokeWidth={sw} pointerEvents="none" />
        <circle cx={rotPos.x} cy={rotPos.y} r={vr} fill="white" stroke="#2563eb" strokeWidth={sw} style={{ cursor: 'grab' }}
          onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); dragRef.current = { kind: 'rotate', id: s.id }; }} />
        {s.points.map((p, i) => {
          const b = s.points[(i + 1) % s.points.length];
          const mid = { x: (p.x + b.x) / 2, y: (p.y + b.y) / 2 };
          const isSel = selectedVertex && selectedVertex.shapeId === s.id && selectedVertex.index === i;
          return (
            <g key={i}>
              <circle cx={mid.x} cy={mid.y} r={vr * 0.75} fill="white" stroke="#2563eb" strokeWidth={sw} style={{ cursor: 'copy' }}
                onPointerDown={(e) => { e.stopPropagation(); updateShape(s.id, sh => ({ ...sh, points: insertVertex(sh.points, i) })); setSelectedVertex({ shapeId: s.id, index: i + 1 }); }} />
              <circle cx={p.x} cy={p.y} r={vr} fill={isSel ? '#2563eb' : 'white'} stroke="#2563eb" strokeWidth={sw} style={{ cursor: 'grab' }}
                onPointerDown={(e) => { e.stopPropagation(); e.target.setPointerCapture?.(e.pointerId); setSelectedId(s.id); setSelectedVertex({ shapeId: s.id, index: i }); dragRef.current = { kind: 'move-vertex', id: s.id, index: i }; }} />
            </g>
          );
        })}
      </g>
    );
  };

  const renderShape = (s) => {
    const isSel = s.id === selectedId;
    const c = shapeCenter(s);
    const transform = s.rot ? `rotate(${s.rot} ${c.x} ${c.y})` : undefined;
    const common = {
      fill: '#e5e7eb', stroke: isSel ? '#2563eb' : '#475569', strokeWidth: sw,
      style: { cursor: 'move' }, onPointerDown: (e) => beginMove(e, s),
    };
    if (s.type === 'rect') return <rect x={s.x} y={s.y} width={s.w} height={s.h} transform={transform} strokeLinejoin="round" {...common} />;
    if (s.type === 'ellipse') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={transform} {...common} />;
    return <polygon points={s.points.map(p => `${p.x},${p.y}`).join(' ')} strokeLinejoin="round" {...common} />;
  };

  const gridLines = [];
  if (snapOn) {
    for (let x = gridStep; x < width; x += gridStep) gridLines.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e2e8f0" strokeWidth={sw * 0.5} />);
    for (let y = gridStep; y < height; y += gridStep) gridLines.push(<line key={`hz${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeWidth={sw * 0.5} />);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-gray-900">Grundriss skizzieren</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => addShape(createRect)}>+ Rechteck</Button>
            <Button variant="outline" size="sm" onClick={() => addShape(createEllipse)}>+ Kreis</Button>
            <Button variant="outline" size="sm" onClick={convertToPolygon} disabled={!selected || selected.type !== 'rect'}>In Polygon umwandeln</Button>
            <button
              type="button"
              onClick={() => setSnapOn(v => !v)}
              aria-pressed={snapOn}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${snapOn ? 'border-lime-500 bg-lime-50 text-lime-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              title="Raster-Einrasten (Alt gedrückt = vorübergehend frei)"
            >
              Raster ⊞
            </button>
            <Button variant="outline" size="sm" onClick={saveJson}>Als JSON speichern</Button>
          </div>
        </div>

        <div className="p-6 overflow-auto">
          <p className="text-xs text-gray-500 mb-3">
            Form anklicken zum Auswählen · Körper ziehen = verschieben · eckige Griffe = Grösse (Shift = Seitenverhältnis) · runder Griff oben = drehen · <span className="font-bold">In Polygon umwandeln</span> für freie Ecken · bei Polygonen Eckpunkte ziehen, <span className="font-bold">+</span> fügt Ecke ein · Delete löscht Punkt/Form · Alt umgeht das Raster.
          </p>
          <div className="bg-white border border-gray-200 rounded-lg select-none" style={{ aspectRatio: `${width} / ${height}` }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full"
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onClick={(e) => { if (e.target === e.currentTarget || e.target.dataset?.bg) { setSelectedId(null); setSelectedVertex(null); } }}
            >
              <rect data-bg="1" x="0" y="0" width={width} height={height} fill="#f8fafc" />
              {gridLines}
              {shapes.map(s => <g key={s.id}>{renderShape(s)}</g>)}
              {selected && selected.type !== 'polygon' && renderBoxOverlay(selected)}
              {selected && selected.type === 'polygon' && renderPolygonOverlay(selected)}
            </svg>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <Button variant="danger" size="sm" disabled={!selectedId} onClick={deleteSelected}>Form löschen</Button>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" size="sm" onClick={() => onSave({ version: 2, width, height, shapes })}>Fertig</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
