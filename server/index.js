const express = require('express');
const testCasesRouter = require('./routes/test-cases');
const suitesRouter    = require('./routes/suites');
const bugsRouter      = require('./routes/bugs');
const runsRouter      = require('./routes/runs');
const dashboardRouter = require('./routes/dashboard');
const reportsRouter   = require('./routes/reports');
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
