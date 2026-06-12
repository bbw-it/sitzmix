import { NavLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import ExportModal from '../settings/ExportModal';
import ImportModal from '../settings/ImportModal';
import ThemeModal from '../settings/ThemeModal';
import PrivacyBanner from './PrivacyBanner';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const gearRef = useRef(null);

  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'text-lime-600 border-b-2 border-lime-500'
        : 'text-gray-600 hover:text-gray-900'
    }`;

  // Close gear dropdown on outside click
  useEffect(() => {
    if (!gearOpen) return;
    const handleClick = (e) => {
      if (gearRef.current && !gearRef.current.contains(e.target)) {
        setGearOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [gearOpen]);

  const openExport = () => { setGearOpen(false); setMenuOpen(false); setShowExport(true); };
  const openImport = () => { setGearOpen(false); setMenuOpen(false); setShowImport(true); };
  const openTheme = () => { setGearOpen(false); setMenuOpen(false); setShowTheme(true); };

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

              {/* Gear icon */}
              <div ref={gearRef} className="relative ml-3">
                <button
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  onClick={() => setGearOpen(!gearOpen)}
                  title="Einstellungen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {gearOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      onClick={openTheme}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Erscheinungsbild
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      onClick={openExport}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Daten exportieren
                    </button>
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      onClick={openImport}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Daten importieren
                    </button>
                  </div>
                )}
              </div>
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
              <div className="border-t border-gray-100 my-2" />
              <button
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 text-left"
                onClick={openTheme}
              >
                Erscheinungsbild
              </button>
              <button
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 text-left"
                onClick={openExport}
              >
                Daten exportieren
              </button>
              <button
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 text-left"
                onClick={openImport}
              >
                Daten importieren
              </button>
            </div>
          )}
        </div>
      </nav>

      <PrivacyBanner />

      {showTheme && <ThemeModal onClose={() => setShowTheme(false)} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  );
}
