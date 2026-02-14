import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import SettingsModal from '../settings/SettingsModal';

export default function Navbar() {
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'text-lime-600 border-b-2 border-lime-500'
        : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">
                <span className="text-lime-600">Sitz</span>
                <span className="text-gray-900">Mix</span>
              </span>
            </NavLink>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1">
              <NavLink to="/generator" className={linkClass}>Generator</NavLink>
              <NavLink to="/classes" className={linkClass}>Klassen verwalten</NavLink>
              <NavLink to="/rooms" className={linkClass}>Zimmer verwalten</NavLink>
              <button
                onClick={() => setShowSettings(true)}
                className="ml-4 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Einstellungen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile nav */}
          {menuOpen && (
            <div className="sm:hidden pb-4 flex flex-col gap-1">
              <NavLink to="/generator" className={linkClass} onClick={() => setMenuOpen(false)}>Generator</NavLink>
              <NavLink to="/classes" className={linkClass} onClick={() => setMenuOpen(false)}>Klassen verwalten</NavLink>
              <NavLink to="/rooms" className={linkClass} onClick={() => setMenuOpen(false)}>Zimmer verwalten</NavLink>
              <button
                onClick={() => { setShowSettings(true); setMenuOpen(false); }}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 text-left"
              >
                Einstellungen
              </button>
            </div>
          )}
        </div>
      </nav>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
