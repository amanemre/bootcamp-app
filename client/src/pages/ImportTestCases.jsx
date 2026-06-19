import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const SEVERITY_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#4b5563' },
};

function Badge({ value, map }) {
  if (!value) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  const s = map[value] ?? { background: '#f3f4f6', color: '#4b5563' };
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>{value}</span>;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;   // 2 MB — matches the server body limit

const TEMPLATE = [
  'title,severity,steps,expected_result,preconditions,status',
  '"Login with valid credentials",Critical,"Open login page|Enter username|Enter password|Click Submit","User lands on the dashboard and sees their name","A registered account exists",Ready',
  '"Reject empty password",Major,"Open login page|Leave password blank|Click Submit","A validation message reading Password is required appears",,Draft',
].join('\n');

export default function ImportTestCases() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [csvText,  setCsvText]  = useState('');
  const [preview,  setPreview]  = useState(null);   // { ignoredColumns, rows, summary }
  const [result,   setResult]   = useState(null);   // { imported, skipped }
  const [phase,    setPhase]    = useState('idle');  // idle | parsing | committing
  const [error,    setError]    = useState('');

  function reset() {
    setFileName(''); setCsvText(''); setPreview(null); setResult(null); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setPreview(null); setResult(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result || ''); setCsvText(text); runPreview(text); };
    reader.onerror = () => setError('Could not read that file. Try again.');
    reader.readAsText(file, 'UTF-8');
  }

  async function runPreview(text) {
    setPhase('parsing');
    setError('');
    try {
      const res  = await fetch('/api/test-cases/import/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      });
      const json = await res.json();
      if (json.success) setPreview(json.data);
      else setError(json.error || 'Could not read the CSV.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPhase('idle');
    }
  }

  async function runCommit() {
    setPhase('committing');
    setError('');
    try {
      const res  = await fetch('/api/test-cases/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      });
      const json = await res.json();
      if (json.success) setResult(json.data);
      else setError(json.error || 'Import failed.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPhase('idle');
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'test-cases-template.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  const validCount = preview?.summary.valid ?? 0;

  return (
    <main style={{ padding: '24px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <button onClick={() => navigate('/test-cases')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--canvas-muted)', fontSize: 14, padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={15} /> Back to Test Cases
      </button>

      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Import Test Cases from CSV</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--canvas-muted)', lineHeight: 1.5 }}>
        Upload a CSV to preview and import test cases in bulk. Required columns:{' '}
        <code style={code}>title</code>, <code style={code}>severity</code>, <code style={code}>steps</code>, <code style={code}>expected_result</code>.
        Optional: <code style={code}>preconditions</code>, <code style={code}>status</code>.
        Separate individual steps with <code style={code}>|</code> or line breaks. Severity and status are case-insensitive.
      </p>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ---- Result state ---- */}
      {result ? (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <CheckCircle size={22} color="var(--status-pass)" />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {result.imported} test case{result.imported !== 1 ? 's' : ''} imported
            </h2>
          </div>
          {result.skipped.length > 0 ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                {result.skipped.length} row{result.skipped.length !== 1 ? 's' : ''} skipped:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#b91c1c' }}>
                {result.skipped.map(s => (
                  <li key={s.rowNumber} style={{ marginBottom: 4 }}>Row {s.rowNumber}: {s.errors.join(' ')}</li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>No rows were skipped.</p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => navigate('/test-cases')} style={primaryBtn}>Go to Test Cases</button>
            <button onClick={reset} style={secondaryBtn}>Import another file</button>
          </div>
        </div>
      ) : (
        <>
          {/* ---- Upload state ---- */}
          <div style={{ ...card, marginBottom: preview ? 20 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => fileInputRef.current?.click()} style={primaryBtn} disabled={phase !== 'idle'}>
                <Upload size={15} /> Choose CSV file
              </button>
              <button onClick={downloadTemplate} style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={15} /> Download template
              </button>
              {fileName && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fileName}</span>}
              {phase === 'parsing' && <span style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>Parsing…</span>}
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
          </div>

          {/* ---- Preview state ---- */}
          {preview && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 16, fontSize: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{preview.summary.valid} valid</span>
                  <span style={{ fontWeight: 700, color: '#dc2626' }}>{preview.summary.invalid} invalid</span>
                  {preview.summary.duplicates > 0 && (
                    <span style={{ fontWeight: 700, color: '#b45309' }}>{preview.summary.duplicates} duplicate</span>
                  )}
                  <span style={{ color: 'var(--text-faint)' }}>· {preview.summary.total} total</span>
                </div>
                <button onClick={runCommit} disabled={validCount === 0 || phase !== 'idle'}
                  style={{ ...primaryBtn, background: validCount > 0 ? '#2563eb' : '#bfdbfe', cursor: validCount > 0 ? 'pointer' : 'default' }}>
                  {phase === 'committing' ? 'Importing…' : `Import ${validCount} valid row${validCount !== 1 ? 's' : ''}`}
                </button>
              </div>

              {preview.ignoredColumns.length > 0 && (
                <div style={{ background: '#fffbeb', color: '#92400e', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={14} /> Ignored unknown column{preview.ignoredColumns.length !== 1 ? 's' : ''}: {preview.ignoredColumns.join(', ')}
                </div>
              )}

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ ...th, width: 44 }}>Row</th>
                      <th style={{ ...th, width: 70 }}>Status</th>
                      <th style={th}>Title</th>
                      <th style={{ ...th, width: 90 }}>Severity</th>
                      <th style={{ ...th, width: 70 }}>Steps</th>
                      <th style={th}>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={r.rowNumber} style={{ background: i % 2 ? 'var(--surface-alt)' : 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', opacity: r.valid ? 1 : 0.85 }}>
                        <td style={{ ...td, color: 'var(--text-faint)' }}>{r.rowNumber}</td>
                        <td style={td}>
                          {r.valid
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: 12, fontWeight: 600 }}><CheckCircle size={13} /> Valid</span>
                            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontSize: 12, fontWeight: 600 }}><XCircle size={13} /> Invalid</span>}
                        </td>
                        <td style={{ ...td, fontWeight: 500 }}>
                          {r.mapped.title || <span style={{ color: 'var(--text-faint)' }}>—</span>}
                          {r.duplicate && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 7px', borderRadius: 10 }}>duplicate</span>}
                        </td>
                        <td style={td}><Badge value={r.mapped.severity} map={SEVERITY_STYLES} /></td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>{r.mapped.steps.length || <span style={{ color: 'var(--text-faint)' }}>0</span>}</td>
                        <td style={{ ...td, color: r.errors.length ? '#b91c1c' : '#cbd5e1', fontSize: 12.5 }}>
                          {r.errors.length ? r.errors.join(' ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '12px 0 0' }}>
                Only valid rows are imported. Duplicates (titles that already exist) are imported but flagged above.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 22 };
const code = { background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 13, color: '#4b5563' };
const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12.5, color: 'var(--text-secondary)' };
const td = { padding: '10px 14px', verticalAlign: 'top' };
const primaryBtn = { display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const secondaryBtn = { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
