import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useShortcuts } from '../context/ShortcutsContext';
import { IS_MAC } from '../shortcuts/registry';

const PRIMARY_LINKS = [
  { to: '/',            label: 'Dashboard', end: true },
  { to: '/test-cases',  label: 'Test Cases'           },
  { to: '/test-suites', label: 'Suites'               },
  { to: '/test-runs',   label: 'Runs'                 },
  { to: '/bugs',        label: 'Bugs'                 },
  { to: '/reports',     label: 'Reports'              },
];

export default function Nav() {
  const { resolvedTheme } = useSettings();
  const { openSearch } = useShortcuts();
  const location = useLocation();
  const dark = resolvedTheme === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const c = {
    bg:           dark ? '#1e293b'                   : '#ffffff',
    border:       dark ? '#334155'                   : '#e5e7eb',
    brand:        dark ? '#f1f5f9'                   : '#0f172a',
    activeText:   dark ? '#60a5fa'                   : '#2563eb',
    activeBg:     dark ? 'rgba(96,165,250,0.13)'     : 'rgba(37,99,235,0.08)',
    inactive:     dark ? '#94a3b8'                   : '#6b7280',
    searchBg:     dark ? '#0f172a'                   : '#f3f4f6',
    searchBorder: dark ? '#334155'                   : '#e5e7eb',
    searchText:   dark ? '#94a3b8'                   : '#6b7280',
    kbdBorder:    dark ? '#475569'                   : '#d1d5db',
    kbdBg:        dark ? '#1e293b'                   : '#ffffff',
    kbdText:      dark ? '#94a3b8'                   : '#9ca3af',
    icon:         dark ? '#94a3b8'                   : '#6b7280',
  };

  const linkStyle = ({ isActive }) => ({
    color:      isActive ? c.activeText : c.inactive,
    background: isActive ? c.activeBg  : undefined,
    fontWeight: isActive ? 600          : 500,
  });

  const mobileLinkStyle = ({ isActive }) => ({
    color:      isActive ? c.activeText                       : (dark ? '#cbd5e1' : '#374151'),
    background: isActive ? c.activeBg                         : 'transparent',
    fontWeight: isActive ? 600                                : 500,
    display: 'block', padding: '10px 12px', borderRadius: 8,
    fontSize: 15, textDecoration: 'none',
    transition: 'background 0.12s ease, color 0.12s ease',
  });

  return (
    <header ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <nav style={{
        background: c.bg,
        borderBottom: `1px solid ${c.border}`,
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        {/* Brand */}
        <NavLink
          to="/"
          aria-label="Go to dashboard"
          style={{
            textDecoration: 'none', display: 'flex', alignItems: 'center',
            gap: 8, marginRight: 16, flexShrink: 0,
          }}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 7, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
            flexShrink: 0,
          }}>QA</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: c.brand, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
            Bootcamp
          </span>
        </NavLink>

        {/* Desktop primary links */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {PRIMARY_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
              style={linkStyle}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop right: search + settings */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={openSearch}
            aria-label="Open quick search"
            className="nav-search-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
              background: c.searchBg, border: `1px solid ${c.searchBorder}`,
              color: c.searchText,
            }}
          >
            <Search size={13} />
            Search
            <kbd style={{
              fontSize: 11, padding: '1px 5px', borderRadius: 4,
              border: `1px solid ${c.kbdBorder}`,
              background: c.kbdBg, color: c.kbdText,
              fontFamily: 'inherit', lineHeight: '18px',
            }}>{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
          </button>

          <div style={{ width: 1, height: 20, background: c.border, flexShrink: 0 }} />

          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
            style={linkStyle}
          >
            Settings
          </NavLink>
        </div>

        {/* Hamburger — mobile only (shown via CSS) */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          style={{
            display: 'none',
            marginLeft: 'auto',
            alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'transparent', border: `1px solid ${c.border}`,
            cursor: 'pointer', color: c.icon,
          }}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div
          style={{
            background: c.bg,
            borderBottom: `1px solid ${c.border}`,
            padding: '8px 12px 12px',
            boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          {PRIMARY_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-mobile-link${isActive ? ' nav-mobile-link--active' : ''}`}
              style={mobileLinkStyle}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-mobile-link${isActive ? ' nav-mobile-link--active' : ''}`}
            style={mobileLinkStyle}
          >
            Settings
          </NavLink>

          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${c.border}` }}>
            <button
              onClick={() => { openSearch(); setMenuOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: c.searchBg, border: `1px solid ${c.searchBorder}`,
                color: c.searchText, fontSize: 14, fontWeight: 500,
              }}
            >
              <Search size={15} />
              Search
              <kbd style={{
                marginLeft: 'auto', fontSize: 11, padding: '2px 6px', borderRadius: 4,
                border: `1px solid ${c.kbdBorder}`, background: c.kbdBg, color: c.kbdText,
                fontFamily: 'inherit',
              }}>{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
