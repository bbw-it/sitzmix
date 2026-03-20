import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function ExportModal({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState(new Set());
  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set());
  const [classesExpanded, setClassesExpanded] = useState(true);
  const [roomsExpanded, setRoomsExpanded] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/rooms')])
      .then(([c, r]) => {
        setClasses(c.data);
        setRooms(r.data);
      });
  }, []);

  const toggleClass = (id) => {
    setSelectedClassIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleRoom = (id) => {
    setSelectedRoomIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllClasses = () => {
    if (selectedClassIds.size === classes.length) {
      setSelectedClassIds(new Set());
    } else {
      setSelectedClassIds(new Set(classes.map(c => c.id)));
    }
  };

  const toggleAllRooms = () => {
    if (selectedRoomIds.size === rooms.length) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(rooms.map(r => r.id)));
    }
  };

  const hasSelection = selectedClassIds.size > 0 || selectedRoomIds.size > 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (selectedClassIds.size > 0) params.classIds = [...selectedClassIds].join(',');
      if (selectedRoomIds.size > 0) params.roomIds = [...selectedRoomIds].join(',');

      const res = await api.get('/export', { params });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sitzmix-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const Chevron = ({ expanded }) => (
    <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Daten exportieren</h2>
          <p className="text-sm text-gray-500 mt-1">Wähle aus, was exportiert werden soll.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Klassen */}
          <div>
            <button
              className="flex items-center gap-2 w-full text-left font-semibold text-gray-700 hover:text-gray-900"
              onClick={() => setClassesExpanded(!classesExpanded)}
            >
              <Chevron expanded={classesExpanded} />
              Klassen
              {classes.length > 0 && (
                <span className="text-xs text-gray-400 font-normal">({selectedClassIds.size}/{classes.length})</span>
              )}
            </button>

            {classesExpanded && (
              <div className="mt-2 ml-6 space-y-1">
                {classes.length === 0 ? (
                  <p className="text-sm text-gray-400">Keine Klassen vorhanden</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        className="accent-lime-600"
                        checked={selectedClassIds.size === classes.length}
                        onChange={toggleAllClasses}
                      />
                      <span className="font-medium">Alle auswählen</span>
                    </label>
                    <div className="border-t border-gray-100 my-1" />
                    {classes.map(cls => (
                      <label key={cls.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          className="accent-lime-600"
                          checked={selectedClassIds.has(cls.id)}
                          onChange={() => toggleClass(cls.id)}
                        />
                        {cls.name}
                        <span className="text-gray-400 text-xs">({cls.studentCount ?? '?'} Lernende)</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Zimmer */}
          <div>
            <button
              className="flex items-center gap-2 w-full text-left font-semibold text-gray-700 hover:text-gray-900"
              onClick={() => setRoomsExpanded(!roomsExpanded)}
            >
              <Chevron expanded={roomsExpanded} />
              Zimmer
              {rooms.length > 0 && (
                <span className="text-xs text-gray-400 font-normal">({selectedRoomIds.size}/{rooms.length})</span>
              )}
            </button>

            {roomsExpanded && (
              <div className="mt-2 ml-6 space-y-1">
                {rooms.length === 0 ? (
                  <p className="text-sm text-gray-400">Keine Zimmer vorhanden</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        className="accent-lime-600"
                        checked={selectedRoomIds.size === rooms.length}
                        onChange={toggleAllRooms}
                      />
                      <span className="font-medium">Alle auswählen</span>
                    </label>
                    <div className="border-t border-gray-100 my-1" />
                    {rooms.map(room => (
                      <label key={room.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          className="accent-lime-600"
                          checked={selectedRoomIds.has(room.id)}
                          onChange={() => toggleRoom(room.id)}
                        />
                        {room.name}
                        <span className="text-gray-400 text-xs">({room.seatCount ?? '?'} Plätze)</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-lime-600 hover:bg-lime-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasSelection || exporting}
            onClick={handleExport}
          >
            {exporting ? 'Exportiere...' : 'Exportieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
