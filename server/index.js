const express = require('express');
const testCasesRouter = require('./routes/test-cases');
const suitesRouter    = require('./routes/suites');
const bugsRouter      = require('./routes/bugs');
const runsRouter      = require('./routes/runs');
const dashboardRouter = require('./routes/dashboard');
const seed = require('./seed');

const app = express();
const PORT = process.env.PORT || 3001;

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
