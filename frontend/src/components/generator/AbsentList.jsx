export default function AbsentList({ absent, onReturn }) {
  if (absent.length === 0) return null;
  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-bold text-gray-900 mb-1">Abwesend ({absent.length})</h3>
      <p className="text-xs text-gray-500 mb-3">
        Klick holt die Person auf den nächsten freien Platz — oder ziehe sie per Drag auf einen freien Platz.
      </p>
      <div className="flex flex-wrap gap-2">
        {absent.map(s => (
          <button
            key={s.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/absent-id', s.id)}
            onClick={() => onReturn(s.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-lime-400 hover:bg-lime-50 transition-colors text-sm cursor-pointer"
            title="Wieder anwesend (klicken) oder auf freien Platz ziehen"
          >
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-medium text-gray-800">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
