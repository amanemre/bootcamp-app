import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

const SEVERITY_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#4b5563' },
};

function Badge({ value }) {
  const s = SEVERITY_STYLES[value] ?? { background: '#f3f4f6', color: '#4b5563' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>
      {value}
    </span>
  );
}

export default function AddCasesModal({ currentCaseIds, onClose, onAdd }) {
  const [allCases, setAllCases] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/test-cases?page=1')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setAllCases(json.data.items.filter(tc => !currentCaseIds.includes(tc.id)));
        }
        setLoading(false);
      });
  }, []);

  const filtered = allCases.filter(tc =>
    tc.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAdd() {
    onAdd(allCases.filter(tc => selected.has(tc.id)));
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 14px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add Test Cases</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title…"
              autoFocus
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {loading && (
            <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>Loading…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24, fontSize: 14 }}>
              {allCases.length === 0
                ? 'All test cases are already in this suite.'
                : 'No test cases match your search.'}
            </p>
          )}
          {filtered.map(tc => (
            <div
              key={tc.id}
              onClick={() => toggle(tc.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                background: selected.has(tc.id) ? 'var(--surface-hover)' : 'transparent',
                border: `1px solid ${selected.has(tc.id) ? '#93c5fd' : 'transparent'}`,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(tc.id)}
                onChange={() => toggle(tc.id)}
                onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, cursor: 'pointer', width: 15, height: 15 }}
              />
              <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{tc.title}</span>
              <Badge value={tc.severity} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selected.size > 0 ? `${selected.size} selected` : 'Select cases to add'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0}
              style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: selected.size > 0 ? '#2563eb' : '#bfdbfe', color: '#fff', fontWeight: 600, fontSize: 14, cursor: selected.size > 0 ? 'pointer' : 'default' }}
            >
              Add {selected.size > 0 ? `${selected.size} Case${selected.size !== 1 ? 's' : ''}` : 'Cases'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
