const express = require('express');
const db      = require('../db');

const router = express.Router();

const VALID_STATUSES  = ['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'];
const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const LIMITS = { title: 255, description: 5000, expected: 5000, actual: 5000, environment: 255, step: 1000, comment: 2000 };

function validateLengths({ title, description, expected, actual, environment, steps }) {
  if (title.trim().length       > LIMITS.title)       return `title must be ${LIMITS.title} characters or fewer.`;
  if (description.length        > LIMITS.description) return `description must be ${LIMITS.description} characters or fewer.`;
  if (expected.length           > LIMITS.expected)    return `expected must be ${LIMITS.expected} characters or fewer.`;
  if (actual.length             > LIMITS.actual)      return `actual must be ${LIMITS.actual} characters or fewer.`;
  if (environment.length        > LIMITS.environment) return `environment must be ${LIMITS.environment} characters or fewer.`;
  const longStep = steps.find(s => typeof s === 'string' && s.length > LIMITS.step);
  if (longStep) return `Each step must be ${LIMITS.step} characters or fewer.`;
  return null;
}

const TRANSITIONS = {
  'Open':        ['In Progress', 'Closed'],
  'In Progress': ['Resolved', 'Closed'],
  'Resolved':    ['Closed', 'Reopened'],
  'Closed':      ['Reopened'],
  'Reopened':    ['In Progress', 'Closed'],
};

function parseBug(bug) {
  if (!bug) return null;
  return { ...bug, steps: JSON.parse(bug.steps || '[]') };
}

function handleListBugs(req, res) {
  try {
    const { status, severity, priority, search } = req.query;
    const conds  = [];
    const params = [];

    if (status   && VALID_STATUSES.includes(status))   { conds.push('b.status = ?');   params.push(status); }
    if (severity && VALID_SEVERITIES.includes(severity)) { conds.push('b.severity = ?'); params.push(severity); }
    if (priority && VALID_PRIORITIES.includes(priority)) { conds.push('b.priority = ?'); params.push(priority); }
    if (search?.trim()) {
      conds.push('(b.title LIKE ? OR b.description LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const items = db.prepare(`
      SELECT b.* FROM bugs b ${where} ORDER BY b.created_at DESC
    `).all(...params).map(parseBug);

    res.json({ success: true, data: { items, total: items.length }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetBug(req, res) {
  try {
    const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
    if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });

    const activity = db.prepare(
      'SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC'
    ).all(req.params.id);

    res.json({ success: true, data: { ...parseBug(bug), activity }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateBug(req, res) {
  try {
    const { title, description = '', severity, priority = 'Medium', steps = [], expected = '', actual = '', environment = '' } = req.body;
    if (!title?.trim())    return res.status(400).json({ success: false, data: null, error: 'title is required.' });
    if (!severity)         return res.status(400).json({ success: false, data: null, error: 'severity is required.' });
    if (!VALID_SEVERITIES.includes(severity)) return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
    if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ success: false, data: null, error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}.` });
    if (!Array.isArray(steps)) return res.status(400).json({ success: false, data: null, error: 'steps must be an array.' });
    const lengthError = validateLengths({ title, description, expected, actual, environment, steps });
    if (lengthError) return res.status(400).json({ success: false, data: null, error: lengthError });

    const result = db.prepare(`
      INSERT INTO bugs (title, description, severity, priority, steps, expected, actual, environment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title.trim(), description.trim(), severity, priority, JSON.stringify(steps), expected.trim(), actual.trim(), environment.trim());

    const bug = parseBug(db.prepare('SELECT * FROM bugs WHERE id = ?').get(result.lastInsertRowid));
    res.status(201).json({ success: true, data: { ...bug, activity: [] }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateBug(req, res) {
  try {
    const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
    if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });

    const { title, description = '', severity, priority = 'Medium', steps = [], expected = '', actual = '', environment = '' } = req.body;
    if (!title?.trim())    return res.status(400).json({ success: false, data: null, error: 'title is required.' });
    if (!severity)         return res.status(400).json({ success: false, data: null, error: 'severity is required.' });
    if (!VALID_SEVERITIES.includes(severity)) return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
    if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ success: false, data: null, error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}.` });
    if (!Array.isArray(steps)) return res.status(400).json({ success: false, data: null, error: 'steps must be an array.' });
    const lengthError = validateLengths({ title, description, expected, actual, environment, steps });
    if (lengthError) return res.status(400).json({ success: false, data: null, error: lengthError });

    const newValues = {
      title: title.trim(), description: description.trim(), severity, priority,
      steps: JSON.stringify(steps), expected: expected.trim(), actual: actual.trim(), environment: environment.trim(),
    };
    const logActivity = db.prepare(`INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (?, 'field_change', ?, ?, ?)`);

    db.transaction(() => {
      db.prepare(`UPDATE bugs SET title=?, description=?, severity=?, priority=?, steps=?, expected=?, actual=?, environment=?, updated_at=datetime('now') WHERE id=?`)
        .run(newValues.title, newValues.description, newValues.severity, newValues.priority, newValues.steps, newValues.expected, newValues.actual, newValues.environment, req.params.id);

      for (const field of ['title', 'description', 'severity', 'priority', 'expected', 'actual', 'environment']) {
        if (String(bug[field] ?? '') !== String(newValues[field])) {
          logActivity.run(req.params.id, String(bug[field] ?? ''), String(newValues[field]), field);
        }
      }
      if (bug.steps !== newValues.steps) {
        logActivity.run(req.params.id, bug.steps, newValues.steps, 'steps');
      }
    })();

    const updated  = parseBug(db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id));
    const activity = db.prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ success: true, data: { ...updated, activity }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleDeleteBug(req, res) {
  try {
    const bug = db.prepare('SELECT id FROM bugs WHERE id = ?').get(req.params.id);
    if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });
    db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: Number(req.params.id) }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateBugStatus(req, res) {
  try {
    const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
    if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, data: null, error: 'status is required.' });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });

    const allowed = TRANSITIONS[bug.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(422).json({
        success: false, data: null,
        error: `Cannot transition from "${bug.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}.`,
      });
    }

    db.transaction(() => {
      db.prepare(`UPDATE bugs SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);
      db.prepare(`INSERT INTO bug_activity (bug_id, action, old_value, new_value) VALUES (?, 'status_change', ?, ?)`).run(req.params.id, bug.status, status);
    })();

    const updated  = parseBug(db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id));
    const activity = db.prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ success: true, data: { ...updated, activity }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleAddBugComment(req, res) {
  try {
    const bug = db.prepare('SELECT id FROM bugs WHERE id = ?').get(req.params.id);
    if (!bug) return res.status(404).json({ success: false, data: null, error: 'Bug not found.' });

    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, data: null, error: 'message is required.' });
    if (message.trim().length > LIMITS.comment) return res.status(400).json({ success: false, data: null, error: `message must be ${LIMITS.comment} characters or fewer.` });

    db.prepare(`INSERT INTO bug_activity (bug_id, action, message) VALUES (?, 'comment', ?)`).run(req.params.id, message.trim());

    const activity = db.prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ success: true, data: activity, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',               handleListBugs);
router.get('/:id',            handleGetBug);
router.post('/',              handleCreateBug);
router.put('/:id',            handleUpdateBug);
router.delete('/:id',         handleDeleteBug);
router.patch('/:id/status',   handleUpdateBugStatus);
router.post('/:id/comments',  handleAddBugComment);

module.exports = router;
