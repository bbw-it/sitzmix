import React, { useState, createContext } from 'react';
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
