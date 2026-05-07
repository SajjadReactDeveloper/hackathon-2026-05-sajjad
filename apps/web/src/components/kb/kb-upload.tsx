'use client';

import { useState, useRef, DragEvent } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Props {
  workspaceId: string;
}

export function KbUpload({ workspaceId }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!file.name.endsWith('.pdf')) {
      setMessage({ type: 'error', text: 'Only PDF files are supported.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${API_URL}/kb/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          'x-workspace-id': workspaceId,
        },
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Upload failed');
      }

      setMessage({ type: 'success', text: `"${file.name}" uploaded — processing in background.` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragging ? 'border-green-400 bg-green-50 shadow-inner' : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <svg className="w-6 h-6 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-600">Uploading...</p>
        </div>
      ) : (
        <>
          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-gray-700">Drop a PDF here or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">Max 20 MB · Text-based PDFs only (not scanned images)</p>
        </>
      )}

      {message && (
        <div
          className={`mt-3 text-sm px-3 py-2 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
