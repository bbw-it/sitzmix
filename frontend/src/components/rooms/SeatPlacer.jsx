import { useState, useRef, useCallback, useEffect } from 'react';
import FloorplanSketch from './FloorplanSketch';

const GRID_STEP = 2;
const MIN_AREA_SIZE = 6;
const TRASH_SIZE = 56; // px
const TRASH_MARGIN = 16; // px from corner

function snapToGrid(val) {
  return Math.round(val / GRID_STEP) * GRID_STEP;
}

export default function SeatPlacer({
  imageUrl,
  sketch = null,
  seats,
  onSeatsChange,
  mode = 'seats',
  areas = [],
  onAreasChange,
  activeAreaId = null,
  onAreaSelect,
  onAddArea,
  onRemoveArea,
}) {
  const containerRef = useRef(null);

  // Seat drag
  const [dragging, setDragging] = useState(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState(null);

  // Area interaction
  const [areaInteraction, setAreaInteraction] = useState(null);
  const [areaDragged, setAreaDragged] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // { pixelX, pixelY, x, y, seatIndex? }

  // Trash zone hover
  const [overTrash, setOverTrash] = useState(false);

  // Is anything being dragged?
  const isDragging = !!(dragging && hasDragged) || !!(areaInteraction && areaDragged);

  // ── Position helpers ──

  const getPercentPosition = useCallback((clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const getSnappedPosition = useCallback((clientX, clientY) => {
    const pos = getPercentPosition(clientX, clientY);
    return { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
  }, [getPercentPosition]);

  const isInTrashZone = useCallback((clientX, clientY) => {
    if (!containerRef.current) return false;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return (
      localX >= rect.width - TRASH_SIZE - TRASH_MARGIN &&
      localY >= rect.height - TRASH_SIZE - TRASH_MARGIN
    );
  }, []);

  // ── Keyboard: Delete/Backspace ──

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't intercept if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (selectedSeatIndex !== null) {
          e.preventDefault();
          const updated = seats.filter((_, i) => i !== selectedSeatIndex)
            .map((s, i) => ({ ...s, seat_number: i + 1 }));
          onSeatsChange(updated);
          setSelectedSeatIndex(null);
        } else if (activeAreaId) {
          e.preventDefault();
          onRemoveArea?.(activeAreaId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedSeatIndex(null);
        setContextMenu(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedSeatIndex, activeAreaId, seats, onSeatsChange, onRemoveArea]);

  // ── Dismiss context menu ──

  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [contextMenu]);

  // ── Left-click on empty space ──

  const handleContainerClick = (e) => {
    if (contextMenu) return;
    if (hasDragged) return;
    if (e.target !== containerRef.current && !e.target.classList.contains('floorplan-img')) return;

    // Deselect seat
    setSelectedSeatIndex(null);

    // In seats mode: add seat on click
    if (mode === 'seats') {
      const { x, y } = getSnappedPosition(e.clientX, e.clientY);
      onSeatsChange([...seats, { seat_number: seats.length + 1, x_position: x, y_position: y, area_id: null }]);
    }
  };

  // ── Right-click: context menu ──

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const pos = getSnappedPosition(e.clientX, e.clientY);
    setContextMenu({
      pixelX: e.clientX - rect.left,
      pixelY: e.clientY - rect.top,
      x: pos.x,
      y: pos.y,
      seatIndex: null,
    });
  };

  const handleSeatContextMenu = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const pos = getSnappedPosition(e.clientX, e.clientY);
    setSelectedSeatIndex(index);
    setContextMenu({
      pixelX: e.clientX - rect.left,
      pixelY: e.clientY - rect.top,
      x: pos.x,
      y: pos.y,
      seatIndex: index,
    });
  };

  const handleAddSeatFromMenu = (e) => {
    e.stopPropagation();
    if (!contextMenu) return;
    onSeatsChange([...seats, {
      seat_number: seats.length + 1,
      x_position: contextMenu.x,
      y_position: contextMenu.y,
      area_id: null,
    }]);
    setContextMenu(null);
  };

  const handleAddAreaFromMenu = (e) => {
    e.stopPropagation();
    if (!contextMenu) return;
    onAddArea?.(contextMenu.x, contextMenu.y);
    setContextMenu(null);
  };

  const handleRemoveAreaFromMenu = (e) => {
    e.stopPropagation();
    if (!activeAreaId) return;
    onRemoveArea?.(activeAreaId);
    setContextMenu(null);
  };

  const handleRemoveSeatFromMenu = (e) => {
    e.stopPropagation();
    if (contextMenu?.seatIndex == null) return;
    const updated = seats.filter((_, i) => i !== contextMenu.seatIndex)
      .map((s, i) => ({ ...s, seat_number: i + 1 }));
    onSeatsChange(updated);
    setSelectedSeatIndex(null);
    setContextMenu(null);
  };

  // ── Seat pointer down: select + start drag ──

  const handleSeatPointerDown = (e, index) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setContextMenu(null);
    setSelectedSeatIndex(index);
    e.target.setPointerCapture(e.pointerId);
    setDragging({ index, pointerId: e.pointerId });
    setHasDragged(false);
  };

  // ── Area pointer down: select + start move/resize ──

  const handleAreaPointerDown = (e, areaId, handle) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setContextMenu(null);
    setSelectedSeatIndex(null);

    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    if (areaId !== activeAreaId) onAreaSelect?.(areaId);

    const pos = getPercentPosition(e.clientX, e.clientY);
    setAreaInteraction({
      type: handle ? 'resize' : 'move',
      areaId,
      handle,
      startMouse: pos,
      startBounds: { x: area.x_pos, y: area.y_pos, w: area.width_pct, h: area.height_pct },
    });
    setAreaDragged(false);
  };

  // ── Unified pointer move ──

  const handlePointerMove = (e) => {
    // Area move/resize
    if (areaInteraction) {
      setAreaDragged(true);
      const pos = getPercentPosition(e.clientX, e.clientY);
      const dx = pos.x - areaInteraction.startMouse.x;
      const dy = pos.y - areaInteraction.startMouse.y;
      const b = areaInteraction.startBounds;

      // Check trash zone
      setOverTrash(isInTrashZone(e.clientX, e.clientY));

      let newBounds;
      if (areaInteraction.type === 'move') {
        newBounds = {
          x: snapToGrid(Math.max(0, Math.min(100 - b.w, b.x + dx))),
          y: snapToGrid(Math.max(0, Math.min(100 - b.h, b.y + dy))),
          w: b.w,
          h: b.h,
        };
      } else {
        const h = areaInteraction.handle;
        let nx = b.x, ny = b.y, nw = b.w, nh = b.h;

        if (h.includes('w')) { nx = b.x + dx; nw = b.w - dx; }
        if (h.includes('e')) { nw = b.w + dx; }
        if (h.includes('n')) { ny = b.y + dy; nh = b.h - dy; }
        if (h.includes('s')) { nh = b.h + dy; }

        if (nw < MIN_AREA_SIZE) { if (h.includes('w')) nx = b.x + b.w - MIN_AREA_SIZE; nw = MIN_AREA_SIZE; }
        if (nh < MIN_AREA_SIZE) { if (h.includes('n')) ny = b.y + b.h - MIN_AREA_SIZE; nh = MIN_AREA_SIZE; }

        newBounds = {
          x: snapToGrid(Math.max(0, nx)),
          y: snapToGrid(Math.max(0, ny)),
          w: snapToGrid(Math.min(100 - Math.max(0, nx), nw)),
          h: snapToGrid(Math.min(100 - Math.max(0, ny), nh)),
        };
      }

      onAreasChange?.(areas.map(a =>
        a.id === areaInteraction.areaId
          ? { ...a, x_pos: newBounds.x, y_pos: newBounds.y, width_pct: newBounds.w, height_pct: newBounds.h }
          : a
      ));
      return;
    }

    // Seat drag
    if (!dragging) return;
    setHasDragged(true);

    // Check trash zone
    setOverTrash(isInTrashZone(e.clientX, e.clientY));

    const { x, y } = getSnappedPosition(e.clientX, e.clientY);
    const updated = [...seats];
    updated[dragging.index] = { ...updated[dragging.index], x_position: x, y_position: y };
    onSeatsChange(updated);
  };

  // ── Unified pointer up ──

  const handlePointerUp = (e) => {
    // Area drag end
    if (areaInteraction) {
      if (areaDragged && overTrash && areaInteraction.type === 'move') {
        // Dropped on trash → delete area
        onRemoveArea?.(areaInteraction.areaId);
      }
      setAreaInteraction(null);
      setAreaDragged(false);
      setOverTrash(false);
      return;
    }

    if (!dragging) return;

    if (hasDragged && overTrash) {
      // Dropped on trash → delete seat
      const updated = seats.filter((_, i) => i !== dragging.index)
        .map((s, i) => ({ ...s, seat_number: i + 1 }));
      onSeatsChange(updated);
      setSelectedSeatIndex(null);
    }
    // Click without drag → just select (already done in pointerDown)

    setDragging(null);
    setOverTrash(false);
    setTimeout(() => setHasDragged(false), 50);
  };

  // ── Resize handle helpers ──

  const resizeHandles = ['nw', 'ne', 'sw', 'se'];
  const handlePos = (area, h) => ({
    x: h.includes('w') ? area.x_pos : area.x_pos + area.width_pct,
    y: h.includes('n') ? area.y_pos : area.y_pos + area.height_pct,
  });
  const handleCursor = (h) => (h === 'nw' || h === 'se') ? 'nwse-resize' : 'nesw-resize';

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-100 rounded-lg overflow-hidden select-none cursor-crosshair"
      onClick={handleContainerClick}
      onContextMenu={handleContextMenu}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {sketch ? (
        <div
          className="floorplan-img w-full block pointer-events-none"
          style={{ aspectRatio: `${sketch.width} / ${sketch.height}` }}
        >
          <FloorplanSketch sketch={sketch} />
        </div>
      ) : (
        <img
          src={imageUrl}
          alt="Grundriss"
          className="floorplan-img w-full block pointer-events-none"
          draggable={false}
        />
      )}

      {/* Raster-Overlay (nur in Sitzplatz-Modus) */}
      {mode === 'seats' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)',
            backgroundSize: `${GRID_STEP}% ${GRID_STEP}%`,
          }}
        />
      )}

      {/* Bereiche – immer sichtbar und interaktiv */}
      {areas.map(area => {
        const isActive = area.id === activeAreaId;
        return (
          <div key={`area-${area.id}`}>
            <div
              className="absolute rounded-lg cursor-move"
              style={{
                left: `${area.x_pos}%`,
                top: `${area.y_pos}%`,
                width: `${area.width_pct}%`,
                height: `${area.height_pct}%`,
                border: `2px ${isActive ? 'solid' : 'dashed'} ${area.color}`,
                backgroundColor: `${area.color}${isActive ? '20' : '10'}`,
                zIndex: isActive ? 5 : 1,
              }}
              onPointerDown={(e) => handleAreaPointerDown(e, area.id, null)}
            >
              <span
                className="absolute -top-5 left-1 text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{ color: area.color, backgroundColor: `${area.color}25` }}
              >
                {area.name}
              </span>
            </div>

            {isActive && resizeHandles.map(h => {
              const p = handlePos(area, h);
              return (
                <div
                  key={`handle-${area.id}-${h}`}
                  className="absolute w-3 h-3 bg-white border-2 rounded-sm z-10"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: 'translate(-50%, -50%)',
                    borderColor: area.color,
                    cursor: handleCursor(h),
                  }}
                  onPointerDown={(e) => handleAreaPointerDown(e, area.id, h)}
                />
              );
            })}
          </div>
        );
      })}

      {/* Sitzplätze – immer interaktiv */}
      {seats.map((seat, index) => {
        const area = areas.find(a => a.id === seat.area_id);
        const isSelected = index === selectedSeatIndex;

        return (
          <div
            key={index}
            className={`absolute flex items-center justify-center w-8 h-8 -ml-4 -mt-4 rounded-full text-white text-xs font-bold shadow-md transition-all touch-none cursor-grab hover:scale-110 ${
              isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''
            }`}
            style={{
              left: `${seat.x_position}%`,
              top: `${seat.y_position}%`,
              backgroundColor: area ? area.color : '#84cc16',
              border: isSelected ? '3px solid white' : area ? `3px solid ${area.color}` : '3px solid #84cc16',
              zIndex: isSelected ? 9 : 8,
            }}
            onPointerDown={(e) => handleSeatPointerDown(e, index)}
            onContextMenu={(e) => handleSeatContextMenu(e, index)}
          >
            {seat.seat_number}
          </div>
        );
      })}

      {/* Papierkorb (erscheint beim Drag) */}
      {isDragging && (
        <div
          className={`absolute flex items-center justify-center rounded-xl transition-all duration-150 ${
            overTrash
              ? 'bg-red-500 text-white scale-110 shadow-lg'
              : 'bg-gray-800/60 text-gray-200 shadow-md'
          }`}
          style={{
            right: TRASH_MARGIN,
            bottom: TRASH_MARGIN,
            width: TRASH_SIZE,
            height: TRASH_SIZE,
            zIndex: 30,
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      )}

      {/* Kontextmenü */}
      {contextMenu && (
        <>
          <div
            className="absolute inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />

          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-50 min-w-[200px]"
            style={{
              left: Math.min(contextMenu.pixelX, containerRef.current.offsetWidth - 210),
              top: Math.min(contextMenu.pixelY, containerRef.current.offsetHeight - 120),
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Sitzplatz löschen (wenn auf Sitz geklickt) */}
            {contextMenu.seatIndex != null && (
              <>
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  onClick={handleRemoveSeatFromMenu}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Platz {seats[contextMenu.seatIndex]?.seat_number} löschen
                </button>
                <div className="border-t border-gray-100 my-1" />
              </>
            )}

            <button
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-lime-50 hover:text-lime-800 transition-colors text-left"
              onClick={handleAddSeatFromMenu}
            >
              <svg className="w-4 h-4 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 8v8m-4-4h8" />
              </svg>
              Sitzplatz hinzufügen
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors text-left"
              onClick={handleAddAreaFromMenu}
            >
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" strokeDasharray="4 2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 8v8m-4-4h8" />
              </svg>
              Bereich hinzufügen
            </button>

            {activeAreaId && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  onClick={handleRemoveAreaFromMenu}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {areas.find(a => a.id === activeAreaId)?.name || 'Bereich'} löschen
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
