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

// Parse a SQLite 'YYYY-MM-DD HH:MM:SS' UTC timestamp into a Date.
function parseUtc(str) {
  if (!str) return null;
  const d = new Date(str.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

// Monday 00:00 UTC of the week containing the given date.
function weekStartUtc(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day  = date.getUTCDay();                 // 0=Sun … 6=Sat
  const shift = day === 0 ? -6 : 1 - day;        // back to Monday
  date.setUTCDate(date.getUTCDate() + shift);
  return date;
}

function handleGetTrends(req, res) {
  try {
    // --- 1. Pass-rate trend over the last 10 runs (oldest → newest) ---
    const recentRuns = db.prepare(`
      SELECT id, suite_id, pass_count, fail_count, skip_count, start_time, created_at
      FROM test_runs_v2
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 10
    `).all().reverse();
    const passRateTrend = recentRuns.map(r => {
      const decided = (r.pass_count || 0) + (r.fail_count || 0);
      return {
        run_id:    r.id,
        date:      r.start_time || r.created_at,
        pass_rate: decided > 0 ? Math.round((r.pass_count / decided) * 100) : 0,
      };
    });

    // --- 2. Bugs opened vs closed per week, last 8 weeks ---
    const now    = new Date();
    const thisWk = weekStartUtc(now);
    const weeks  = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(thisWk);
      start.setUTCDate(start.getUTCDate() - i * 7);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      weeks.push({
        start,
        end,
        label: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
        opened: 0,
        closed: 0,
      });
    }
    const bucketOf = (date) => weeks.find(w => date >= w.start && date < w.end);

    // Opened = bug creation date.
    for (const row of db.prepare('SELECT created_at FROM bugs').all()) {
      const d = parseUtc(row.created_at);
      if (d) { const w = bucketOf(d); if (w) w.opened++; }
    }
    // Closed = status transitions to a terminal state (Resolved / Closed).
    for (const row of db.prepare(`
      SELECT created_at FROM bug_activity
      WHERE action = 'status_change' AND new_value IN ('Resolved','Closed')
    `).all()) {
      const d = parseUtc(row.created_at);
      if (d) { const w = bucketOf(d); if (w) w.closed++; }
    }
    const bugsWeekly = weeks.map(w => ({ week: w.label, opened: w.opened, closed: w.closed }));

    // --- 3. Test coverage by status (all five buckets, zero-filled) ---
    const STATUSES = ['Draft', 'Ready', 'Passed', 'Failed', 'Skipped'];
    const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
    for (const row of db.prepare('SELECT status, COUNT(*) c FROM test_cases GROUP BY status').all()) {
      if (row.status in counts) counts[row.status] = row.c;
    }
    const coverageByStatus = STATUSES.map(status => ({ status, count: counts[status] }));

    res.json({
      success: true,
      data: { passRateTrend, bugsWeekly, coverageByStatus },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/metrics', handleGetMetrics);
router.get('/trends',  handleGetTrends);

module.exports = router;
