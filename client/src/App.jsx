import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShortcutsProvider } from './context/ShortcutsContext';
import Nav from './components/Nav';
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

// Rendered inside ShortcutsProvider so Nav can open the command palette.
function AppShell() {
  return (
    <>
      <Nav />
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
