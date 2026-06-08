export default function AbsentList({ absent, onReturn }) {
  if (absent.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-gray-700">Abwesend ({absent.length}):</span>
      {absent.map(s => (
        <button
          key={s.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('text/absent-id', s.id)}
          onClick={() => onReturn(s.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 hover:border-lime-400 hover:bg-lime-50 transition-colors text-sm cursor-pointer"
          title="Wieder anwesend (klicken) oder auf einen freien Platz ziehen"
        >
          <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
          <span className="font-medium text-gray-800">{s.name}</span>
        </button>
      ))}
    </div>
  );
}
