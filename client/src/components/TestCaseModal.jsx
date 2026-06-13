import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BLANK = { title: '', preconditions: '', steps: '', expected_result: '', severity: 'Major', status: 'Draft' };

export default function TestCaseModal({ initialData, onClose, onSaved }) {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialData ? { ...initialData, steps: initialData.steps.join('\n') } : BLANK);
    setErrors({});
    setServerError('');
  }, [initialData]);

  const set = field => e => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const steps = form.steps.split('\n').map(s => s.trim()).filter(Boolean);

    const next = {};
    if (!form.title.trim())       next.title = 'Title is required.';
    if (!steps.length)            next.steps = 'At least one step is required.';
    if (!form.expected_result.trim()) next.expected_result = 'Expected result is required.';
    if (!form.severity)           next.severity = 'Severity is required.';

    if (Object.keys(next).length) { setErrors(next); return; }

    setSaving(true);
    setServerError('');
    try {
      const res = await fetch(
        initialData ? `/api/test-cases/${initialData.id}` : '/api/test-cases',
        {
          method: initialData ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, steps, title: form.title.trim(), expected_result: form.expected_result.trim() }),
        }
      );
      const json = await res.json();
      if (!json.success) { setServerError(json.error); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {initialData ? 'Edit Test Case' : 'New Test Case'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {serverError && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Title *" error={errors.title}>
            <input value={form.title} onChange={set('title')} style={fieldInp(errors.title)} placeholder="Concise, action-oriented title" />
          </Field>

          <Field label="Preconditions">
            <textarea value={form.preconditions} onChange={set('preconditions')} rows={3} style={fieldInp()}
              placeholder="State or data required before this test runs (optional)" />
          </Field>

          <Field label="Steps * — one per line" error={errors.steps}>
            <textarea value={form.steps} onChange={set('steps')} rows={5} style={fieldInp(errors.steps)}
              placeholder={"Navigate to the login page.\nEnter a valid username.\nClick the Submit button."} />
          </Field>

          <Field label="Expected Result *" error={errors.expected_result}>
            <textarea value={form.expected_result} onChange={set('expected_result')} rows={4} style={fieldInp(errors.expected_result)}
              placeholder="Describe the specific, observable outcome — avoid vague language like 'works correctly'." />
          </Field>

          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Severity *" flex error={errors.severity}>
              <select value={form.severity} onChange={set('severity')} style={fieldInp(errors.severity)}>
                {['Critical', 'Major', 'Minor', 'Trivial'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Status" flex>
              <select value={form.status} onChange={set('status')} style={fieldInp()}>
                {['Draft', 'Ready', 'Passed', 'Failed', 'Skipped'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : initialData ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, flex, error }) {
  return (
    <div style={{ marginBottom: 14, flex: flex ? 1 : undefined }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

function fieldInp(error) {
  return { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' };
}
