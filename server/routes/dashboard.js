const express = require('express');
const db      = require('../db');

const router = express.Router();

// Build a short, human-readable summary for a bug_activity row.
// Examples:
//   status_change → "bug #42 marked Resolved"
//   field_change  → "bug #42 severity changed from Major to Critical"
//   comment       → "comment added to bug #42"
function summarizeActivity(a) {
  const ref = `bug #${a.bug_id}`;
  if (a.action === 'status_change') {
    return `${ref} marked ${a.new_value}`;
  }
  if (a.action === 'field_change') {
    const field = a.message || 'a field';
    if (field === 'steps') return `${ref} steps updated`;
    const clip = v => {
      const s = String(v ?? '').replace(/\s+/g, ' ').trim();
      if (!s) return '(empty)';
      return s.length > 40 ? s.slice(0, 40) + '…' : s;
    };
    return `${ref} ${field} changed to "${clip(a.new_value)}"`;
  }
  if (a.action === 'comment') {
    return `comment added to ${ref}`;
  }
  return `${ref} updated`;
}

function handleGetMetrics(req, res) {
  try {
    // --- Metric 1: total test cases ---
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM test_cases').get();

    // --- Metric 2: pass rate (%) ---
    // Of all decided results (passed or failed), the share that passed.
    // Skipped and pending results are excluded — they are neither pass nor fail.
    const passRow = db.prepare(`
      SELECT
        SUM(CASE WHEN result='passed' THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN result='failed' THEN 1 ELSE 0 END) AS failed
      FROM test_run_results
    `).get();
    const decided  = (passRow.passed || 0) + (passRow.failed || 0);
    const passRate = decided > 0 ? Math.round((passRow.passed / decided) * 100) : null;

    // --- Metric 3: open bugs ---
    // "Open" = anything not yet Resolved or Closed.
    const { openBugs } = db.prepare(`
      SELECT COUNT(*) AS openBugs FROM bugs
      WHERE status NOT IN ('Resolved','Closed')
    `).get();

    // --- Metric 4: average test run duration (seconds) ---
    // Only completed runs have an end_time. Convert the day fraction to seconds.
    const durRow = db.prepare(`
      SELECT AVG((julianday(end_time) - julianday(start_time)) * 86400) AS avgSeconds
      FROM test_runs_v2
      WHERE status = 'completed' AND end_time IS NOT NULL
    `).get();
    const avgRunDurationSeconds = durRow.avgSeconds != null ? Math.round(durRow.avgSeconds) : null;

    // --- 10 most recent test runs ---
    const recentRuns = db.prepare(`
      SELECT r.id, r.status, r.pass_count, r.fail_count, r.skip_count,
             r.start_time, r.end_time, r.created_at,
             s.name AS suite_name, s.feature
      FROM test_runs_v2 r
      LEFT JOIN suites s ON s.id = r.suite_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();

    // --- 10 most recent activity items ---
    const activityRows = db.prepare(`
      SELECT a.id, a.bug_id, a.action, a.old_value, a.new_value, a.message, a.created_at,
             b.title AS bug_title
      FROM bug_activity a
      LEFT JOIN bugs b ON b.id = a.bug_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 10
    `).all();
    const recentActivity = activityRows.map(a => ({
      id: a.id,
      bug_id: a.bug_id,
      bug_title: a.bug_title,
      action: a.action,
      summary: summarizeActivity(a),
      created_at: a.created_at,
    }));

    res.json({
      success: true,
      data: {
        metrics: {
          totalTestCases: total,
          passRate,                 // 0–100, or null when no decided results yet
          openBugs,
          avgRunDurationSeconds,    // seconds, or null when no completed runs yet
        },
        recentRuns,
        recentActivity,
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/metrics', handleGetMetrics);

module.exports = router;
