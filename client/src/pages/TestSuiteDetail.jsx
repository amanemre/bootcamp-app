import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, GripVertical, X, Pencil, Trash2, Plus, Play } from 'lucide-react';
import SuiteModal from '../components/SuiteModal';
import AddCasesModal from '../components/AddCasesModal';

const SEVERITY_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#6b7280' },
};

const TC_STATUS_STYLES = {
  Draft:   { background: '#f3f4f6', color: '#6b7280' },
  Ready:   { background: '#dbeafe', color: '#1d4ed8' },
  Passed:  { background: '#dcfce7', color: '#16a34a' },
  Failed:  { background: '#fee2e2', color: '#dc2626' },
  Skipped: { background: '#f3e8ff', color: '#7e22ce' },
};

const SUITE_STATUS_STYLES = {
  Draft:          { background: '#f3f4f6', color: '#6b7280' },
  Ready:          { background: '#dbeafe', color: '#1d4ed8' },
  'In Progress':  { background: '#fef9c3', color: '#854d0e' },
  Passed:         { background: '#dcfce7', color: '#16a34a' },
  Failed:         { background: '#fee2e2', color: '#dc2626' },
};

function Badge({ value, map }) {
  const s = map[value] ?? { background: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>
      {value}
    </span>
  );
}

function SortableCase({ item, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px',
        background: isDragging ? '#eff6ff' : '#fff',
        border: `1px solid ${isDragging ? '#93c5fd' : '#e5e7eb'}`,
        borderRadius: 7,
        marginBottom: 6,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.1)' : 'none',
        userSelect: 'none',
      }}
    >
      <button
        {...attributes}
        {...listeners}
        style={{ background: 'none', border: 'none', cursor: 'grab', padding: '2px 4px', color: '#d1d5db', display: 'flex', flexShrink: 0, touchAction: 'none' }}
      >
        <GripVertical size={15} />
      </button>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.title}</span>
      <Badge value={item.severity} map={SEVERITY_STYLES} />
      <Badge value={item.status} map={TC_STATUS_STYLES} />
      <button
        onClick={() => onRemove(item.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '3px 5px', display: 'flex', borderRadius: 4, marginLeft: 4, flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function TestSuiteDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [suite,      setSuite]      = useState(null);
  const [cases,      setCases]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [notFound,   setNotFound]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [editOpen,    setEditOpen]    = useState(false);
  const [addOpen,     setAddOpen]     = useState(false);
  const [startingRun, setStartingRun] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchSuite = useCallback(async () => {
    setFetchError('');
    try {
      const res  = await fetch(`/api/suites/${id}`);
      const json = await res.json();
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!json.success) { setFetchError(json.error || 'Failed to load suite.'); setLoading(false); return; }
      setSuite(json.data);
      setCases(json.data.cases);
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSuite(); }, [fetchSuite]);

  async function saveCases(newCases, rollback) {
    setSaving(true);
    setSaveError('');
    const payload = newCases.map((c, i) => ({ test_case_id: c.id, sort_order: i }));
    try {
      const res  = await fetch(`/api/suites/${id}/cases`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: payload }),
      });
      const json = await res.json();
      if (json.success) {
        setCases(json.data);
      } else {
        setCases(rollback);
        setSaveError(json.error || 'Failed to save changes.');
      }
    } catch {
      setCases(rollback);
      setSaveError('Could not reach the server. Your change was not saved.');
    } finally {
      setSaving(false);
    }
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const from = cases.findIndex(c => c.id === active.id);
    const to   = cases.findIndex(c => c.id === over.id);
    const prev = cases;
    const next = arrayMove(cases, from, to);
    setCases(next);
    saveCases(next, prev);
  }

  function handleRemove(caseId) {
    const prev = cases;
    const next = cases.filter(c => c.id !== caseId);
    setCases(next);
    saveCases(next, prev);
  }

  function handleAddCases(selected) {
    const prev = cases;
    const next = [...cases, ...selected];
    setCases(next);
    saveCases(next, prev);
  }

  async function handleNewRun() {
    setStartingRun(true);
    setSaveError('');
    try {
      const res  = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite_id: Number(id) }),
      });
      const json = await res.json();
      if (json.success) navigate(`/test-runs/${json.data.id}`);
      else setSaveError(json.error || 'Failed to start run.');
    } catch {
      setSaveError('Could not reach the server.');
    } finally {
      setStartingRun(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this suite? This cannot be undone.')) return;
    try {
      const res  = await fetch(`/api/suites/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        navigate('/test-suites');
      } else {
        setSaveError(json.error || 'Failed to delete suite.');
      }
    } catch {
      setSaveError('Could not reach the server. The suite was not deleted.');
    }
  }

  if (loading)   return <div style={{ padding: '48px 32px', textAlign: 'center', color: '#9ca3af' }}>Loading…</div>;
  if (notFound)  return <div style={{ padding: '48px 32px', textAlign: 'center', color: '#9ca3af' }}>Suite not found.</div>;
  if (fetchError) return (
    <div style={{ padding: '48px 32px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px 18px', borderRadius: 6, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{fetchError}</span>
        <button onClick={fetchSuite} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 860, margin: '0 auto' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/test-suites')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: 0, marginBottom: 22 }}
      >
        <ArrowLeft size={15} /> Back to Test Suites
      </button>

      {/* Suite header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>{suite.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Feature: <strong style={{ color: '#374151' }}>{suite.feature}</strong></span>
            <Badge value={suite.status} map={SUITE_STATUS_STYLES} />
            {saving && <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Saving…</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleNewRun}
            disabled={startingRun || cases.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: 'none', background: cases.length > 0 ? '#16a34a' : '#d1d5db', color: '#fff', cursor: cases.length > 0 ? 'pointer' : 'default', fontSize: 14, fontWeight: 600, opacity: startingRun ? 0.7 : 1 }}
            title={cases.length === 0 ? 'Add cases to this suite before starting a run' : 'Start a new test run'}
          >
            <Play size={13} /> {startingRun ? 'Starting…' : 'New Run'}
          </button>
          <button
            onClick={() => setEditOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 14 }}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={handleDelete}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {saveError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 20, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{saveError}</span>
          <button onClick={() => setSaveError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Cases header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Test Cases{' '}
          <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 14 }}>({cases.length})</span>
        </h2>
        <button
          onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Plus size={14} /> Add Cases
        </button>
      </div>

      {/* Empty state */}
      {cases.length === 0 && (
        <div style={{ padding: '44px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14, border: '2px dashed #e5e7eb', borderRadius: 8 }}>
          No test cases in this suite. Click "Add Cases" to get started.
        </div>
      )}

      {/* Sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cases.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cases.map(c => (
            <SortableCase key={c.id} item={c} onRemove={handleRemove} />
          ))}
        </SortableContext>
      </DndContext>

      {cases.length > 0 && (
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>Drag rows to reorder. Changes save automatically.</p>
      )}

      {editOpen && (
        <SuiteModal
          initialData={suite}
          onClose={() => setEditOpen(false)}
          onSaved={async updated => { setSuite(prev => ({ ...prev, ...updated })); setEditOpen(false); }}
        />
      )}

      {addOpen && (
        <AddCasesModal
          currentCaseIds={cases.map(c => c.id)}
          onClose={() => setAddOpen(false)}
          onAdd={selected => { setAddOpen(false); handleAddCases(selected); }}
        />
      )}
    </div>
  );
}
