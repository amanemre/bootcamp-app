const db = require('./db');
const { refreshStats } = require('./routes/flaky-tests');

module.exports = function seed() {
  // --- Test cases ---
  const { tcCount } = db.prepare('SELECT COUNT(*) as tcCount FROM test_cases').get();
  if (tcCount === 0) {
    const insert = db.prepare(`
      INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const cases = [
      [
        'Login with valid credentials',
        'A registered account exists with username "testuser" and password "ValidPass1".',
        JSON.stringify(['Navigate to the login page.', 'Enter "testuser" in the username field.', 'Enter "ValidPass1" in the password field.', 'Click the Submit button.']),
        'The user is authenticated and redirected to the dashboard. The username "testuser" appears in the top-right corner of the page.',
        'Critical', 'Ready',
      ],
      [
        'Login with invalid credentials',
        'A registered account exists. The login page is accessible.',
        JSON.stringify(['Navigate to the login page.', 'Enter a valid username in the username field.', 'Enter an incorrect password in the password field.', 'Click the Submit button.']),
        'The login attempt is rejected. An error message appears stating the credentials are incorrect. The user remains on the login page and no authenticated session is created.',
        'Critical', 'Ready',
      ],
      [
        'Filter test cases by status returns correct subset',
        'At least one test case exists for each status: Draft, Ready, Passed, Failed, Skipped.',
        JSON.stringify(['Navigate to the Test Cases page.', 'Click the Status filter dropdown.', 'Select "Passed".', 'Observe the table contents.']),
        'The table displays only test cases with a status of "Passed". Test cases with any other status are not visible.',
        'Minor', 'Draft',
      ],
      [
        'Search by title returns only matching test cases',
        'At least three test cases with distinct titles exist in the system.',
        JSON.stringify(['Navigate to the Test Cases page.', 'Type "login" in the search input field.', 'Observe the table contents.']),
        'The table displays only test cases whose titles contain "login". Test cases with unrelated titles are not shown.',
        'Major', 'Ready',
      ],
      [
        'Delete a test case removes it permanently',
        'At least one test case exists in the system.',
        JSON.stringify(['Navigate to the Test Cases page.', 'Locate any test case row.', 'Click the action menu icon on that row.', 'Select "Delete".', 'Confirm the deletion when prompted.']),
        'The test case is removed. It no longer appears in the table. The total count decreases by one.',
        'Major', 'Draft',
      ],
    ];
    for (const c of cases) insert.run(...c);
    console.log('Seeded 5 test cases.');
  }

  // --- Suites ---
  const { suiteCount } = db.prepare('SELECT COUNT(*) as suiteCount FROM suites').get();
  if (suiteCount === 0) {
    const getCase = title => db.prepare('SELECT id FROM test_cases WHERE title = ?').get(title);
    const tc1 = getCase('Login with valid credentials');
    const tc2 = getCase('Login with invalid credentials');
    const tc3 = getCase('Filter test cases by status returns correct subset');
    const tc4 = getCase('Search by title returns only matching test cases');
    const tc5 = getCase('Delete a test case removes it permanently');

    if (!tc1 || !tc2 || !tc3 || !tc4 || !tc5) {
      console.log('Skipping suite seed — test cases not found.');
      return;
    }

    const insertSuite = db.prepare('INSERT INTO suites (name, feature, status) VALUES (?, ?, ?)');
    const insertLink  = db.prepare('INSERT INTO suite_test_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)');

    const s1 = insertSuite.run('Authentication Suite', 'User Authentication', 'Ready');
    insertLink.run(s1.lastInsertRowid, tc1.id, 0);
    insertLink.run(s1.lastInsertRowid, tc2.id, 1);
    insertLink.run(s1.lastInsertRowid, tc4.id, 2);

    const s2 = insertSuite.run('Test Case Management Suite', 'Test Case Management', 'Draft');
    insertLink.run(s2.lastInsertRowid, tc3.id, 0);
    insertLink.run(s2.lastInsertRowid, tc4.id, 1);
    insertLink.run(s2.lastInsertRowid, tc5.id, 2);

    console.log('Seeded 2 suites.');
  }

  // --- Bugs ---
  const { bugCount } = db.prepare('SELECT COUNT(*) as bugCount FROM bugs').get();
  if (bugCount === 0) {
    const insertBug = db.prepare(`
      INSERT INTO bugs (title, description, severity, priority, status, steps, expected, actual, environment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertActivity = db.prepare(`
      INSERT INTO bug_activity (bug_id, action, old_value, new_value) VALUES (?, 'status_change', ?, ?)
    `);

    const b1 = insertBug.run(
      'Login page crashes on empty password submission',
      'Submitting the login form with a blank password field causes an unhandled server error instead of showing a validation message.',
      'Critical', 'Critical', 'Open',
      JSON.stringify(['Navigate to /login.', 'Leave the password field empty.', 'Enter any value in the username field.', 'Click Submit.']),
      'A validation error message appears: "Password is required." The form remains on the login page.',
      'A 500 Internal Server Error is returned. The page goes blank.',
      'Chrome 125 / macOS 15 / App v1.0.0'
    );

    const b2 = insertBug.run(
      'Status filter on /test-cases returns empty result for valid status',
      'Selecting "Passed" from the status filter dropdown on the Test Cases page returns zero results even when Passed test cases exist in the database.',
      'Major', 'High', 'In Progress',
      JSON.stringify(['Navigate to /test-cases.', 'Ensure at least one test case with status "Passed" exists.', 'Open the Status filter dropdown.', 'Select "Passed".']),
      'The table displays only test cases with status "Passed".',
      'The table shows "No test cases found." despite Passed records existing in the database.',
      'Firefox 127 / Windows 11 / App v1.0.0'
    );
    insertActivity.run(b2.lastInsertRowid, 'Open', 'In Progress');

    const b3 = insertBug.run(
      'Suite case count shows 0 after adding cases via AddCasesModal',
      'After successfully adding test cases to a suite through the AddCasesModal, the case count column on the /test-suites list page still shows 0 until a manual page refresh.',
      'Minor', 'Medium', 'Resolved',
      JSON.stringify(['Navigate to /test-suites.', 'Click a suite row to open the detail page.', 'Click "Add Cases".', 'Select two test cases and click "Add 2 Cases".', 'Navigate back to /test-suites.']),
      'The suite row displays a case count of 2 immediately after returning to the list.',
      'The suite row shows a case count of 0. The correct count appears only after a full page reload.',
      'Chrome 125 / macOS 15 / App v1.0.0'
    );
    insertActivity.run(b3.lastInsertRowid, 'Open', 'In Progress');
    insertActivity.run(b3.lastInsertRowid, 'In Progress', 'Resolved');

    console.log('Seeded 3 bugs.');
  }

  // --- Test Runs ---
  const { runCount } = db.prepare('SELECT COUNT(*) as runCount FROM test_runs_v2').get();
  if (runCount === 0) {
    const suite = db.prepare('SELECT id FROM suites LIMIT 1').get();
    if (!suite) { console.log('Skipping run seed — no suites found.'); return; }

    const cases = db.prepare(
      'SELECT stc.test_case_id FROM suite_test_cases stc WHERE stc.suite_id = ? ORDER BY stc.sort_order ASC'
    ).all(suite.id);
    if (cases.length === 0) { console.log('Skipping run seed — suite has no cases.'); return; }

    db.transaction(() => {
      const run = db.prepare(`
        INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
        VALUES (?, 'completed', 0, 0, 0, datetime('now', '-1 hour'), datetime('now', '-30 minutes'), 'demo')
      `).run(suite.id);
      const runId = run.lastInsertRowid;

      const RESULTS = ['passed', 'failed', 'skipped'];
      let passCount = 0, failCount = 0, skipCount = 0;
      cases.forEach((c, i) => {
        const result = RESULTS[i % 3];
        if (result === 'passed') passCount++;
        if (result === 'failed') failCount++;
        if (result === 'skipped') skipCount++;
        db.prepare(`
          INSERT INTO test_run_results (run_id, test_case_id, result, notes, duration_ms, failed_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          runId, c.test_case_id, result,
          result === 'failed'  ? 'Login form submitted without triggering client-side validation.' : '',
          result === 'skipped' ? null : 500 + (i * 800),
          result === 'failed'  ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null
        );
      });
      db.prepare('UPDATE test_runs_v2 SET pass_count=?, fail_count=?, skip_count=? WHERE id=?')
        .run(passCount, failCount, skipCount, runId);
    })();

    console.log('Seeded 1 test run.');
  }

  // --- Reports ---
  const { reportCount } = db.prepare('SELECT COUNT(*) as reportCount FROM reports').get();
  if (reportCount === 0) {
    // Snapshot the first completed run into a demo report.
    const run = db.prepare(`
      SELECT r.*, s.name as suite_name
      FROM test_runs_v2 r
      LEFT JOIN suites s ON s.id = r.suite_id
      ORDER BY r.id ASC LIMIT 1
    `).get();
    if (!run) { console.log('Skipping report seed — no runs found.'); return; }

    const rows = db.prepare(`
      SELECT rr.*, tc.title as case_title, tc.expected_result, tc.severity
      FROM test_run_results rr
      LEFT JOIN test_cases tc ON tc.id = rr.test_case_id
      WHERE rr.run_id = ?
      ORDER BY rr.id ASC
    `).all(run.id);

    const results = rows.map(r => ({
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

    db.prepare(`
      INSERT INTO reports (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id, run.suite_name ?? 'Unknown Suite', run.start_time,
      results.length, count('passed'), count('failed'), count('skipped'),
      JSON.stringify(results),
    );

    console.log('Seeded 1 report.');
  }

  seedFlaky();
};

function seedFlaky() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM test_case_stats').get();
  if (n > 0) return;

  // Five additional test cases for flakiness demonstration
  const insertTC = db.prepare(`
    INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tc6 = insertTC.run(
    'Concurrent login attempts fail under load',
    'A load-testing environment with at least 10 concurrent sessions is available.',
    JSON.stringify(['Start 10 concurrent login requests with valid credentials.', 'Observe the response for each session.']),
    'All 10 sessions receive a successful authentication response. No session receives a 500 or 429 error.',
    'Critical', 'Ready'
  );
  const tc7 = insertTC.run(
    'Search returns stale cache after update',
    'At least one test case exists. The search index has been populated.',
    JSON.stringify(['Create a new test case titled "Unique Cache Target".', 'Immediately search for "Unique Cache Target".', 'Observe search results.']),
    'The newly created test case appears in search results on the first query after creation.',
    'Major', 'Ready'
  );
  const tc8 = insertTC.run(
    'Session token expires during long test run',
    'A test run has been started. The session token TTL is set to 30 minutes.',
    JSON.stringify(['Start a test run with 20 test cases.', 'Wait 35 minutes without interacting with the UI.', 'Attempt to submit a result for the next test case.']),
    'The session is renewed automatically or a clear re-authentication prompt appears. The in-progress run is not lost.',
    'Major', 'Draft'
  );
  const tc9 = insertTC.run(
    'Export generates malformed CSV for special characters',
    'At least one test case with a title containing commas and quotes exists.',
    JSON.stringify(['Navigate to the Reports page.', 'Click "Export CSV" on any report.', 'Open the downloaded file in a spreadsheet application.']),
    'The CSV opens correctly. Each row maps to one report result. Fields containing commas or quotes are properly quoted and escaped.',
    'Minor', 'Draft'
  );
  const tc10 = insertTC.run(
    'Dashboard metrics refresh on navigation',
    'At least one completed test run exists with non-zero pass and fail counts.',
    JSON.stringify(['Navigate away from the Dashboard to any other page.', 'Navigate back to the Dashboard.', 'Observe the pass rate and run count metrics.']),
    'The Dashboard metrics reflect the current database state. Counts match the most recent completed run without requiring a manual page refresh.',
    'Minor', 'Ready'
  );

  const tc6id  = tc6.lastInsertRowid;
  const tc7id  = tc7.lastInsertRowid;
  const tc8id  = tc8.lastInsertRowid;
  const tc9id  = tc9.lastInsertRowid;
  const tc10id = tc10.lastInsertRowid;

  console.log('Seeded 5 flaky test cases.');

  // Flaky Validation Suite containing all 10 test cases
  const existingIds = db.prepare('SELECT id FROM test_cases ORDER BY id ASC').all().map(r => r.id);
  const insertSuite = db.prepare('INSERT INTO suites (name, feature, status) VALUES (?, ?, ?)');
  const insertLink  = db.prepare('INSERT OR IGNORE INTO suite_test_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)');

  const flakysuite = insertSuite.run('Flaky Validation Suite', 'Stability & Flakiness', 'In Progress');
  const fsid = flakysuite.lastInsertRowid;
  existingIds.forEach((tcid, i) => insertLink.run(fsid, tcid, i));

  console.log('Seeded Flaky Validation Suite.');

  // Result patterns: P=passed, F=failed
  const PATTERNS = {
    [existingIds[0]]: ['passed','passed','passed','passed','passed','failed','passed','passed','passed','passed','passed','passed'], // TC1 92% stable
    [existingIds[1]]: ['failed','passed','failed','failed','passed','failed','passed','failed','passed','failed','failed','passed'], // TC2 42% flaky
    [existingIds[2]]: ['failed','failed','passed','failed','failed','failed','passed','failed','failed','passed','failed','failed'], // TC3 25% flaky
    [existingIds[3]]: ['passed','failed','passed','passed','failed','passed','failed','passed','passed','failed','passed','failed'], // TC4 58% flaky
    [existingIds[4]]: ['passed','passed','passed','passed','failed','passed','passed','passed','failed','passed','passed','passed'], // TC5 83% unstable
    [tc6id]:  ['passed','failed','passed','failed','passed','failed','passed','failed','passed','failed','passed','failed'], // 50% flaky
    [tc7id]:  ['failed','failed','failed','passed','failed','failed','passed','failed','failed','failed','passed','failed'], // 25% flaky
    [tc8id]:  ['passed','passed','passed','passed','failed','passed','passed','passed','passed','passed','passed','failed'], // 83% unstable
    [tc9id]:  ['failed','failed','failed','failed','failed','failed','failed','failed','failed','failed','failed','passed'], // 8% unstable
    [tc10id]: ['failed','failed','passed','failed','passed','passed','passed','passed','passed','passed','passed','passed'], // 75% flaky
  };

  const FAILURE_NOTES = {
    [existingIds[1]]: 'Login form validation did not trigger on submit.',
    [existingIds[2]]: 'Filter returned empty result set despite matching records existing.',
    [existingIds[3]]: 'Search index returned stale results.',
    [tc6id]:  'Connection pool exhausted under concurrent load.',
    [tc7id]:  'Cache not invalidated after record creation.',
    [tc9id]:  'Special characters in title caused malformed CSV row.',
  };

  const insertRun    = db.prepare(`INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by) VALUES (?, 'completed', ?, ?, 0, datetime('now', ?), datetime('now', ?), 'flaky-seed')`);
  const insertResult = db.prepare(`INSERT INTO test_run_results (run_id, test_case_id, result, notes, duration_ms, failed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`);

  db.transaction(() => {
    for (let runIdx = 0; runIdx < 12; runIdx++) {
      const offsetHours = -(12 - runIdx) * 48;
      const startOffset = `-${Math.abs(offsetHours)} hours`;
      const endOffset   = `-${Math.abs(offsetHours) - 1} hours`;

      let pass = 0, fail = 0;
      for (const tcid of existingIds) {
        const res = PATTERNS[tcid]?.[runIdx] ?? 'passed';
        if (res === 'passed') pass++; else fail++;
      }

      const run = insertRun.run(fsid, pass, fail, startOffset, endOffset);
      const runId = run.lastInsertRowid;
      const createdOffset = `-${Math.abs(offsetHours)} hours`;

      for (const tcid of existingIds) {
        const res   = PATTERNS[tcid]?.[runIdx] ?? 'passed';
        const notes = res === 'failed' ? (FAILURE_NOTES[tcid] ?? '') : '';
        const failedAt = res === 'failed'
          ? new Date(Date.now() + offsetHours * 3600000).toISOString().replace('T', ' ').slice(0, 19)
          : null;
        insertResult.run(runId, tcid, res, notes, 400 + runIdx * 100, failedAt, createdOffset, createdOffset);
      }
    }
  })();

  console.log('Seeded 12 flaky test runs (120 results).');

  refreshStats();
  console.log('Computed initial flakiness stats.');
}
