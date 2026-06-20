const path    = require('path');
const express = require('express');
const testCasesRouter = require('./routes/test-cases');
const suitesRouter    = require('./routes/suites');
const bugsRouter      = require('./routes/bugs');
const runsRouter      = require('./routes/runs');
const dashboardRouter = require('./routes/dashboard');
const reportsRouter   = require('./routes/reports');
const settingsRouter  = require('./routes/settings');
const searchRouter    = require('./routes/search');
const { router: flakyRouter } = require('./routes/flaky-tests');
const seed = require('./seed');

const app = express();
const PORT = process.env.PORT || 3001;

// CSV import accepts a larger JSON body (raw CSV text); scope the bigger limit
// to those routes only and keep the conservative 100kb default everywhere else.
app.use('/api/test-cases/import', express.json({ limit: '2mb' }));
app.use(express.json());

seed();

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

app.use('/api/test-cases', testCasesRouter);
app.use('/api/suites',     suitesRouter);
app.use('/api/bugs',       bugsRouter);
app.use('/api/runs',       runsRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/reports',    reportsRouter);
app.use('/api/settings',   settingsRouter);
app.use('/api/search',      searchRouter);
app.use('/api/flaky-tests', flakyRouter);

// Serve the built React app
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Return 404 JSON for unmatched API routes instead of falling through to index.html
app.all('/api/*', (_req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Not found' });
});

// Catch-all — let React Router handle client-side navigation
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
