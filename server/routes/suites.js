const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_STATUSES = ['Draft', 'Ready', 'In Progress', 'Passed', 'Failed'];

const CASES_QUERY = `
  SELECT stc.sort_order, tc.*
  FROM suite_test_cases stc
  JOIN test_cases tc ON tc.id = stc.test_case_id
  WHERE stc.suite_id = ?
  ORDER BY stc.sort_order ASC
`;

function parseCases(rows) {
  return rows.map(r => ({ ...r, steps: JSON.parse(r.steps) }));
}

function handleListSuites(req, res) {
  try {
    const { status } = req.query;
    const conds  = [];
    const params = [];
    if (status) { conds.push('s.status = ?'); params.push(status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const items = db.prepare(`
      SELECT s.*, COUNT(stc.id) as case_count
      FROM suites s
      LEFT JOIN suite_test_cases stc ON stc.suite_id = s.id
      ${where}
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `).all(...params);

    res.json({ success: true, data: { items, total: items.length }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetSuite(req, res) {
  try {
    const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
    if (!suite) return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
    const cases = parseCases(db.prepare(CASES_QUERY).all(req.params.id));
    res.json({ success: true, data: { ...suite, cases }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateSuite(req, res) {
  try {
    const { name, feature, status = 'Draft' } = req.body;
    if (!name?.trim())    return res.status(400).json({ success: false, data: null, error: 'name is required.' });
    if (!feature?.trim()) return res.status(400).json({ success: false, data: null, error: 'feature is required.' });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });

    const result = db.prepare('INSERT INTO suites (name, feature, status) VALUES (?, ?, ?)').run(name.trim(), feature.trim(), status);
    const suite  = db.prepare('SELECT * FROM suites WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: { ...suite, cases: [], case_count: 0 }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateSuite(req, res) {
  try {
    const exists = db.prepare('SELECT id FROM suites WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });

    const { name, feature, status } = req.body;
    if (!name?.trim())    return res.status(400).json({ success: false, data: null, error: 'name is required.' });
    if (!feature?.trim()) return res.status(400).json({ success: false, data: null, error: 'feature is required.' });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });

    db.prepare(`UPDATE suites SET name=?, feature=?, status=?, updated_at=datetime('now') WHERE id=?`).run(name.trim(), feature.trim(), status, req.params.id);
    const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: suite, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleDeleteSuite(req, res) {
  try {
    const exists = db.prepare('SELECT id FROM suites WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });
    db.prepare('DELETE FROM suites WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: Number(req.params.id) }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateSuiteCases(req, res) {
  try {
    const exists = db.prepare('SELECT id FROM suites WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });

    const { cases } = req.body;
    if (!Array.isArray(cases)) return res.status(400).json({ success: false, data: null, error: 'cases must be an array.' });

    const invalidIds = cases
      .map(c => c.test_case_id)
      .filter(id => !db.prepare('SELECT id FROM test_cases WHERE id = ?').get(id));
    if (invalidIds.length) {
      return res.status(400).json({ success: false, data: null, error: `Invalid test_case_id values: ${invalidIds.join(', ')}.` });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM suite_test_cases WHERE suite_id = ?').run(req.params.id);
      const insert = db.prepare('INSERT INTO suite_test_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)');
      cases.forEach(({ test_case_id, sort_order }) => insert.run(req.params.id, test_case_id, sort_order));
      db.prepare(`UPDATE suites SET updated_at=datetime('now') WHERE id=?`).run(req.params.id);
    })();

    const updated = parseCases(db.prepare(CASES_QUERY).all(req.params.id));
    res.json({ success: true, data: updated, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',          handleListSuites);
router.get('/:id',       handleGetSuite);
router.post('/',         handleCreateSuite);
router.put('/:id',       handleUpdateSuite);
router.delete('/:id',    handleDeleteSuite);
router.put('/:id/cases', handleUpdateSuiteCases);

module.exports = router;
