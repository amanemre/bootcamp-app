import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSettings } from './context/SettingsContext';
import { ShortcutsProvider, useShortcuts } from './context/ShortcutsContext';
import { IS_MAC } from './shortcuts/registry';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import ImportTestCases from './pages/ImportTestCases';
import TestSuites from './pages/TestSuites';
import TestSuiteDetail from './pages/TestSuiteDetail';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import TestRuns from './pages/TestRuns';
import TestRunDetail from './pages/TestRunDetail';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Settings from './pages/Settings';

function makeNavLinkStyle(dark) {
  const active   = dark ? '#60a5fa' : '#2563eb';
  const inactive = dark ? '#94a3b8' : '#6b7280';
  return ({ isActive }) => ({
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    color: isActive ? active : inactive,
    paddingBottom: 3,
    borderBottom: isActive ? `2px solid ${active}` : '2px solid transparent',
  });
}

// Rendered inside ShortcutsProvider so it can open the command palette.
function AppShell() {
  const { resolvedTheme } = useSettings();
  const { openSearch } = useShortcuts();
  const dark = resolvedTheme === 'dark';
  const navLinkStyle = makeNavLinkStyle(dark);

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: dark ? '#1e293b' : '#fff',
        borderBottom: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
        padding: '0 32px', height: 52,
        display: 'flex', alignItems: 'center', gap: 28,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: dark ? '#f8fafc' : '#111827', marginRight: 8 }}>Bootcamp App</span>
        <NavLink to="/" end style={navLinkStyle}>Dashboard</NavLink>
        <NavLink to="/test-cases" style={navLinkStyle}>Test Cases</NavLink>
        <NavLink to="/test-suites" style={navLinkStyle}>Test Suites</NavLink>
        <NavLink to="/bugs" style={navLinkStyle}>Bugs</NavLink>
        <NavLink to="/test-runs" style={navLinkStyle}>Test Runs</NavLink>
        <NavLink to="/reports" style={navLinkStyle}>Reports</NavLink>
        <button
          onClick={openSearch}
          title="Quick search"
          aria-label="Open quick search"
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
            background: dark ? '#0f172a' : '#f3f4f6',
            border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
            color: dark ? '#94a3b8' : '#6b7280',
          }}
        >
          <Search size={14} /> Search
          <kbd style={{
            fontSize: 11, padding: '1px 5px', borderRadius: 4,
            border: `1px solid ${dark ? '#334155' : '#d1d5db'}`,
            background: dark ? '#1e293b' : '#fff', color: dark ? '#cbd5e1' : '#6b7280',
          }}>{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <NavLink to="/settings" style={navLinkStyle}>Settings</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/test-cases/import" element={<ImportTestCases />} />
        <Route path="/test-suites" element={<TestSuites />} />
        <Route path="/test-suites/:id" element={<TestSuiteDetail />} />
        <Route path="/bugs"            element={<Bugs />} />
        <Route path="/bugs/:id"        element={<BugDetail />} />
        <Route path="/test-runs"       element={<TestRuns />} />
        <Route path="/test-runs/:id"   element={<TestRunDetail />} />
        <Route path="/reports"         element={<Reports />} />
        <Route path="/reports/:id"     element={<ReportDetail />} />
        <Route path="/settings"        element={<Settings />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ShortcutsProvider>
        <AppShell />
      </ShortcutsProvider>
    </BrowserRouter>
  );
}
