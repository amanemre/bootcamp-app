import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import TestCases from './pages/TestCases';
import TestSuites from './pages/TestSuites';
import TestSuiteDetail from './pages/TestSuiteDetail';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import TestRuns from './pages/TestRuns';
import TestRunDetail from './pages/TestRunDetail';

function Home() {
  return (
    <div style={{ padding: '24px 32px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Bootcamp App</h1>
      <p style={{ color: '#6b7280' }}>Ready to build.</p>
    </div>
  );
}

function navLinkStyle({ isActive }) {
  return {
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    color: isActive ? '#2563eb' : '#6b7280',
    paddingBottom: 3,
    borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
  };
}

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 32px', height: 52,
        display: 'flex', alignItems: 'center', gap: 28,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginRight: 8 }}>Bootcamp App</span>
        <NavLink to="/" end style={navLinkStyle}>Home</NavLink>
        <NavLink to="/test-cases" style={navLinkStyle}>Test Cases</NavLink>
        <NavLink to="/test-suites" style={navLinkStyle}>Test Suites</NavLink>
        <NavLink to="/bugs" style={navLinkStyle}>Bugs</NavLink>
        <NavLink to="/test-runs" style={navLinkStyle}>Test Runs</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/test-suites" element={<TestSuites />} />
        <Route path="/test-suites/:id" element={<TestSuiteDetail />} />
        <Route path="/bugs"            element={<Bugs />} />
        <Route path="/bugs/:id"        element={<BugDetail />} />
        <Route path="/test-runs"       element={<TestRuns />} />
        <Route path="/test-runs/:id"   element={<TestRunDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
