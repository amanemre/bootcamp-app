import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SHORTCUTS, IS_MAC } from '../shortcuts/registry';
import CommandPalette from '../components/CommandPalette';
import ShortcutHelp from '../components/ShortcutHelp';

const ShortcutsContext = createContext(null);

const SEQUENCE_TIMEOUT = 1000; // ms allowed between the two keys of a sequence

// Focus is in a field where the user is typing — shortcuts must not fire.
function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest && el.closest('[contenteditable="true"], [role="textbox"]')) return true;
  return false;
}

// Pre-compute lookups from the registry (source of truth).
const CHORDS    = SHORTCUTS.filter(s => s.keys[0] === 'mod');                 // e.g. Cmd/Ctrl+K
const SINGLES   = SHORTCUTS.filter(s => s.keys.length === 1 && s.keys[0] !== 'mod'); // e.g. ?
const SEQUENCES = SHORTCUTS.filter(s => s.keys.length === 2 && s.keys[0] !== 'mod'); // e.g. g d

export function ShortcutsProvider({ children }) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen]       = useState(false);

  // Refs so the single listener always sees current state without re-binding.
  const stateRef = useRef({ paletteOpen, helpOpen });
  stateRef.current = { paletteOpen, helpOpen };
  const pendingRef = useRef(null);          // first key of a sequence
  const pendingTimer = useRef(null);

  const clearPending = () => {
    pendingRef.current = null;
    if (pendingTimer.current) { clearTimeout(pendingTimer.current); pendingTimer.current = null; }
  };

  const runAction = useCallback((action) => {
    if (action.type === 'navigate') {
      setPaletteOpen(false); setHelpOpen(false);
      navigate(action.to);
    } else if (action.type === 'command') {
      if (action.command === 'openSearch') { setHelpOpen(false); setPaletteOpen(o => !o); }
      if (action.command === 'openHelp')   { setPaletteOpen(false); setHelpOpen(o => !o); }
    }
  }, [navigate]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.repeat) return;
      const modPressed = IS_MAC ? e.metaKey : e.ctrlKey;
      const key = (e.key || '').toLowerCase();
      const editable = isEditableTarget(e.target) || isEditableTarget(document.activeElement);

      // 1) Modifier chords (Cmd/Ctrl+K) — allowed even while typing in a field.
      for (const s of CHORDS) {
        if (modPressed && !e.altKey && key === s.keys[1]) {
          e.preventDefault();
          clearPending();
          runAction(s.action);
          return;
        }
      }

      // Everything below is a plain-key shortcut: never fire while typing,
      // while a modifier is held, or while a shortcut modal is open.
      if (editable || e.metaKey || e.ctrlKey || e.altKey) { clearPending(); return; }
      if (stateRef.current.paletteOpen || stateRef.current.helpOpen) return;

      // 2) Continue a pending sequence (e.g. after 'g', expect 'd'/'b'/'t'/'r').
      if (pendingRef.current) {
        const first = pendingRef.current;
        clearPending();
        const match = SEQUENCES.find(s => s.keys[0] === first && s.keys[1] === key);
        if (match) { e.preventDefault(); runAction(match.action); return; }
        // fall through: this key might itself start something
      }

      // 3) Single-key shortcuts (e.g. '?'). Compare against the raw key too,
      //    since '?' is Shift+/ and key === '?'.
      const single = SINGLES.find(s => s.keys[0] === e.key || s.keys[0] === key);
      if (single) { e.preventDefault(); runAction(single.action); return; }

      // 4) Start a sequence if this key is the first key of any sequence.
      if (SEQUENCES.some(s => s.keys[0] === key)) {
        pendingRef.current = key;
        pendingTimer.current = setTimeout(clearPending, SEQUENCE_TIMEOUT);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); clearPending(); };
  }, [runAction]);

  const value = {
    openSearch: () => { setHelpOpen(false); setPaletteOpen(true); },
    openHelp:   () => { setPaletteOpen(false); setHelpOpen(true); },
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) throw new Error('useShortcuts must be used within a ShortcutsProvider');
  return ctx;
}
