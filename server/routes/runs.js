const express = require('express');
const db      = require('../db');

const router = express.Router();

async function createGitHubIssue(title, body) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !repo) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.html_url;
  } catch {
    return null;
  }
}

function getRunWithResults(runId) {
  const run = db.prepare(`
    SELECT r.*, s.name as suite_name, s.feature
    FROM test_runs_v2 r
    LEFT JOIN suites s ON s.id = r.suite_id
    WHERE r.id = ?
  `).get(runId);
  if (!run) return null;
  const results = db.prepare(`
    SELECT rr.*, tc.title as case_title, tc.expected_result, tc.severity
    FROM test_run_results rr
    LEFT JOIN test_cases tc ON tc.id = rr.test_case_id
    WHERE rr.run_id = ?
    ORDER BY rr.id ASC
  `).all(runId);
  return { ...run, results };
}

function handleListRuns(req, res) {
  try {
    const runs = db.prepare(`
      SELECT r.*, s.name as suite_name, s.feature
      FROM test_runs_v2 r
      LEFT JOIN suites s ON s.id = r.suite_id
      ORDER BY r.created_at DESC
    `).all();
    res.json({ success: true, data: { items: runs, total: runs.length }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetRun(req, res) {
  try {
    const run = getRunWithResults(req.params.id);
    if (!run) return res.status(404).json({ success: false, data: null, error: 'Run not found.' });
    res.json({ success: true, data: run, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleCreateRun(req, res) {
  try {
    const { suite_id, created_by = '' } = req.body;
    if (!suite_id) return res.status(400).json({ success: false, data: null, error: 'suite_id is required.' });

    const suite = db.prepare('SELECT * FROM suites WHERE id = ?').get(suite_id);
    if (!suite) return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });

    const cases = db.prepare(
      'SELECT test_case_id FROM suite_test_cases WHERE suite_id = ? ORDER BY sort_order ASC'
    ).all(suite_id);
    if (cases.length === 0) return res.status(400).json({ success: false, data: null, error: 'Suite has no test cases.' });

    let runId;
    db.transaction(() => {
      const r = db.prepare('INSERT INTO test_runs_v2 (suite_id, created_by) VALUES (?, ?)').run(suite_id, created_by.trim());
      runId = r.lastInsertRowid;
      const ins = db.prepare('INSERT INTO test_run_results (run_id, test_case_id) VALUES (?, ?)');
      for (const c of cases) ins.run(runId, c.test_case_id);
    })();

    res.status(201).json({ success: true, data: getRunWithResults(runId), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

async function handleUpdateResult(req, res) {
  try {
    const { result, notes = '', duration_ms } = req.body;
    const VALID = ['passed', 'failed', 'skipped'];
    if (!result)              return res.status(400).json({ success: false, data: null, error: 'result is required.' });
    if (!VALID.includes(result)) return res.status(400).json({ success: false, data: null, error: `result must be one of: ${VALID.join(', ')}.` });

    const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(req.params.id);
    if (!run) return res.status(404).json({ success: false, data: null, error: 'Run not found.' });

    const runResult = db.prepare('SELECT * FROM test_run_results WHERE id = ? AND run_id = ?').get(req.params.resultId, req.params.id);
    if (!runResult) return res.status(404).json({ success: false, data: null, error: 'Result not found.' });

    let github_issue_url = runResult.github_issue_url;

    if (result === 'failed' && !github_issue_url && runResult.test_case_id) {
      const tc = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(runResult.test_case_id);
      if (tc) {
        const issueTitle = `[Test Failed] ${tc.title}`;
        const issueBody  = [
          `**Test Case:** ${tc.title}`,
          `**Severity:** ${tc.severity}`,
          `**Run ID:** ${req.params.id}`,
          notes.trim() ? `\n**Failure Notes:**\n${notes.trim()}` : '',
          tc.expected_result ? `\n**Expected Result:**\n${tc.expected_result}` : '',
        ].filter(Boolean).join('\n');
        github_issue_url = await createGitHubIssue(issueTitle, issueBody);
      }
    }

    const failedAt = result === 'failed' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null;

    db.transaction(() => {
      db.prepare(`
        UPDATE test_run_results
        SET result=?, notes=?, duration_ms=?, failed_at=?, github_issue_url=?, updated_at=datetime('now')
        WHERE id=?
      `).run(result, notes.trim(), duration_ms ?? null, failedAt, github_issue_url, req.params.resultId);

      const counts = db.prepare(`
        SELECT
          SUM(CASE WHEN result='passed'  THEN 1 ELSE 0 END) as pass_count,
          SUM(CASE WHEN result='failed'  THEN 1 ELSE 0 END) as fail_count,
          SUM(CASE WHEN result='skipped' THEN 1 ELSE 0 END) as skip_count,
          SUM(CASE WHEN result='pending' THEN 1 ELSE 0 END) as pending_count
        FROM test_run_results WHERE run_id=?
      `).get(req.params.id);

      const done = counts.pending_count === 0;
      db.prepare(`
        UPDATE test_runs_v2
        SET pass_count=?, fail_count=?, skip_count=?,
            status=?, end_time=CASE WHEN ? THEN datetime('now') ELSE end_time END
        WHERE id=?
      `).run(counts.pass_count, counts.fail_count, counts.skip_count, done ? 'completed' : 'in_progress', done ? 1 : 0, req.params.id);
    })();

    res.json({ success: true, data: getRunWithResults(req.params.id), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

router.get('/',                         handleListRuns);
router.get('/:id',                      handleGetRun);
router.post('/',                        handleCreateRun);
router.patch('/:id/results/:resultId',  handleUpdateResult);

module.exports = router;
