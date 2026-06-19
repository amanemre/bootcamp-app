import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const PAGE_SIZES = [10, 20, 50, 100];
const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
];

const browserTz = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
})();
const TZ_OPTIONS = (() => {
  let list = [];
  try { if (typeof Intl.supportedValuesOf === 'function') list = Intl.supportedValuesOf('timeZone'); } catch { /* ignore */ }
  if (!list.length) list = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Istanbul', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
  if (!list.includes(browserTz)) list = [browserTz, ...list];
  return list;
})();

// Current GMT offset label for a timezone, e.g. "GMT+1", "GMT-5", "GMT".
function tzOffset(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const o = parts.find(p => p.type === 'timeZoneName');
    return o ? o.value : '';
  } catch { return ''; }
}
function tzLabel(tz) {
  const off = tzOffset(tz);
  const base = off ? `${tz} (${off})` : tz;
  return tz === browserTz ? `${base} · device` : base;
}

export default function Settings() {
  const { settings, loading, updateSettings, resolvedTheme } = useSettings();
  const dark = resolvedTheme === 'dark';

  const [form,   setForm]   = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  // Sync the local form whenever the persisted settings load/change.
  useEffect(() => { setForm(settings); }, [settings]);

  function field(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    try {
      await updateSettings({
        theme: form.theme,
        default_severity_for_new_bugs: form.default_severity_for_new_bugs,
        default_page_size: Number(form.default_page_size),
        timezone: form.timezone || browserTz,
        auto_generate_report_after_run: !!form.auto_generate_report_after_run,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  const headingColor = dark ? '#f8fafc' : '#111827';
  const subColor     = dark ? '#94a3b8' : '#6b7280';

  if (loading) {
    return <main style={{ padding: '48px 32px', textAlign: 'center', color: subColor }}>Loading settings…</main>;
  }

  const tzValue = form.timezone || browserTz;

  return (
    <main style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: headingColor }}>Settings</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: subColor }}>Preferences are saved to your account and applied across the app.</p>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      <Group title="Appearance" desc="Choose how the app looks. System follows your device setting.">
        <Row label="Theme" htmlFor="setting-theme">
          <Select id="setting-theme" value={form.theme} onChange={v => field('theme', v)}
            options={THEMES.map(t => ({ value: t.value, label: t.label }))} />
        </Row>
      </Group>

      <Group title="Bug defaults" desc="Defaults applied when creating a new bug.">
        <Row label="Default severity for new bugs" htmlFor="setting-default-severity">
          <Select id="setting-default-severity" value={form.default_severity_for_new_bugs} onChange={v => field('default_severity_for_new_bugs', v)}
            options={SEVERITIES.map(s => ({ value: s, label: s }))} />
        </Row>
      </Group>

      <Group title="Display" desc="How many rows list pages show per page.">
        <Row label="Default page size" htmlFor="setting-page-size">
          <Select id="setting-page-size" value={String(form.default_page_size)} onChange={v => field('default_page_size', Number(v))}
            options={PAGE_SIZES.map(n => ({ value: String(n), label: `${n} per page` }))} />
        </Row>
      </Group>

      <Group title="Localization" desc="Used when displaying dates and times.">
        <Row label="Timezone" htmlFor="setting-timezone">
          <Select id="setting-timezone" value={tzValue} onChange={v => field('timezone', v)}
            options={TZ_OPTIONS.map(tz => ({ value: tz, label: tzLabel(tz) }))} />
        </Row>
      </Group>

      <Group title="Automation" desc="Reduce manual steps after a test run completes.">
        <Row label="Auto-generate a report after each run">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={!!form.auto_generate_report_after_run}
              onChange={e => field('auto_generate_report_after_run', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            {form.auto_generate_report_after_run ? 'Enabled' : 'Disabled'}
          </label>
        </Row>
      </Group>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: saving ? 'default' : 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#16a34a', fontSize: 14, fontWeight: 600 }}>
            <Check size={16} /> Saved
          </span>
        )}
      </div>
    </main>
  );
}

function Group({ title, desc, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
      <h2 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
      {desc && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>{desc}</p>}
      {children}
    </div>
  );
}

function Row({ label, htmlFor, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <label htmlFor={htmlFor} style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function Select({ id, value, onChange, options }) {
  return (
    <select id={id} value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, minWidth: 200, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
