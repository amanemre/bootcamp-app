import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BLANK    = { name: '', feature: '', status: 'Draft' };
const STATUSES = ['Draft', 'Ready', 'In Progress', 'Passed', 'Failed'];

export default function SuiteModal({ initialData, onClose, onSaved }) {
  const [form,        setForm]        = useState(BLANK);
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState('');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    setForm(initialData
      ? { name: initialData.name, feature: initialData.feature, status: initialData.status }
      : BLANK
    );
    setErrors({});
    setServerError('');
  }, [initialData]);

  const set = field => e => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim())    next.name    = 'Name is required.';
    if (!form.feature.trim()) next.feature = 'Feature is required.';
    if (Object.keys(next).length) { setErrors(next); return; }

    setSaving(true);
    setServerError('');
    try {
      const res  = await fetch(
        initialData ? `/api/suites/${initialData.id}` : '/api/suites',
        {
          method: initialData ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, name: form.name.trim(), feature: form.feature.trim() }),
        }
      );
      const json = await res.json();
      if (!json.success) { setServerError(json.error); return; }
      onSaved(json.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 10, width: '100%', maxWidth: 460, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {initialData ? 'Edit Suite' : 'New Suite'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {serverError && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Name *" error={errors.name}>
            <input value={form.name} onChange={set('name')} style={fieldInp(errors.name)} placeholder="e.g. Authentication Suite" />
          </Field>
          <Field label="Feature *" error={errors.feature}>
            <input value={form.feature} onChange={set('feature')} style={fieldInp(errors.feature)} placeholder="e.g. User Authentication" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')} style={fieldInp()}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : initialData ? 'Save Changes' : 'Create Suite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

function fieldInp(error) {
  return { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
}
