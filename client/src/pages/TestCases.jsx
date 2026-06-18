import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Download, Pencil, Trash2, MoreVertical, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import TestCaseModal from '../components/TestCaseModal';

const SEVERITY_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#6b7280' },
};

const STATUS_STYLES = {
  Draft:   { background: '#f3f4f6', color: '#6b7280' },
  Ready:   { background: '#dbeafe', color: '#1d4ed8' },
  Passed:  { background: '#dcfce7', color: '#16a34a' },
  Failed:  { background: '#fee2e2', color: '#dc2626' },
  Skipped: { background: '#f3e8ff', color: '#7e22ce' },
};

function Badge({ value, map }) {
  const s = map[value] ?? { background: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>
      {value}
    </span>
  );
}

function SortIcon({ field, sort, order }) {
  if (sort !== field) return <ChevronsUpDown size={13} style={{ opacity: 0.35, marginLeft: 4 }} />;
  const Icon = order === 'asc' ? ChevronUp : ChevronDown;
  return <Icon size={13} style={{ marginLeft: 4 }} />;
}

function formatDate(str) {
  const d = new Date(str.replace(' ', 'T') + 'Z');
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return `${date} ${time}`;
}

export default function TestCases() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('updated_at');
  const [order, setOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, sort, order });
    if (statusFilter) params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    try {
      const res = await fetch(`/api/test-cases?${params}`);
      const json = await res.json();
      if (json.success) { setItems(json.data.items); setTotal(json.data.total); }
    } finally {
      setLoading(false);
    }
  }, [page, sort, order, statusFilter, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  function toggleSort(field) {
    if (sort === field) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setOrder('desc'); }
    setPage(1);
  }

  // Export the current filtered set (all matching rows, not just this page).
  // The server sets the filename; an anchor download respects it.
  function handleExport() {
    const params = new URLSearchParams({ sort, order });
    if (statusFilter)    params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const a = document.createElement('a');
    a.href = `/api/test-cases/export?${params}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this test case? This cannot be undone.')) return;
    setOpenMenuId(null);
    await fetch(`/api/test-cases/${id}`, { method: 'DELETE' });
    fetchData();
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Test Cases</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExport}
            title="Export the current filtered set to CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            <Download size={15} /> Download CSV
          </button>
          <button
            onClick={() => navigate('/test-cases/import')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            <Upload size={15} /> Import CSV
          </button>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            <Plus size={15} /> New Test Case
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by title…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, minWidth: 160, background: '#fff' }}
        >
          <option value="">All Statuses</option>
          {['Draft', 'Ready', 'Passed', 'Failed', 'Skipped'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Title</th>
              <th style={{ ...th, width: 120, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('severity')}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Severity <SortIcon field="severity" sort={sort} order={order} /></span>
              </th>
              <th style={{ ...th, width: 105 }}>Status</th>
              <th style={{ ...th, width: 195, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('updated_at')}>
                <span style={{ display: 'flex', alignItems: 'center' }}>Updated <SortIcon field="updated_at" sort={sort} order={order} /></span>
              </th>
              <th style={{ ...th, width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No test cases found.</td></tr>
            )}
            {!loading && items.map((item, i) => {
              const openUpward = i >= items.length - 2;
              return (
                <tr
                  key={item.id}
                  onClick={() => { setEditTarget(item); setModalOpen(true); }}
                  style={{ background: i % 2 ? '#fafafa' : '#fff', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                >
                  <td style={td}>{item.title}</td>
                  <td style={td}><Badge value={item.severity} map={SEVERITY_STYLES} /></td>
                  <td style={td}><Badge value={item.status} map={STATUS_STYLES} /></td>
                  <td style={{ ...td, color: '#9ca3af', fontSize: 13 }}>{formatDate(item.updated_at)}</td>
                  <td style={{ ...td, position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#9ca3af', borderRadius: 4, display: 'flex' }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === item.id && (
                      <div style={{ position: 'absolute', right: 8, zIndex: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 130, overflow: 'hidden', ...(openUpward ? { bottom: 36 } : { top: 36 }) }}>
                        <button onClick={() => { setEditTarget(item); setModalOpen(true); setOpenMenuId(null); }} style={menuItem}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => handleDelete(item.id)} style={{ ...menuItem, color: '#dc2626' }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13, color: '#6b7280' }}>
        <span>{total} test case{total !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtn(page <= 1)}>← Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtn(page >= totalPages)}>Next →</button>
        </div>
      </div>

      {modalOpen && (
        <TestCaseModal
          initialData={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSaved={() => { setModalOpen(false); setEditTarget(null); fetchData(); }}
        />
      )}
    </div>
  );
}

const th = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#374151' };
const td = { padding: '12px 16px', verticalAlign: 'middle' };
const menuItem = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' };
function pageBtn(disabled) {
  return { padding: '5px 12px', borderRadius: 5, border: '1px solid #d1d5db', background: disabled ? '#f9fafb' : '#fff', color: disabled ? '#d1d5db' : '#374151', cursor: disabled ? 'default' : 'pointer', fontSize: 13 };
}
