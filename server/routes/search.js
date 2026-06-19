const express = require('express');
const db      = require('../db');

const router = express.Router();

// Global quick-search across the four core entities. Returns small,
// grouped result sets suitable for a command palette.
function handleSearch(req, res) {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      return res.json({ success: true, data: { testCases: [], bugs: [], suites: [], runs: [] }, error: null });
    }
    const like  = `%${q.toLowerCase()}%`;
    const LIMIT = 6;

    const testCases = db.prepare(`
      SELECT id, title, severity, status FROM test_cases
      WHERE LOWER(title) LIKE ? ORDER BY updated_at DESC LIMIT ?
    `).all(like, LIMIT).map(r => ({ id: r.id, title: r.title, subtitle: `${r.severity} · ${r.status}` }));

    const bugs = db.prepare(`
      SELECT id, title, severity, status FROM bugs
      WHERE LOWER(title) LIKE ? ORDER BY updated_at DESC LIMIT ?
    `).all(like, LIMIT).map(r => ({ id: r.id, title: r.title, subtitle: `${r.severity} · ${r.status}` }));

    const suites = db.prepare(`
      SELECT id, name, feature, status FROM suites
      WHERE LOWER(name) LIKE ? OR LOWER(feature) LIKE ? ORDER BY updated_at DESC LIMIT ?
    `).all(like, like, LIMIT).map(r => ({ id: r.id, title: r.name, subtitle: `${r.feature} · ${r.status}` }));

    // Runs have no title of their own — match on the suite name.
    const runs = db.prepare(`
      SELECT r.id, r.status, s.name AS suite_name
      FROM test_runs_v2 r LEFT JOIN suites s ON s.id = r.suite_id
      WHERE LOWER(s.name) LIKE ? ORDER BY r.created_at DESC LIMIT ?
    `).all(like, LIMIT).map(r => ({ id: r.id, title: r.suite_name || `Run #${r.id}`, subtitle: `Run #${r.id} · ${r.status}` }));

    res.json({ success: true, data: { testCases, bugs, suites, runs }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/', handleSearch);

module.exports = router;
