'use client';

import { useState } from 'react';
import { browserApiClient } from '@/lib/browser-api-client';

interface Workspace {
  id: string;
  name: string;
  timezone: string;
  locale: string;
}

interface Props {
  workspace: Workspace | null;
}

const TIMEZONES = [
  'Asia/Karachi',
  'Asia/Lahore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'UTC',
];

const LOCALES = [
  { value: 'ur-PK', label: 'Urdu (Pakistan)' },
  { value: 'en-PK', label: 'English (Pakistan)' },
  { value: 'en-US', label: 'English (US)' },
];

export function BusinessSettingsClient({ workspace }: Props) {
  const [form, setForm] = useState({
    name: workspace?.name ?? '',
    timezone: workspace?.timezone ?? 'Asia/Karachi',
    locale: workspace?.locale ?? 'ur-PK',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!workspace) return;
    if (!form.name.trim()) { setError('Business name is required.'); return; }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await browserApiClient('/workspaces/business', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          timezone: form.timezone,
          locale: form.locale,
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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Business name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Fatima Boutique"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Used for business hours and analytics charts.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Default locale</label>
          <select
            value={form.locale}
            onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500"
          >
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Fallback language when AI cannot detect customer language.</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">Workspace ID</p>
        <code className="text-xs text-gray-600 font-mono break-all">{workspace.id}</code>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Business Settings'}
      </button>
    </div>
  );
}
