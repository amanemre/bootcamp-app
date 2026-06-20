const express = require('express');
const db      = require('../db');

const router = express.Router();

function computeLabel(score) {
  if (score >= 0.64) return 'Flaky';
  if (score >= 0.20) return 'Unstable';
  return 'Stable';
}

function refreshStats() {
  const aggregates = db.prepare(`
    SELECT
      test_case_id,
      COUNT(*) FILTER (WHERE result = 'passed')  AS passed_runs,
      COUNT(*) FILTER (WHERE result = 'failed')  AS failed_runs,
      COUNT(*) FILTER (WHERE result = 'skipped') AS skipped_runs,
      COUNT(*)                                    AS total_runs
    FROM test_run_results
    WHERE test_case_id IS NOT NULL
    GROUP BY test_case_id
  `).all();

  const prevFlaky = new Set(
    db.prepare(`SELECT test_case_id FROM test_case_stats WHERE flakiness_score >= 0.64`).all()
      .map(r => r.test_case_id)
  );

  const newlyFlaky  = [];
  const stillFlaky  = [];

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO test_case_stats
      (test_case_id, total_runs, passed_runs, failed_runs, skipped_runs,
       decisive, pass_rate, flakiness_score, flakiness_label, history, trend, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const getHistory = db.prepare(`
    SELECT result FROM test_run_results
    WHERE test_case_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `);

  const getLast5 = db.prepare(`
    SELECT result FROM test_run_results
    WHERE test_case_id = ? AND result IN ('passed','failed')
    ORDER BY created_at DESC
    LIMIT 5
  `);

  db.transaction(() => {
    for (const row of aggregates) {
      const decisive    = row.passed_runs + row.failed_runs;
      const pass_rate   = decisive >= 2 ? row.passed_runs / decisive : null;
      const flakiness_score = pass_rate !== null ? 4 * pass_rate * (1 - pass_rate) : 0;
      const flakiness_label = computeLabel(flakiness_score);

      const historyRows = getHistory.all(row.test_case_id);
      const history     = JSON.stringify(historyRows.map(r => r.result));

      let trend = 'stable';
      if (decisive >= 6) {
        const last5    = getLast5.all(row.test_case_id).map(r => r.result);
        const recent5  = last5.filter(r => r === 'passed').length / last5.length;
        const overall  = pass_rate ?? 0;
        if (recent5 >= overall + 0.1) trend = 'improving';
        else if (recent5 <= overall - 0.1) trend = 'degrading';
      }

      const prevHyp = db.prepare(
        'SELECT ai_hypothesis FROM test_case_stats WHERE test_case_id = ?'
      ).get(row.test_case_id);

      upsert.run(
        row.test_case_id, row.total_runs, row.passed_runs, row.failed_runs, row.skipped_runs,
        decisive, pass_rate, flakiness_score, flakiness_label, history, trend
      );

      if (prevHyp) {
        db.prepare('UPDATE test_case_stats SET ai_hypothesis = ? WHERE test_case_id = ?')
          .run(prevHyp.ai_hypothesis, row.test_case_id);
      }

      const title = db.prepare('SELECT title FROM test_cases WHERE id = ?').get(row.test_case_id)?.title;
      if (flakiness_score >= 0.64) {
        if (prevFlaky.has(row.test_case_id)) stillFlaky.push(title);
        else newlyFlaky.push(title);
      }
    }
  })();

  return { refreshed: aggregates.length, newly_flaky: newlyFlaky, still_flaky: stillFlaky };
}

// GET /api/flaky-tests
router.get('/', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT s.*, tc.title
      FROM test_case_stats s
      JOIN test_cases tc ON tc.id = s.test_case_id
      ORDER BY s.flakiness_score DESC, s.decisive DESC, s.test_case_id ASC
    `).all();

    const updatedAt = stats.length > 0
      ? stats.reduce((a, b) => a.updated_at > b.updated_at ? a : b).updated_at
      : null;

    const allTests = stats.map(s => ({
      test_case_id:    s.test_case_id,
      title:           s.title,
      total_runs:      s.total_runs,
      passed:          s.passed_runs,
      failed:          s.failed_runs,
      skipped:         s.skipped_runs,
      decisive:        s.decisive,
      pass_rate:       s.pass_rate !== null ? Math.round(s.pass_rate * 1000) / 10 : null,
      flakiness_score: Math.round(s.flakiness_score * 100) / 100,
      flakiness_label: s.flakiness_label,
      ai_hypothesis:   s.ai_hypothesis,
      history:         JSON.parse(s.history || '[]'),
      trend:           s.trend,
    }));

    const leaderboard = allTests
      .filter(t => t.decisive >= 3 && t.flakiness_score >= 0.20)
      .slice(0, 10)
      .map((t, i) => ({ rank: i + 1, ...t }));

    res.json({ success: true, data: { leaderboard, all_tests: allTests, updated_at: updatedAt }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// POST /api/flaky-tests/refresh
router.post('/refresh', (req, res) => {
  try {
    const result = refreshStats();
    res.json({ success: true, data: result, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// PATCH /api/flaky-tests/:id/hypothesis
router.patch('/:id/hypothesis', (req, res) => {
  const id         = Number(req.params.id);
  const { hypothesis } = req.body;
  if (!hypothesis || typeof hypothesis !== 'string') {
    return res.status(400).json({ success: false, data: null, error: 'hypothesis is required' });
  }
  try {
    const info = db.prepare(
      'UPDATE test_case_stats SET ai_hypothesis = ?, updated_at = datetime(\'now\') WHERE test_case_id = ?'
    ).run(hypothesis.trim(), id);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Test case stats not found' });
    }
    res.json({ success: true, data: { test_case_id: id, hypothesis: hypothesis.trim() }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

module.exports = { router, refreshStats };
