const express = require('express');
const db      = require('../db');

const router = express.Router();

// Single-user app for now: all preferences live under this user id.
const USER_ID = 'default';

const VALID_THEMES      = ['light', 'dark', 'system'];
const VALID_SEVERITIES  = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_PAGE_SIZES  = [10, 20, 50, 100];

// Convert a DB row to the API shape (auto_generate_report_after_run as boolean).
function toApi(row) {
  return {
    theme:                          row.theme,
    default_severity_for_new_bugs:  row.default_severity_for_new_bugs,
    default_page_size:              row.default_page_size,
    timezone:                       row.timezone,
    auto_generate_report_after_run: !!row.auto_generate_report_after_run,
    updated_at:                     row.updated_at,
  };
}

// Return the single preferences row, creating it with defaults if absent.
function getPrefs() {
  let row = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(USER_ID);
  if (!row) {
    db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(USER_ID);
    row = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(USER_ID);
  }
  return row;
}

function handleGetSettings(req, res) {
  try {
    res.json({ success: true, data: toApi(getPrefs()), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleUpdateSettings(req, res) {
  try {
    const current = getPrefs();
    const body = req.body || {};

    // Merge provided fields over current values, validating each.
    const next = {
      theme:                          body.theme                          ?? current.theme,
      default_severity_for_new_bugs:  body.default_severity_for_new_bugs  ?? current.default_severity_for_new_bugs,
      default_page_size:              body.default_page_size              ?? current.default_page_size,
      timezone:                       body.timezone                       ?? current.timezone,
      auto_generate_report_after_run: body.auto_generate_report_after_run ?? !!current.auto_generate_report_after_run,
    };

    if (!VALID_THEMES.includes(next.theme))
      return res.status(400).json({ success: false, data: null, error: `theme must be one of: ${VALID_THEMES.join(', ')}.` });
    if (!VALID_SEVERITIES.includes(next.default_severity_for_new_bugs))
      return res.status(400).json({ success: false, data: null, error: `default_severity_for_new_bugs must be one of: ${VALID_SEVERITIES.join(', ')}.` });
    if (!VALID_PAGE_SIZES.includes(Number(next.default_page_size)))
      return res.status(400).json({ success: false, data: null, error: `default_page_size must be one of: ${VALID_PAGE_SIZES.join(', ')}.` });
    if (typeof next.timezone !== 'string' || next.timezone.length > 64)
      return res.status(400).json({ success: false, data: null, error: 'timezone must be a string of at most 64 characters.' });
    if (typeof next.auto_generate_report_after_run !== 'boolean')
      return res.status(400).json({ success: false, data: null, error: 'auto_generate_report_after_run must be a boolean.' });

    db.prepare(`
      UPDATE user_preferences
      SET theme=?, default_severity_for_new_bugs=?, default_page_size=?, timezone=?,
          auto_generate_report_after_run=?, updated_at=datetime('now')
      WHERE user_id=?
    `).run(
      next.theme, next.default_severity_for_new_bugs, Number(next.default_page_size),
      next.timezone, next.auto_generate_report_after_run ? 1 : 0, USER_ID,
    );

    res.json({ success: true, data: toApi(getPrefs()), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/', handleGetSettings);
router.put('/', handleUpdateSettings);

module.exports = router;
