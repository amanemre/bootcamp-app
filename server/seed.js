const db = require('./db');

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
};
