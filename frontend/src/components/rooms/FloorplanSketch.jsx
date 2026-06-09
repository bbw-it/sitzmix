import { normalizeShapes, shapeCenter } from '../../lib/sketch';

const FILL = '#e5e7eb';
const STROKE = '#475569';

export default function FloorplanSketch({ sketch, className = '' }) {
  if (!sketch) return null;
  const { width, height } = sketch;
  const shapes = normalizeShapes(sketch.shapes);
  const stroke = Math.max(width, height) * 0.004;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block w-full h-full ${className}`}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />
      {shapes.map(s => {
        const c = shapeCenter(s);
        const transform = s.rot ? `rotate(${s.rot} ${c.x} ${c.y})` : undefined;
        if (s.type === 'rect') {
          return <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} transform={transform}
            fill={FILL} stroke={STROKE} strokeWidth={stroke} strokeLinejoin="round" />;
        }
        if (s.type === 'ellipse') {
          return <ellipse key={s.id} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={transform}
            fill={FILL} stroke={STROKE} strokeWidth={stroke} />;
        }
        // polygon
        return <polygon key={s.id} points={s.points.map(p => `${p.x},${p.y}`).join(' ')}
          fill={FILL} stroke={STROKE} strokeWidth={stroke} strokeLinejoin="round" />;
      })}
    </svg>
  );
}
