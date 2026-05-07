'use client';

import { useState } from 'react';
import { browserApiClient } from '@/lib/browser-api-client';

interface AutoRule {
  id: string;
  name: string;
  triggerPattern: string;
  matchScope: 'text' | 'transcription' | 'any';
  replyTemplate: string | null;
  action: 'send_text' | 'tag_contact' | 'skip_ai';
  enabled: boolean;
  priority: number;
  createdAt: string;
}

interface Props {
  workspaceId: string;
  initialRules: AutoRule[];
}

type FormData = {
  name: string;
  triggerPattern: string;
  matchScope: 'text' | 'transcription' | 'any';
  replyTemplate: string;
  action: 'send_text' | 'tag_contact' | 'skip_ai';
  priority: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  triggerPattern: '',
  matchScope: 'any',
  replyTemplate: '',
  action: 'send_text',
  priority: '0',
};

const ACTION_LABELS: Record<string, string> = {
  send_text: 'Send text',
  tag_contact: 'Tag contact',
  skip_ai: 'Skip AI',
};

const ACTION_STYLES: Record<string, React.CSSProperties> = {
  send_text:   { background: 'rgba(59,130,246,0.1)',  color: '#2563eb' },
  tag_contact: { background: 'rgba(100,116,139,0.1)', color: '#64748b' },
  skip_ai:     { background: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
};

const SCOPE_LABELS: Record<string, string> = {
  text: 'Text',
  transcription: 'Transcript',
  any: 'Any',
};

const inputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#0f172a',
  padding: '8px 12px',
  borderRadius: 10,
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

export function RulesClient({ workspaceId, initialRules }: Props) {
  const [rules, setRules] = useState<AutoRule[]>(initialRules);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  }

  function openEdit(rule: AutoRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      triggerPattern: rule.triggerPattern,
      matchScope: rule.matchScope,
      replyTemplate: rule.replyTemplate ?? '',
      action: rule.action,
      priority: String(rule.priority),
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.triggerPattern.trim()) {
      setError('Name and pattern are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        triggerPattern: form.triggerPattern.trim(),
        matchScope: form.matchScope,
        replyTemplate: form.replyTemplate.trim() || undefined,
        action: form.action,
        priority: parseInt(form.priority, 10) || 0,
      };
      if (editingId) {
        const updated = await browserApiClient<AutoRule>(`/rules/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
          workspaceId,
        });
        setRules((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        const created = await browserApiClient<AutoRule>('/rules', {
          method: 'POST',
          body: JSON.stringify(body),
          workspaceId,
        });
        setRules((prev) => [...prev, created].sort((a, b) => b.priority - a.priority));
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(rule: AutoRule) {
    setTogglingId(rule.id);
    try {
      const updated = await browserApiClient<AutoRule>(`/rules/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !rule.enabled }),
        workspaceId,
      });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rule?')) return;
    setDeletingId(id);
    try {
      await browserApiClient<void>(`/rules/${id}`, { method: 'DELETE', workspaceId });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Auto Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Regex rules that fire before the AI. High priority runs first.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 text-[13px] font-semibold text-white px-4 py-2 rounded-xl transition-all"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <p className="text-[13px] text-slate-400 font-medium">No rules yet. Add one to start automating replies before the AI.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rule</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pattern</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scope</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pri</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="group transition-colors"
                  style={{ borderBottom: '1px solid #f8fafc', opacity: rule.enabled ? 1 : 0.45 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-900">{rule.name}</td>
                  <td className="px-4 py-3.5">
                    <code
                      className="text-[11px] font-mono px-2 py-0.5 rounded max-w-[180px] block truncate"
                      style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
                    >
                      {rule.triggerPattern}
                    </code>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-500 font-medium">{SCOPE_LABELS[rule.matchScope]}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                      style={ACTION_STYLES[rule.action] ?? ACTION_STYLES['tag_contact']}
                    >
                      {ACTION_LABELS[rule.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-500 font-medium num">{rule.priority}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={togglingId === rule.id}
                        title={rule.enabled ? 'Disable' : 'Enable'}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${togglingId === rule.id ? 'opacity-50' : ''}`}
                        style={{ background: rule.enabled ? '#22c55e' : '#e2e8f0' }}
                      >
                        <span
                          className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          style={{ transform: rule.enabled ? 'translateX(16px)' : 'translateX(0)' }}
                        />
                      </button>
                      <button
                        onClick={() => openEdit(rule)}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deletingId === rule.id}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-md rounded-2xl"
            style={{ background: '#ffffff', boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)' }}
          >
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #f1f5f9' }}
            >
              <h2 className="text-[15px] font-bold text-slate-900">{editingId ? 'Edit Rule' : 'Add Rule'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Address request"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trigger pattern (regex)</label>
                <input
                  value={form.triggerPattern}
                  onChange={(e) => setForm((f) => ({ ...f, triggerPattern: e.target.value }))}
                  placeholder="e.g. address|location|city"
                  style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Match scope</label>
                  <select
                    value={form.matchScope}
                    onChange={(e) => setForm((f) => ({ ...f, matchScope: e.target.value as FormData['matchScope'] }))}
                    style={inputStyle}
                  >
                    <option value="any">Any</option>
                    <option value="text">Text only</option>
                    <option value="transcription">Transcription only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action</label>
                  <select
                    value={form.action}
                    onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as FormData['action'] }))}
                    style={inputStyle}
                  >
                    <option value="send_text">Send text</option>
                    <option value="skip_ai">Skip AI</option>
                    <option value="tag_contact">Tag contact</option>
                  </select>
                </div>
              </div>

              {form.action === 'send_text' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reply template</label>
                  <textarea
                    value={form.replyTemplate}
                    onChange={(e) => setForm((f) => ({ ...f, replyTemplate: e.target.value }))}
                    rows={3}
                    placeholder="Message to send when this rule fires..."
                    style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority (higher runs first)</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {error && (
                <p
                  className="text-[12px] font-semibold px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  {error}
                </p>
              )}
            </div>

            <div
              className="px-6 py-4 flex justify-end gap-3"
              style={{ borderTop: '1px solid #f1f5f9' }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors rounded-xl"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                }}
              >
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
