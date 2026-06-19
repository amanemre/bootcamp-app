// ── Single source of truth for keyboard shortcuts ──────────────────────────
// Both the global key handler (ShortcutsProvider) and the help modal render
// from this list, so they can never drift out of sync. To add a shortcut,
// add one entry here — nothing else needs to change.
//
// keys:    array describing the trigger.
//          ['mod','k']  → Cmd+K (mac) / Ctrl+K (win/linux)  — a modifier chord
//          ['g','b']    → press G then B                     — a sequence
//          ['?']        → a single key
// action:  { type: 'command', command: 'openSearch' | 'openHelp' }
//          { type: 'navigate', to: '/path' }

export const SHORTCUTS = [
  {
    id: 'search',
    keys: ['mod', 'k'],
    category: 'General',
    description: 'Open quick search',
    action: { type: 'command', command: 'openSearch' },
  },
  {
    id: 'help',
    keys: ['?'],
    category: 'General',
    description: 'Show keyboard shortcuts',
    action: { type: 'command', command: 'openHelp' },
  },
  {
    id: 'nav-dashboard',
    keys: ['g', 'd'],
    category: 'Navigation',
    description: 'Go to Dashboard',
    action: { type: 'navigate', to: '/' },
  },
  {
    id: 'nav-bugs',
    keys: ['g', 'b'],
    category: 'Navigation',
    description: 'Go to Bugs',
    action: { type: 'navigate', to: '/bugs' },
  },
  {
    id: 'nav-test-cases',
    keys: ['g', 't'],
    category: 'Navigation',
    description: 'Go to Test Cases',
    action: { type: 'navigate', to: '/test-cases' },
  },
  {
    id: 'nav-test-runs',
    keys: ['g', 'r'],
    category: 'Navigation',
    description: 'Go to Test Runs',
    action: { type: 'navigate', to: '/test-runs' },
  },
];

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

// Human-readable key tokens for display in the help modal / hints.
function displayToken(token) {
  switch (token) {
    case 'mod':   return IS_MAC ? '⌘' : 'Ctrl';
    case 'shift': return IS_MAC ? '⇧' : 'Shift';
    case 'enter': return 'Enter';
    case 'esc':   return 'Esc';
    default:      return token.length === 1 ? token.toUpperCase() : token;
  }
}

// Returns the keys as display tokens plus whether it's a "then" sequence
// (G then B) vs a chord (Cmd+K). Used by the help modal to render <kbd>s.
export function describeKeys(shortcut) {
  const tokens = shortcut.keys.map(displayToken);
  const isSequence = shortcut.keys.length > 1 && shortcut.keys[0] !== 'mod' && shortcut.keys[0] !== 'shift';
  return { tokens, isSequence };
}

export function groupByCategory(shortcuts = SHORTCUTS) {
  const groups = {};
  for (const s of shortcuts) (groups[s.category] ??= []).push(s);
  return Object.entries(groups).map(([category, items]) => ({ category, items }));
}
