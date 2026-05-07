'use client';

import { useState } from 'react';
import { browserApiClient } from '@/lib/browser-api-client';

interface AIConfig {
  autoReplyEnabled: boolean;
  systemPromptOverride: string | null;
  ttsEnabled: boolean;
  ttsProvider: 'openai' | 'elevenlabs';
  ttsVoice: string;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

interface Workspace {
  id: string;
  aiConfig: AIConfig | null;
}

interface Props {
  workspace: Workspace | null;
}

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

export function AISettingsClient({ workspace }: Props) {
  const cfg = workspace?.aiConfig;
  const [form, setForm] = useState({
    autoReplyEnabled: cfg?.autoReplyEnabled ?? true,
    systemPromptOverride: cfg?.systemPromptOverride ?? '',
    ttsEnabled: cfg?.ttsEnabled ?? true,
    ttsProvider: cfg?.ttsProvider ?? 'openai',
    ttsVoice: cfg?.ttsVoice ?? 'alloy',
    businessHoursEnabled: cfg?.businessHours?.enabled ?? false,
    businessHoursStart: cfg?.businessHours?.start ?? '09:00',
    businessHoursEnd: cfg?.businessHours?.end ?? '21:00',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!workspace) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await browserApiClient('/workspaces/ai-config', {
        method: 'PATCH',
        body: JSON.stringify({
          autoReplyEnabled: form.autoReplyEnabled,
          systemPromptOverride: form.systemPromptOverride || undefined,
          ttsEnabled: form.ttsEnabled,
          ttsProvider: form.ttsProvider,
          ttsVoice: form.ttsVoice,
          businessHours: {
            enabled: form.businessHoursEnabled,
            start: form.businessHoursStart,
            end: form.businessHoursEnd,
            timezone: 'Asia/Karachi',
          },
        }),
        workspaceId: workspace.id,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!workspace) {
    return <p className="text-sm text-gray-500">No workspace found.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Auto-reply</p>
            <p className="text-xs text-gray-500 mt-0.5">AI replies automatically to incoming messages</p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, autoReplyEnabled: !f.autoReplyEnabled }))}
            className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              form.autoReplyEnabled ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.autoReplyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Voice replies (TTS)</p>
            <p className="text-xs text-gray-500 mt-0.5">Send audio replies for voice note orders</p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, ttsEnabled: !f.ttsEnabled }))}
            className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              form.ttsEnabled ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.ttsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {form.ttsEnabled && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">TTS Provider</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['openai', 'elevenlabs'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setForm((f) => ({ ...f, ttsProvider: p }))}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  form.ttsProvider === p
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p === 'openai' ? 'OpenAI TTS' : 'ElevenLabs (cloned)'}
              </button>
            ))}
          </div>

          {form.ttsProvider === 'openai' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Voice</label>
              <select
                value={form.ttsVoice}
                onChange={(e) => setForm((f) => ({ ...f, ttsVoice: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500"
              >
                {OPENAI_VOICES.map((v) => (
                  <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                ))}
              </select>
            </div>
          )}

          {form.ttsProvider === 'elevenlabs' && (
            <p className="text-xs text-gray-500">Uses your voice clone. Configure it in the Voice tab.</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Business hours</p>
            <p className="text-xs text-gray-500 mt-0.5">Only reply during these hours (Asia/Karachi)</p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, businessHoursEnabled: !f.businessHoursEnabled }))}
            className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              form.businessHoursEnabled ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.businessHoursEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {form.businessHoursEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Opens</label>
              <input
                type="time"
                value={form.businessHoursStart}
                onChange={(e) => setForm((f) => ({ ...f, businessHoursStart: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Closes</label>
              <input
                type="time"
                value={form.businessHoursEnd}
                onChange={(e) => setForm((f) => ({ ...f, businessHoursEnd: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-1">System prompt override</label>
        <p className="text-xs text-gray-500 mb-3">Prepended to every AI reply prompt. Leave blank for default.</p>
        <textarea
          value={form.systemPromptOverride}
          onChange={(e) => setForm((f) => ({ ...f, systemPromptOverride: e.target.value }))}
          rows={5}
          placeholder="e.g. You are a friendly assistant for Zara Boutique. Always greet customers with 'Assalam o Alaikum'..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200 resize-none font-mono"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save AI Settings'}
      </button>
    </div>
  );
}
