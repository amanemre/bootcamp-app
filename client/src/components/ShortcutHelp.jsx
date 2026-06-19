import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { groupByCategory, describeKeys } from '../shortcuts/registry';

// Renders the keys of one shortcut as <kbd> chips. Sequences ("G then B")
// show a "then" separator; chords ("⌘ K") sit side by side.
function Keys({ shortcut }) {
  const { tokens, isSequence } = describeKeys(shortcut);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {tokens.map((t, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {i > 0 && isSequence && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>then</span>}
          <kbd style={kbd}>{t}</kbd>
        </span>
      ))}
    </span>
  );
}

export default function ShortcutHelp({ open, onClose }) {
  const closeRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement;
      const t = setTimeout(() => closeRef.current?.focus(), 0);
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
      window.addEventListener('keydown', onKey);
      return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current.focus?.();
      restoreFocusRef.current = null;
    }
  }, [open, onClose]);

  if (!open) return null;
  const groups = groupByCategory();

  return (
    <div onMouseDown={onClose} style={overlay} role="presentation">
      <div
        onMouseDown={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="shortcuts-title"
        style={panel}
      >
        <div style={header}>
          <h2 id="shortcuts-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Keyboard shortcuts</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" style={closeBtn}><X size={18} /></button>
        </div>

        <div style={body}>
          {groups.map(({ category, items }) => (
            <div key={category} style={{ marginBottom: 18 }}>
              <div style={catHeader}>{category}</div>
              {items.map(s => (
                <div key={s.id} style={rowStyle}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{s.description}</span>
                  <Keys shortcut={s} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const overlay  = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 2000 };
const panel    = { width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', overflow: 'hidden' };
const header   = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' };
const closeBtn = { display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 };
const body     = { padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' };
const catHeader = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', marginBottom: 8 };
const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '7px 0' };
const kbd      = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, padding: '0 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface-alt)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' };
