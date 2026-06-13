const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_STATUSES   = ['Draft', 'Ready', 'Passed', 'Failed', 'Skipped'];

const SEVERITY_ORDER = `CASE severity
  WHEN 'Critical' THEN 1
  WHEN 'Major'    THEN 2
  WHEN 'Minor'    THEN 3
  WHEN 'Trivial'  THEN 4
END`;

function parseRow(r) {
  if (!r) return null;
  return { ...r, steps: JSON.parse(r.steps) };
}

function handleListTestCases(req, res) {
  try {
    const { page = 1, status, search, sort = 'updated_at', order = 'desc' } = req.query;
    const limit = 20;
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const conds = [];
    const params = [];
    if (status) { conds.push('status = ?'); params.push(status); }
    if (search) { conds.push('LOWER(title) LIKE ?'); params.push(`%${search.toLowerCase()}%`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const sortExpr = sort === 'severity' ? SEVERITY_ORDER : 'updated_at';
    const dir = order === 'asc' ? 'ASC' : 'DESC';

    const { count } = db.prepare(`SELECT COUNT(*) as count FROM test_cases ${where}`).get(...params);
    const items = db
      .prepare(`SELECT * FROM test_cases ${where} ORDER BY ${sortExpr} ${dir} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    res.json({ success: true, data: { items: items.map(parseRow), total: count, page: Number(page), limit }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetTestCase(req, res) {
  try {
    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
    res.json({ success: true, data: parseRow(row), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateTestCase(req, res) {
  try {
    const { title, preconditions = '', steps, expected_result, severity, status = 'Draft' } = req.body;

    if (!title?.trim())                          return res.status(400).json({ success: false, data: null, error: 'title is required.' });
    if (!Array.isArray(steps) || !steps.length)  return res.status(400).json({ success: false, data: null, error: 'steps must be a non-empty array.' });
    if (!expected_result?.trim())                return res.status(400).json({ success: false, data: null, error: 'expected_result is required.' });
    if (!VALID_SEVERITIES.includes(severity))    return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
    if (!VALID_STATUSES.includes(status))        return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });

    const result = db.prepare(`
      INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title.trim(), preconditions.trim(), JSON.stringify(steps), expected_result.trim(), severity, status);

    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: parseRow(row), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateTestCase(req, res) {
  try {
    const exists = db.prepare('SELECT id FROM test_cases WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });

    const { title, preconditions = '', steps, expected_result, severity, status } = req.body;

    if (!title?.trim())                          return res.status(400).json({ success: false, data: null, error: 'title is required.' });
    if (!Array.isArray(steps) || !steps.length)  return res.status(400).json({ success: false, data: null, error: 'steps must be a non-empty array.' });
    if (!expected_result?.trim())                return res.status(400).json({ success: false, data: null, error: 'expected_result is required.' });
    if (!VALID_SEVERITIES.includes(severity))    return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
    if (!VALID_STATUSES.includes(status))        return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });

    db.prepare(`
      UPDATE test_cases
      SET title=?, preconditions=?, steps=?, expected_result=?, severity=?, status=?, updated_at=datetime('now')
      WHERE id=?
    `).run(title.trim(), preconditions.trim(), JSON.stringify(steps), expected_result.trim(), severity, status, req.params.id);

    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: parseRow(row), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleDeleteTestCase(req, res) {
  try {
    const exists = db.prepare('SELECT id FROM test_cases WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
    db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: Number(req.params.id) }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',     handleListTestCases);
router.get('/:id',  handleGetTestCase);
router.post('/',    handleCreateTestCase);
router.put('/:id',  handleUpdateTestCase);
router.delete('/:id', handleDeleteTestCase);

module.exports = router;
