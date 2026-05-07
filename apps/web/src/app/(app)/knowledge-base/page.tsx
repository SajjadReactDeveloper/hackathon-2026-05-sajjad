import type React from 'react';
import { apiClient } from '@/lib/api-client';
import { KbUpload } from '@/components/kb/kb-upload';

interface Workspace { id: string }

interface KbDoc {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'failed';
  pageCount: number;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { label: string; style: React.CSSProperties }> = {
  processing: { label: 'Processing', style: { background: 'rgba(245,158,11,0.1)', color: '#d97706' } },
  ready:      { label: 'Ready',      style: { background: 'rgba(34,197,94,0.1)',   color: '#16a34a' } },
  failed:     { label: 'Failed',     style: { background: 'rgba(239,68,68,0.1)',   color: '#dc2626' } },
};

export default async function KnowledgeBasePage() {
  let workspaceId = '';
  let docs: KbDoc[] = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      docs = await apiClient<KbDoc[]>('/kb', { workspaceId });
    }
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Knowledge Base</h1>
        <p className="text-sm text-slate-500 mt-1">Upload PDFs to ground AI replies in your business documents.</p>
      </div>

      <KbUpload workspaceId={workspaceId} />

      <div className="mt-6">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Documents ({docs.length})</h2>
        {docs.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
          >
            <p className="text-[13px] text-slate-400 font-medium">No documents uploaded yet. Upload a PDF above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => {
              const cfg = STATUS_STYLES[doc.status] ?? STATUS_STYLES['processing']!;
              return (
                <div
                  key={doc.id}
                  className="rounded-2xl px-4 py-3 flex items-center gap-3 transition-shadow"
                  style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)'; }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(239,68,68,0.08)' }}
                  >
                    <svg className="w-4 h-4" style={{ color: '#ef4444' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 18H17V16H7v2zm10-8H7v2h10v-2zm2-4H5C3.9 6 3 6.9 3 8v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 13H5V8h14v11zM7 10h10v2H7v-2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {doc.pageCount > 0 ? `${doc.pageCount} pages · ` : ''}
                      {new Date(doc.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span
                    className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold shrink-0"
                    style={cfg.style}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
