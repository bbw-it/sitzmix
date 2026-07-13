import React, { useState, useRef, useEffect, useCallback, createContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import GeneratorPage from './components/generator/GeneratorPage';
import ClassListPage from './components/classes/ClassListPage';
import ClassEditPage from './components/classes/ClassEditPage';
import RoomListPage from './components/rooms/RoomListPage';
import RoomEditPage from './components/rooms/RoomEditPage';
import Toast from './components/common/Toast';

export const ToastContext = createContext(null);

export default function App() {
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Der Timer wird pro Toast zurückgesetzt. Ohne das würde eine zweite Meldung
  // den Timer der ersten erben und schon nach deren Restzeit verschwinden.
  // `useCallback`, damit der Context-Wert stabil bleibt und Konsumenten nicht
  // bei jedem App-Render neu rendern.
  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  return (
    <ToastContext.Provider value={showToast}>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/generator" replace />} />
            <Route path="/generator" element={<GeneratorPage />} />
            <Route path="/classes" element={<ClassListPage />} />
            <Route path="/classes/new" element={<ClassEditPage />} />
            <Route path="/classes/:id" element={<ClassEditPage />} />
            <Route path="/rooms" element={<RoomListPage />} />
            <Route path="/rooms/new" element={<RoomEditPage />} />
            <Route path="/rooms/:id" element={<RoomEditPage />} />
          </Routes>
        </main>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </ToastContext.Provider>
  );
}
