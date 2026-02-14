import { useState, useRef, useCallback } from 'react';

const GRID_STEP = 2; // Snap-to-Grid in 2%-Schritten

function snapToGrid(val) {
  return Math.round(val / GRID_STEP) * GRID_STEP;
}

export default function SeatPlacer({ imageUrl, seats, onSeatsChange }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { index, startX, startY }
  const [hasDragged, setHasDragged] = useState(false);

  const getPercentPosition = useCallback((clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: snapToGrid(Math.max(0, Math.min(100, x))),
      y: snapToGrid(Math.max(0, Math.min(100, y))),
    };
  }, []);

  const handleContainerClick = (e) => {
    if (hasDragged) return;
    // Only add if clicking on container background, not on a seat
    if (e.target !== containerRef.current && !e.target.classList.contains('floorplan-img')) return;

    const { x, y } = getPercentPosition(e.clientX, e.clientY);
    const newSeat = {
      seat_number: seats.length + 1,
      x_position: x,
      y_position: y,
    };
    onSeatsChange([...seats, newSeat]);
  };

  const handleSeatPointerDown = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setDragging({ index, pointerId: e.pointerId });
    setHasDragged(false);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    setHasDragged(true);
    const { x, y } = getPercentPosition(e.clientX, e.clientY);
    const updated = [...seats];
    updated[dragging.index] = {
      ...updated[dragging.index],
      x_position: x,
      y_position: y,
    };
    onSeatsChange(updated);
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;
    if (!hasDragged) {
      // It was a click on an existing seat -> remove it
      const updated = seats.filter((_, i) => i !== dragging.index);
      // Renumber
      const renumbered = updated.map((s, i) => ({ ...s, seat_number: i + 1 }));
      onSeatsChange(renumbered);
    }
    setDragging(null);
    // Reset hasDragged after a tiny delay so the container click doesn't fire
    setTimeout(() => setHasDragged(false), 50);
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-100 rounded-lg overflow-hidden cursor-crosshair select-none"
      onClick={handleContainerClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img
        src={imageUrl}
        alt="Grundriss"
        className="floorplan-img w-full block pointer-events-none"
        draggable={false}
      />

      {/* Grid-Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)',
          backgroundSize: `${GRID_STEP}% ${GRID_STEP}%`,
        }}
      />

      {seats.map((seat, index) => (
        <div
          key={index}
          className="absolute flex items-center justify-center w-8 h-8 -ml-4 -mt-4 rounded-full bg-lime-500 text-white text-xs font-bold cursor-grab shadow-md hover:bg-lime-600 transition-colors touch-none"
          style={{
            left: `${seat.x_position}%`,
            top: `${seat.y_position}%`,
          }}
          onPointerDown={(e) => handleSeatPointerDown(e, index)}
        >
          {seat.seat_number}
        </div>
      ))}
    </div>
  );
}
