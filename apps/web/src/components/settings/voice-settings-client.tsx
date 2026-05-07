'use client';

import { useState, useRef } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Workspace {
  id: string;
  voiceCloneStatus: 'none' | 'training' | 'ready';
  voiceCloneId: string | null;
  aiConfig: {
    ttsProvider: 'openai' | 'elevenlabs';
    ttsVoice: string;
    ttsEnabled: boolean;
  } | null;
}

interface Props {
  workspace: Workspace | null;
}

export function VoiceSettingsClient({ workspace }: Props) {
  const [status, setStatus] = useState<'none' | 'training' | 'ready'>(workspace?.voiceCloneStatus ?? 'none');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function getAuthHeaders(workspaceId: string): Promise<Record<string, string>> {
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'x-workspace-id': workspaceId,
    };
  }

  async function handleUpload(file: File) {
    if (!workspace) return;
    setUploading(true);
    setMessage(null);
    try {
      const headers = await getAuthHeaders(workspace.id);
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/workspaces/voice-clone`, {
        method: 'POST',
        headers,
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Upload failed');
      }
      setStatus('ready');
      setMessage({ type: 'success', text: 'Voice clone trained! The AI will now reply in your voice.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!workspace || !confirm('Remove your voice clone?')) return;
    setDeleting(true);
    setMessage(null);
    try {
      const headers = await getAuthHeaders(workspace.id);
      await fetch(`${API_URL}/workspaces/voice-clone/delete`, { method: 'POST', headers });
      setStatus('none');
      setMessage({ type: 'success', text: 'Voice clone removed.' });
    } catch {
      setMessage({ type: 'error', text: 'Delete failed' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Voice Clone Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload a 30–60 second audio sample in your own voice (Urdu / Roman Urdu).
              ElevenLabs Multilingual v2 will clone it.
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
            status === 'ready' ? 'bg-green-100 text-green-700' :
            status === 'training' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {status === 'ready' ? 'Active' : status === 'training' ? 'Training' : 'Not configured'}
          </span>
        </div>

        {status === 'ready' ? (
          <div className="mt-4 flex gap-3">
            <div className="flex-1 bg-green-50 rounded-lg px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700">Your voice clone is active. AI voice replies use your voice.</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              {deleting ? 'Removing...' : 'Remove'}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !workspace}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Training...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  Upload voice sample
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">MP3, WAV or M4A · 30–60 seconds · Speak naturally in Urdu</p>
          </div>
        )}

        {message && (
          <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Fallback TTS</h2>
        <p className="text-xs text-gray-500">
          When voice clone is not active, the AI uses <strong>OpenAI TTS</strong> (voice: {workspace?.aiConfig?.ttsVoice ?? 'alloy'}).
          Change this in the AI Settings tab.
        </p>
      </div>
    </div>
  );
}
