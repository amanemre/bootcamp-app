const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'testcases.db'));

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS test_cases (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT NOT NULL,
    preconditions  TEXT NOT NULL DEFAULT '',
    steps          TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    severity       TEXT NOT NULL CHECK(severity IN ('Critical','Major','Minor','Trivial')),
    status         TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Ready','Passed','Failed','Skipped')),
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS suites (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    feature    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Ready','In Progress','Passed','Failed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS suite_test_cases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id     INTEGER NOT NULL REFERENCES suites(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(suite_id, test_case_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity    TEXT NOT NULL CHECK(severity IN ('Critical','Major','Minor','Trivial')),
    priority    TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Critical','High','Medium','Low')),
    status      TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Resolved','Closed','Reopened')),
    steps       TEXT NOT NULL DEFAULT '[]',
    expected    TEXT NOT NULL DEFAULT '',
    actual      TEXT NOT NULL DEFAULT '',
    environment TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bug_activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id     INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    action     TEXT NOT NULL CHECK(action IN ('status_change','comment')),
    old_value  TEXT,
    new_value  TEXT,
    message    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: expand bug_activity.action to include 'field_change'
const activitySchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='bug_activity'").get();
if (activitySchema && !activitySchema.sql.includes('field_change')) {
  db.exec(`CREATE TABLE bug_activity_v2 (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id     INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    action     TEXT NOT NULL CHECK(action IN ('status_change','comment','field_change')),
    old_value  TEXT,
    new_value  TEXT,
    message    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec(`INSERT INTO bug_activity_v2 SELECT * FROM bug_activity`);
  db.exec(`DROP TABLE bug_activity`);
  db.exec(`ALTER TABLE bug_activity_v2 RENAME TO bug_activity`);
}

module.exports = db;
