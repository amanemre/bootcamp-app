const express = require('express');
const { parse } = require('csv-parse/sync');
const db = require('../db');

const router = express.Router();

const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_STATUSES   = ['Draft', 'Ready', 'Passed', 'Failed', 'Skipped'];

// Case-insensitive lookup tables → canonical enum value.
const CANON_SEVERITY = Object.fromEntries(VALID_SEVERITIES.map(s => [s.toLowerCase(), s]));
const CANON_STATUS   = Object.fromEntries(VALID_STATUSES.map(s => [s.toLowerCase(), s]));

const REQUIRED_HEADERS = ['title', 'steps', 'expected_result', 'severity'];
const KNOWN_HEADERS    = ['title', 'preconditions', 'steps', 'expected_result', 'severity', 'status'];
const MAX_IMPORT_ROWS  = 2000;

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

// Shared filter/sort builder so the list and export endpoints stay in sync.
function buildFilter({ status, search, sort = 'updated_at', order = 'desc' } = {}) {
  const conds = [], params = [];
  if (status) { conds.push('status = ?'); params.push(status); }
  if (search) { conds.push('LOWER(title) LIKE ?'); params.push(`%${String(search).toLowerCase()}%`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const sortExpr = sort === 'severity' ? SEVERITY_ORDER : 'updated_at';
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  return { where, params, orderBy: `ORDER BY ${sortExpr} ${dir}` };
}

// CSV export uses the same column set/format the import reads (round-trippable).
const EXPORT_COLUMNS = ['title', 'severity', 'steps', 'expected_result', 'preconditions', 'status'];

// RFC 4180: quote fields containing comma, quote, CR, or LF; double internal quotes.
function csvField(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function rowToCsv(tc) {
  const steps = Array.isArray(tc.steps) ? tc.steps.join('|') : '';
  return [tc.title, tc.severity, steps, tc.expected_result, tc.preconditions, tc.status].map(csvField).join(',');
}

// Single source of truth for test-case validation, shared by create, update,
// and CSV import. Expects a normalized object (steps already an array,
// severity/status as canonical strings). Returns an array of error messages.
function validateTestCaseInput({ title, steps, expected_result, severity, status }) {
  const errors = [];
  if (!title || !String(title).trim())                 errors.push('title is required.');
  if (!Array.isArray(steps) || !steps.length)          errors.push('steps must be a non-empty array.');
  if (!expected_result || !String(expected_result).trim()) errors.push('expected_result is required.');
  if (!VALID_SEVERITIES.includes(severity))            errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}.`);
  if (!VALID_STATUSES.includes(status))                errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
  return errors;
}

/* -------------------------------- CRUD handlers -------------------------------- */

function handleListTestCases(req, res) {
  try {
    const { page = 1, pageSize, status, search, sort = 'updated_at', order = 'desc' } = req.query;
    const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];
    const limit = ALLOWED_PAGE_SIZES.includes(Number(pageSize)) ? Number(pageSize) : 20;
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const { where, params, orderBy } = buildFilter({ status, search, sort, order });

    const { count } = db.prepare(`SELECT COUNT(*) as count FROM test_cases ${where}`).get(...params);
    const items = db
      .prepare(`SELECT * FROM test_cases ${where} ${orderBy} LIMIT ? OFFSET ?`)
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

    const errors = validateTestCaseInput({ title, steps, expected_result, severity, status });
    if (errors.length) return res.status(400).json({ success: false, data: null, error: errors[0] });

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

    const errors = validateTestCaseInput({ title, steps, expected_result, severity, status });
    if (errors.length) return res.status(400).json({ success: false, data: null, error: errors[0] });

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

/* -------------------------------- CSV import -------------------------------- */

// Thrown for client-fixable CSV problems → surfaced as HTTP 400 (not 500).
class CsvError extends Error {}

// Parse raw CSV text into row objects keyed by normalized header. Validates the
// header row (required columns, duplicates) and the row cap. Throws CsvError for
// any client-fixable issue. Each returned object carries a __rowNumber (the CSV
// line number, where line 1 is the header) for error reporting.
function parseCsv(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) throw new CsvError('The file is empty.');

  let rows;
  try {
    rows = parse(csvText, { bom: true, skip_empty_lines: true, relax_column_count: true });
  } catch (e) {
    throw new CsvError(`Could not parse the CSV: ${e.message}`);
  }
  if (!rows.length) throw new CsvError('The file has no rows.');

  const rawHeaders = rows[0].map(h => String(h).trim());
  const headers = rawHeaders.map(h => h.toLowerCase());

  const dupes = headers.filter((h, i) => h && headers.indexOf(h) !== i);
  if (dupes.length) throw new CsvError(`Duplicate column(s): ${[...new Set(dupes)].join(', ')}.`);

  const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  if (missing.length) {
    throw new CsvError(`Missing required column(s): ${missing.join(', ')}. Required columns are: ${REQUIRED_HEADERS.join(', ')}.`);
  }

  const ignoredColumns = rawHeaders.filter(h => h && !KNOWN_HEADERS.includes(h.toLowerCase()));

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new CsvError(`Too many rows: ${dataRows.length}. The maximum is ${MAX_IMPORT_ROWS} per import.`);
  }

  const objects = [];
  dataRows.forEach((cells, idx) => {
    if (!cells.some(c => String(c ?? '').trim() !== '')) return;   // skip blank rows
    const obj = { __rowNumber: idx + 2 };                          // +2: header is line 1
    headers.forEach((h, i) => { if (h && !(h in obj)) obj[h] = String(cells[i] ?? ''); });
    objects.push(obj);
  });

  return { ignoredColumns, objects };
}

// Map a raw CSV row object to a normalized test-case object.
function mapRow(raw) {
  const stepsCell = raw.steps ?? '';
  const steps = stepsCell.split(/[\n|]/).map(s => s.trim()).filter(Boolean);

  const sevRaw    = (raw.severity ?? '').trim();
  const statusRaw = (raw.status ?? '').trim();

  return {
    title:           (raw.title ?? '').trim(),
    preconditions:   (raw.preconditions ?? '').trim(),
    steps,
    expected_result: (raw.expected_result ?? '').trim(),
    // Canonicalize case; fall back to the raw value so invalid ones are reported.
    severity: CANON_SEVERITY[sevRaw.toLowerCase()] ?? sevRaw,
    status:   statusRaw ? (CANON_STATUS[statusRaw.toLowerCase()] ?? statusRaw) : 'Draft',
  };
}

function handleImportPreview(req, res) {
  try {
    let parsed;
    try { parsed = parseCsv(req.body?.csv); }
    catch (e) {
      if (e instanceof CsvError) return res.status(400).json({ success: false, data: null, error: e.message });
      throw e;
    }

    const existingTitles = new Set(db.prepare('SELECT LOWER(title) t FROM test_cases').all().map(r => r.t));
    const seen = new Set();
    let validCount = 0, dupCount = 0;

    const rows = parsed.objects.map(raw => {
      const mapped = mapRow(raw);
      const errors = validateTestCaseInput(mapped);
      const key = mapped.title.toLowerCase();
      const duplicate = !!mapped.title && (existingTitles.has(key) || seen.has(key));
      if (mapped.title) seen.add(key);
      if (!errors.length) validCount++;
      if (duplicate) dupCount++;
      return { rowNumber: raw.__rowNumber, mapped, valid: errors.length === 0, errors, duplicate };
    });

    res.json({
      success: true,
      data: {
        ignoredColumns: parsed.ignoredColumns,
        rows,
        summary: { total: rows.length, valid: validCount, invalid: rows.length - validCount, duplicates: dupCount },
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleImportCommit(req, res) {
  try {
    let parsed;
    try { parsed = parseCsv(req.body?.csv); }
    catch (e) {
      if (e instanceof CsvError) return res.status(400).json({ success: false, data: null, error: e.message });
      throw e;
    }

    // Re-validate identically to preview; partition into valid / skipped.
    const valid = [];
    const skipped = [];
    parsed.objects.forEach(raw => {
      const mapped = mapRow(raw);
      const errors = validateTestCaseInput(mapped);
      if (errors.length) skipped.push({ rowNumber: raw.__rowNumber, errors });
      else valid.push(mapped);
    });

    const insert = db.prepare(`
      INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    let imported = 0;
    db.transaction(() => {
      for (const m of valid) {
        insert.run(m.title, m.preconditions, JSON.stringify(m.steps), m.expected_result, m.severity, m.status);
        imported++;
      }
    })();

    res.json({ success: true, data: { imported, skipped }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

// Export the full filtered set (no pagination) as a downloadable CSV.
function handleExportTestCases(req, res) {
  try {
    const { where, params, orderBy } = buildFilter(req.query);
    const rows = db.prepare(`SELECT * FROM test_cases ${where} ${orderBy}`).all(...params).map(parseRow);

    const lines = [EXPORT_COLUMNS.join(','), ...rows.map(rowToCsv)];
    // Lead with a BOM so Excel reads UTF-8 correctly; CRLF line endings per RFC 4180.
    const csv = '﻿' + lines.join('\r\n') + '\r\n';

    const stamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-'); // 2026-06-18_06-44-12
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="test-cases-${stamp}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

// Import/export routes are registered BEFORE '/:id' so they aren't captured by it.
router.get('/',                handleListTestCases);
router.get('/export',          handleExportTestCases);
router.post('/import/preview', handleImportPreview);
router.post('/import',         handleImportCommit);
router.get('/:id',             handleGetTestCase);
router.post('/',               handleCreateTestCase);
router.put('/:id',             handleUpdateTestCase);
router.delete('/:id',          handleDeleteTestCase);

module.exports = router;
