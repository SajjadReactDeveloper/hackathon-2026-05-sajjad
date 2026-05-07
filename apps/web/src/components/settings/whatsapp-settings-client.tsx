'use client';

import { useState } from 'react';
import { browserApiClient } from '@/lib/browser-api-client';

interface Workspace {
  id: string;
  phoneNumberId: string | null;
  wabaId: string | null;
}

interface Props {
  workspace: Workspace | null;
  webhookUrl: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

export function WhatsAppSettingsClient({ workspace, webhookUrl }: Props) {
  const [phoneNumberId, setPhoneNumberId] = useState(workspace?.phoneNumberId ?? '');
  const [wabaId, setWabaId] = useState(workspace?.wabaId ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(!!workspace?.phoneNumberId);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const verifyToken = `flowchat-verify-${workspace?.id?.slice(0, 8) ?? 'token'}`;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      await browserApiClient('/workspaces/whatsapp-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          phoneNumberId: phoneNumberId || undefined,
          wabaId: wabaId || undefined,
          accessToken: accessToken || undefined,
        }),
        workspaceId: workspace?.id,
      });
      if (accessToken) { setTokenSaved(true); setAccessToken(''); }
      setSaveStatus('saved');
      setSaveMsg('Settings saved.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  async function handleTest() {
    setTestStatus('testing');
    setTestMsg('');
    try {
      const res = await browserApiClient<{
        ok: boolean;
        displayPhoneNumber?: string;
        verifiedName?: string;
        error?: string;
      }>('/workspaces/test-connection', { method: 'POST', workspaceId: workspace?.id });

      if (res.ok) {
        setTestStatus('ok');
        setTestMsg(`Connected: ${res.verifiedName} (${res.displayPhoneNumber})`);
      } else {
        setTestStatus('fail');
        setTestMsg(res.error ?? 'Connection failed.');
      }
    } catch (err) {
      setTestStatus('fail');
      setTestMsg(err instanceof Error ? err.message : 'Connection test failed.');
    }
  }

  function copyWebhookUrl() {
    void navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isBusy = saveStatus === 'saving' || testStatus === 'testing';

  return (
    <div className="space-y-5">

      {/* ── Webhook info ─────────────────────────────────────── */}
      <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'rgba(34,197,94,0.03)', borderColor: 'rgba(34,197,94,0.2)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
            <svg className="w-3.5 h-3.5" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-slate-700">Step 1 — Configure Meta Webhook</p>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          In <strong>Meta Business Manager → WhatsApp → Configuration</strong>, set the Callback URL and Verify Token below. Subscribe to <code className="bg-slate-100 px-1 rounded text-[10px]">messages</code>.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Callback URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] px-3 py-2 rounded-xl truncate font-mono" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}>
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold transition-colors"
                style={{ background: copied ? 'rgba(34,197,94,0.1)' : '#f1f5f9', color: copied ? '#16a34a' : '#64748b', border: '1px solid #e2e8f0' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Verify Token</p>
            <code className="block text-[11px] px-3 py-2 rounded-xl font-mono" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}>
              {verifyToken}
            </code>
          </div>
        </div>
      </div>

      {/* ── Credentials form ─────────────────────────────────── */}
      <form onSubmit={(e) => { void handleSave(e); }} className="rounded-2xl border p-5 space-y-4" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
        <p className="text-[13px] font-semibold text-slate-700 mb-1">Step 2 — API Credentials</p>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-slate-600">Phone Number ID</label>
          <p className="text-[11px] text-slate-400">Meta Business Manager → WhatsApp → API Setup → Phone Number ID</p>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="1234567890123456"
            className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono text-slate-800 outline-none transition-all"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-slate-600">WABA ID</label>
          <p className="text-[11px] text-slate-400">WhatsApp Business Account ID</p>
          <input
            type="text"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="1234567890123456"
            className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono text-slate-800 outline-none transition-all"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-semibold text-slate-600">Permanent Access Token</label>
            {tokenSaved && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                Token saved
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {tokenSaved ? 'Enter a new token only to replace the existing one.' : 'Generate in System Users → Meta Business Manager. Stored encrypted (AES-256-GCM).'}
          </p>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={tokenSaved ? '••••••••  (leave blank to keep current)' : 'EAAxxxxxxx...'}
            className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono text-slate-800 outline-none transition-all"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
          />
        </div>

        {/* Save status */}
        {saveMsg && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]"
            style={{
              background: saveStatus === 'saved' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              color: saveStatus === 'saved' ? '#16a34a' : '#dc2626',
            }}
          >
            {saveStatus === 'saved'
              ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            }
            {saveMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      {/* ── Test connection ───────────────────────────────────── */}
      <div className="rounded-2xl border p-5 space-y-3" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
        <div>
          <p className="text-[13px] font-semibold text-slate-700">Step 3 — Test Connection</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Verifies your Phone Number ID and Access Token against the Meta API.
          </p>
        </div>

        {testMsg && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px]"
            style={{
              background: testStatus === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              color: testStatus === 'ok' ? '#16a34a' : '#dc2626',
            }}
          >
            {testStatus === 'ok'
              ? <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              : <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            }
            <span>{testMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => { void handleTest(); }}
          disabled={isBusy || !tokenSaved}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40"
          style={{ background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0' }}
          title={!tokenSaved ? 'Save credentials first to enable test' : undefined}
        >
          {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
        </button>

        {!tokenSaved && (
          <p className="text-[11px] text-slate-400 text-center">Save credentials first to enable the connection test.</p>
        )}
      </div>

    </div>
  );
}
