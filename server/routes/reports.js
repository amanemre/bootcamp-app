const express = require('express');
const db      = require('../db');

const router = express.Router();

// Application metadata for the exported report header/footer. Version is
// optional — pulled from package.json when present.
const APP_NAME = 'Bootcamp App';
let APP_VERSION = '';
try { APP_VERSION = require('../package.json').version || ''; } catch { /* version is optional */ }

// Load a run with its joined suite and per-case results — mirrors the
// shape used by routes/runs.js so report snapshots stay consistent.
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

// Freeze a run into an immutable snapshot. Counts are computed from the
// snapshot's own results so the report stays self-consistent even if the
// underlying run changes later.
function buildSnapshot(run) {
  const results = (run.results ?? []).map(r => ({
    case_title:       r.case_title ?? '(deleted case)',
    severity:         r.severity ?? null,
    result:           r.result,
    notes:            r.notes ?? '',
    duration_ms:      r.duration_ms ?? null,
    expected_result:  r.expected_result ?? '',
    failed_at:        r.failed_at ?? null,
    github_issue_url: r.github_issue_url ?? null,
  }));
  const count = v => results.filter(r => r.result === v).length;
  return {
    suite_name:    run.suite_name ?? 'Unknown Suite',
    run_date:      run.start_time ?? null,
    total_count:   results.length,
    passed_count:  count('passed'),
    failed_count:  count('failed'),
    skipped_count: count('skipped'),
    results,
  };
}

