import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Bug, Layers, PlayCircle, CornerDownLeft } from 'lucide-react';

// Result groups → display label, icon, and the route each item opens.
const GROUPS = [
  { key: 'testCases', label: 'Test Cases',  icon: FileText,   to: () => '/test-cases' },
  { key: 'bugs',      label: 'Bugs',         icon: Bug,        to: it => `/bugs/${it.id}` },
  { key: 'suites',    label: 'Test Suites',  icon: Layers,     to: it => `/test-suites/${it.id}` },
  { key: 'runs',      label: 'Test Runs',    icon: PlayCircle, to: it => `/test-runs/${it.id}` },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef  = useRef(null);
  const restoreFocusRef = useRef(null);

  const [query, setQuery]   = useState('');
  const [data, setData]     = useState(null);   // { testCases, bugs, suites, runs }
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  // Flatten grouped results into one ordered list for arrow navigation.
  const flat = useMemo(() => {
    if (!data) return [];
    const out = [];
    for (const g of GROUPS) {
      for (const item of (data[g.key] || [])) out.push({ group: g, item, to: g.to(item) });
    }
    return out;
  }, [data]);

  // On open: reset, remember focus, focus the input. On close: restore focus.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement;
      setQuery(''); setData(null); setActive(0); setLoading(false);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current.focus?.();
      restoreFocusRef.current = null;
    }
  }, [open]);

  // Debounced search with stale-response cancellation.
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (!term) { setData(null); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.success) { setData(json.data); setActive(0); }
      } catch (e) {
        if (e.name !== 'AbortError') setData({ testCases: [], bugs: [], suites: [], runs: [] });
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open]);

  // Keep the active row scrolled into view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  const selectAt = (i) => {
    const entry = flat[i];
    if (!entry) return;
    onClose();
    navigate(entry.to);
  };

  function onKeyDown(e) {
    if (e.key === 'Escape')      { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, Math.max(flat.length - 1, 0))); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); selectAt(active); }
  }

  const term = query.trim();
  const hasResults = flat.length > 0;
  let runningIndex = -1;   // global index across groups for arrow nav

  return (
    <div onMouseDown={onClose} style={overlay} role="presentation">
      <div
        onMouseDown={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Quick search"
        style={panel}
      >
        <div style={inputRow}>
          <Search size={18} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search test cases, bugs, suites, runs…"
            aria-label="Search query"
            aria-controls="cmdk-results"
            style={input}
          />
          {loading && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Searching…</span>}
        </div>

        <div ref={listRef} id="cmdk-results" role="listbox" aria-label="Search results" style={results}>
          {!term && (
            <div style={hint}>Type to search across test cases, bugs, suites, and runs.</div>
          )}
          {term && !loading && !hasResults && (
            <div style={hint}>No results for “{term}”.</div>
          )}
          {term && hasResults && GROUPS.map(g => {
            const items = data?.[g.key] || [];
            if (!items.length) return null;
            const Icon = g.icon;
            return (
              <div key={g.key} role="group" aria-label={g.label}>
                <div style={groupHeader}>{g.label}</div>
                {items.map(item => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isActive = idx === active;
                  return (
                    <div
                      key={`${g.key}-${item.id}`}
                      role="option" aria-selected={isActive} data-active={isActive}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => selectAt(idx)}
                      style={{ ...row, background: isActive ? 'var(--surface-hover)' : 'transparent' }}
                    >
                      <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                      <span style={{ color: 'var(--text-faint)', fontSize: 12, flexShrink: 0 }}>{item.subtitle}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={footer}>
          <span style={hintKey}><kbd style={kbd}>↑</kbd><kbd style={kbd}>↓</kbd> navigate</span>
          <span style={hintKey}><kbd style={kbd}><CornerDownLeft size={11} /></kbd> open</span>
          <span style={hintKey}><kbd style={kbd}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', zIndex: 2000 };
const panel   = { width: '100%', maxWidth: 600, margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '70vh' };
const inputRow = { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' };
const input   = { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--text)' };
const results = { overflowY: 'auto', padding: '6px 0', flex: 1 };
const groupHeader = { padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)' };
const row     = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer' };
const hint    = { padding: '28px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 };
const footer  = { display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-alt)' };
const hintKey = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' };
const kbd     = { display: 'inline-flex', alignItems: 'center', minWidth: 18, height: 18, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, color: 'var(--text-secondary)' };
