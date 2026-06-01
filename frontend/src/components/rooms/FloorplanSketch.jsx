export default function FloorplanSketch({ sketch, className = '' }) {
  if (!sketch) return null;
  const { width, height, shapes } = sketch;
  const stroke = Math.max(width, height) * 0.004;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block w-full h-full ${className}`}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />
      {shapes.map(s => {
        if (s.type === 'polygon') {
          return <polygon key={s.id} points={s.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="#e5e7eb" stroke="#475569" strokeWidth={stroke} strokeLinejoin="round" />;
        }
        if (s.type === 'circle') {
          return <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r}
            fill="#e5e7eb" stroke="#475569" strokeWidth={stroke} />;
        }
        return null;
      })}
    </svg>
  );
}