// Parse the stored JSON results column back into an array for API responses.
function parseReport(row) {
  if (!row) return null;
  let results = [];
  try { results = JSON.parse(row.results); } catch { results = []; }
  return { ...row, results };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function handleCreateReport(req, res) {
  try {
    const { run_id } = req.body;
    if (run_id === undefined || run_id === null || run_id === '') {
      return res.status(400).json({ success: false, data: null, error: 'run_id is required.' });
    }

    const run = getRunWithResults(run_id);
    if (!run) {
      return res.status(404).json({ success: false, data: null, error: 'Test run not found.' });
    }

    const snap = buildSnapshot(run);
    const result = db.prepare(`
      INSERT INTO reports (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id, snap.suite_name, snap.run_date,
      snap.total_count, snap.passed_count, snap.failed_count, snap.skipped_count,
      JSON.stringify(snap.results),
    );

    const report = parseReport(db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid));
    res.status(201).json({ success: true, data: report, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleListReports(req, res) {
  try {
    // Summary fields only — the heavy results column is excluded from the list.
    const reports = db.prepare(`
      SELECT id, run_id, suite_name, run_date, total_count,
             passed_count, failed_count, skipped_count, generated_at
      FROM reports
      ORDER BY datetime(generated_at) DESC, id DESC
    `).all();
    res.json({ success: true, data: { items: reports, total: reports.length }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleGetReport(req, res) {
  try {
    const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, data: null, error: 'Report not found.' });
    res.json({ success: true, data: parseReport(row), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

function handleExportHtml(req, res) {
  try {
    const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, data: null, error: 'Report not found.' });

    const report = parseReport(row);
    const html   = renderReportHtml(report);
    const slug   = (report.suite_name || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `report-${report.id}-${slug || 'report'}.html`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}

// Build a fully self-contained, print-friendly HTML document. Inline CSS
// only, no external assets or fonts, every dynamic value escaped.
function renderReportHtml(report) {
  const fmt = (str) => {
    if (!str) return '—';
    const d = new Date(str.replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? escapeHtml(str)
      : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const total   = report.total_count || 0;
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
  const passRate = pct(report.passed_count);

  // Status palette — accessible text/background tint pairs (WCAG AA on tint).
  const STATUS = {
    passed:  { label: 'Passed',  text: '#15803d', bg: '#dcfce7', bar: '#16a34a' },
    failed:  { label: 'Failed',  text: '#b91c1c', bg: '#fee2e2', bar: '#dc2626' },
    skipped: { label: 'Skipped', text: '#b45309', bg: '#fef3c7', bar: '#d97706' },
    pending: { label: 'Pending', text: '#475569', bg: '#f1f5f9', bar: '#64748b' },
  };

  const rows = (report.results ?? []).map((r, i) => {
    const s   = STATUS[r.result] ?? STATUS.pending;
    const sev = r.severity ? `<div class="sev">${escapeHtml(r.severity)}</div>` : '';
    const issue = r.github_issue_url
      ? `<a class="issue" href="${escapeHtml(r.github_issue_url)}">View issue &#8599;</a>`
      : '';
    const details = r.notes
      ? `<div class="note">${escapeHtml(r.notes)}</div>${issue}`
      : (issue || '<span class="muted">—</span>');
    return `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="tc"><div class="tc-title">${escapeHtml(r.case_title)}</div>${sev}</td>
          <td><span class="chip" style="color:${s.text};background:${s.bg}">${s.label}</span></td>
          <td class="dur">${r.duration_ms != null ? escapeHtml(r.duration_ms) + ' ms' : '<span class="muted">—</span>'}</td>
          <td class="details">${details}</td>
        </tr>`;
  }).join('');

  const emptyRow = `<tr><td colspan="5" class="empty">No test cases in this report.</td></tr>`;
  const versionLine = APP_VERSION ? ` &middot; ${escapeHtml(APP_NAME)} v${escapeHtml(APP_VERSION)}` : ` &middot; ${escapeHtml(APP_NAME)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test Report #${escapeHtml(report.id)} — ${escapeHtml(report.suite_name)}</title>
<style>
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a; margin: 0; padding: 40px 24px; background: #f1f5f9; line-height: 1.5;
  }
  .sheet {
    max-width: 920px; margin: 0 auto; background: #fff;
    border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06);
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: #fff; padding: 32px 36px;
  }
  .eyebrow {
    font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    color: #93c5fd; margin: 0 0 6px;
  }
  .header h1 { font-size: 26px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.01em; }
  .header .suite { font-size: 15px; color: #cbd5e1; margin: 0 0 20px; }
  .header-meta {
    display: flex; flex-wrap: wrap; gap: 28px;
    border-top: 1px solid rgba(255,255,255,0.14); padding-top: 16px;
  }
  .header-meta .item .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 2px; }
  .header-meta .item .v { font-size: 14px; font-weight: 600; color: #f8fafc; }

  /* Body */
  .body { padding: 28px 36px 32px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin: 0 0 14px; }

  /* Summary cards */
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; background: #fff; border-top: 4px solid #cbd5e1; }
  .card.total   { border-top-color: #2563eb; }
  .card.passed  { border-top-color: #16a34a; }
  .card.failed  { border-top-color: #dc2626; }
  .card.skipped { border-top-color: #d97706; }
  .card .label { font-size: 12px; font-weight: 600; color: #64748b; }
  .card .value { font-size: 34px; font-weight: 800; line-height: 1.1; margin-top: 6px; letter-spacing: -0.02em; }
  .card .pctline { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  .card.total .value   { color: #1d4ed8; }
  .card.passed .value  { color: #16a34a; }
  .card.failed .value  { color: #dc2626; }
  .card.skipped .value { color: #b45309; }

  /* Pass-rate bar */
  .rate { display: flex; align-items: center; gap: 14px; margin: 6px 0 30px; }
  .bar { flex: 1; display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: #e2e8f0; }
  .rate .pct { font-size: 14px; font-weight: 700; color: #0f172a; white-space: nowrap; }
  .rate .pct small { font-weight: 500; color: #94a3b8; }

  /* Results table */
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  caption { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  thead th {
    text-align: left; padding: 11px 14px; background: #f8fafc;
    border-bottom: 2px solid #e2e8f0; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em; color: #475569;
  }
  tbody td { padding: 12px 14px; border-bottom: 1px solid #eef2f6; vertical-align: top; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #eff6ff; }
  td.num { color: #94a3b8; width: 34px; font-variant-numeric: tabular-nums; }
  td.tc { width: 42%; }
  .tc-title { font-weight: 600; color: #0f172a; }
  .sev { display: inline-block; margin-top: 4px; font-size: 11px; font-weight: 600; color: #64748b; }
  td.dur { white-space: nowrap; color: #475569; font-variant-numeric: tabular-nums; }
  td.details { color: #475569; }
  .note { white-space: pre-wrap; }
  .muted { color: #cbd5e1; }
  .issue { display: inline-block; margin-top: 4px; font-size: 12px; font-weight: 600; color: #2563eb; text-decoration: none; }
  .issue:hover { text-decoration: underline; }
  td.empty { text-align: center; color: #94a3b8; padding: 32px; }
  .chip {
    display: inline-block; padding: 3px 12px; border-radius: 999px;
    font-size: 12px; font-weight: 700; white-space: nowrap;
  }

  /* Footer */
  .footer {
    border-top: 1px solid #e2e8f0; padding: 18px 36px;
    font-size: 11.5px; color: #94a3b8; background: #f8fafc;
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px;
  }

  /* Print — preserve colors, repeat headers, avoid awkward breaks. */
  @media print {
    @page { margin: 14mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: #fff; padding: 0; }
    .sheet { border: none; border-radius: 0; max-width: none; box-shadow: none; }
    .header { padding: 24px 28px; }
    .body { padding: 22px 28px; }
    .footer { padding: 14px 28px; }
    .summary { page-break-inside: avoid; break-inside: avoid; }
    .header, .rate { page-break-after: avoid; break-after: avoid; }
    thead { display: table-header-group; }      /* repeat headers on each page */
    tr { page-break-inside: avoid; break-inside: avoid; }
    tbody tr:hover { background: transparent; }  /* no hover state in print */
    tbody tr:nth-child(even) { background: #f8fafc; }
  }
</style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <p class="eyebrow">${escapeHtml(APP_NAME)} &middot; Test Report</p>
      <h1>${escapeHtml(report.suite_name) || 'Untitled Suite'}</h1>
      <p class="suite">Quality assurance summary for the test run below.</p>
      <div class="header-meta">
        <div class="item"><div class="k">Report ID</div><div class="v">#${escapeHtml(report.id)}</div></div>
        <div class="item"><div class="k">Suite</div><div class="v">${escapeHtml(report.suite_name) || '—'}</div></div>
        <div class="item"><div class="k">Run date</div><div class="v">${fmt(report.run_date)}</div></div>
        <div class="item"><div class="k">Generated</div><div class="v">${fmt(report.generated_at)}</div></div>
      </div>
    </header>

    <div class="body">
      <h2 class="section-title">Summary</h2>
      <section class="summary" aria-label="Result summary">
        <div class="card total">
          <div class="label">Total Tests</div>
          <div class="value">${escapeHtml(total)}</div>
          <div class="pctline">test cases</div>
        </div>
        <div class="card passed">
          <div class="label">Passed</div>
          <div class="value">${escapeHtml(report.passed_count)}</div>
          <div class="pctline">${pct(report.passed_count)}% of total</div>
        </div>
        <div class="card failed">
          <div class="label">Failed</div>
          <div class="value">${escapeHtml(report.failed_count)}</div>
          <div class="pctline">${pct(report.failed_count)}% of total</div>
        </div>
        <div class="card skipped">
          <div class="label">Skipped</div>
          <div class="value">${escapeHtml(report.skipped_count)}</div>
          <div class="pctline">${pct(report.skipped_count)}% of total</div>
        </div>
      </section>

      <div class="rate">
        <div class="bar" role="img" aria-label="${pct(report.passed_count)} percent passed, ${pct(report.failed_count)} percent failed, ${pct(report.skipped_count)} percent skipped">
          <div style="width:${pct(report.passed_count)}%;background:#16a34a"></div>
          <div style="width:${pct(report.failed_count)}%;background:#dc2626"></div>
          <div style="width:${pct(report.skipped_count)}%;background:#d97706"></div>
        </div>
        <div class="pct">${passRate}% <small>pass rate</small></div>
      </div>

      <h2 class="section-title">Detailed Results</h2>
      <table>
        <caption>Per-test-case results for ${escapeHtml(report.suite_name)}</caption>
        <thead>
          <tr>
            <th scope="col" class="num">#</th>
            <th scope="col">Test Case</th>
            <th scope="col">Status</th>
            <th scope="col">Duration</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          ${rows || emptyRow}
        </tbody>
      </table>
    </div>

    <footer class="footer">
      <span>Report #${escapeHtml(report.id)} &middot; Generated ${fmt(report.generated_at)}</span>
      <span>Self-contained report — no internet required${versionLine}</span>
    </footer>
  </main>
</body>
</html>`;
}

router.post('/',                  handleCreateReport);
router.get('/',                   handleListReports);
router.get('/:id',                handleGetReport);
router.get('/:id/export/html',    handleExportHtml);

module.exports = router;
