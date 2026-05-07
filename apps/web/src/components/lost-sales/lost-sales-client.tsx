'use client';

import { useState } from 'react';
import { browserApiClient } from '@/lib/browser-api-client';

interface Contact {
  id: string;
  waPhone: string;
  displayName: string | null;
}

interface LostSaleConversation {
  id: string;
  lostSaleStatus: 'pending_analysis' | 'analyzed' | 'recovered';
  lostSaleReason: string | null;
  lostSaleSuggestion: string | null;
  lostSaleAnalyzedAt: string | null;
  lastMessageAt: string;
  contact: Contact;
}

interface Props {
  workspaceId: string;
  initialConversations: LostSaleConversation[];
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending_analysis: { background: 'rgba(245,158,11,0.1)', color: '#d97706' },
  analyzed:         { background: 'rgba(59,130,246,0.1)',  color: '#2563eb' },
  recovered:        { background: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
};

const STATUS_LABELS: Record<string, string> = {
  pending_analysis: 'Pending',
  analyzed: 'Analyzed',
  recovered: 'Recovered',
};

const AVATAR_PALETTES = [
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#fce7f3', text: '#be185d' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#ffedd5', text: '#c2410c' },
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#f0fdf4', text: '#15803d' },
];

function pal(phone: string) {
  let h = 0;
  for (let i = 0; i < phone.length; i++) h = (h + phone.charCodeAt(i)) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[h]!;
}

export function LostSalesClient({ workspaceId, initialConversations }: Props) {
  const [conversations, setConversations] = useState<LostSaleConversation[]>(initialConversations);
  const [scanning, setScanning] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ flagged: number } | null>(null);

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await browserApiClient<{ flagged: number }>('/lost-sales/scan', {
        method: 'POST',
        workspaceId,
      });
      setScanResult(result);
      const updated = await browserApiClient<LostSaleConversation[]>('/lost-sales', { workspaceId });
      setConversations(updated);
    } catch (err) {
      console.error('Scan failed', err);
    } finally {
      setScanning(false);
    }
  }

  async function handleAnalyze(id: string) {
    setAnalyzingId(id);
    try {
      const result = await browserApiClient<{ reason: string; suggestion: string }>(`/lost-sales/${id}/analyze`, {
        method: 'POST',
        workspaceId,
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, lostSaleStatus: 'analyzed', lostSaleReason: result.reason, lostSaleSuggestion: result.suggestion }
            : c,
        ),
      );
    } catch (err) {
      console.error('Analyze failed', err);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleRecover(id: string) {
    setRecoveringId(id);
    try {
      await browserApiClient<{ recovered: boolean }>(`/lost-sales/${id}/recover`, {
        method: 'POST',
        workspaceId,
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, lostSaleStatus: 'recovered' } : c)),
      );
    } catch (err) {
      console.error('Recover failed', err);
    } finally {
      setRecoveringId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Lost Sales</h1>
          <p className="text-sm text-slate-500 mt-1">AI-detected conversations with buying intent that went cold.</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 text-[13px] font-semibold text-white px-4 py-2 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
          }}
        >
          {scanning ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Scan Now
            </>
          )}
        </button>
      </div>

      {scanResult && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(59,130,246,0.08)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          Scan complete — {scanResult.flagged === 0
            ? 'no new lost sales detected.'
            : `${scanResult.flagged} conversation${scanResult.flagged !== 1 ? 's' : ''} flagged for analysis.`}
        </div>
      )}

      {conversations.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <svg className="w-10 h-10 mx-auto mb-3" style={{ color: '#e2e8f0' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-[13px] font-semibold text-slate-700">No lost sales detected</p>
          <p className="text-[12px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">Click Scan Now to analyze recent conversations for buying intent that went cold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const statusStyle = STATUS_STYLES[conv.lostSaleStatus] ?? STATUS_STYLES['pending_analysis'];
            const statusLabel = STATUS_LABELS[conv.lostSaleStatus] ?? 'Pending';
            const name = conv.contact.displayName ?? conv.contact.waPhone;
            const p = pal(conv.contact.waPhone);
            const daysSince = Math.floor(
              (Date.now() - new Date(conv.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24),
            );

            return (
              <div
                key={conv.id}
                className="rounded-2xl p-4 transition-shadow"
                style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)'; }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: p.bg, color: p.text }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900 truncate">{name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{conv.contact.waPhone} · {daysSince}d ago</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                      style={statusStyle}
                    >
                      {statusLabel}
                    </span>

                    {conv.lostSaleStatus === 'pending_analysis' && (
                      <button
                        onClick={() => handleAnalyze(conv.id)}
                        disabled={analyzingId === conv.id}
                        className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 2px 6px rgba(59,130,246,0.3)' }}
                      >
                        {analyzingId === conv.id ? 'Analyzing...' : 'Analyze'}
                      </button>
                    )}

                    {conv.lostSaleStatus === 'analyzed' && (
                      <button
                        onClick={() => handleRecover(conv.id)}
                        disabled={recoveringId === conv.id}
                        className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 2px 6px rgba(34,197,94,0.3)' }}
                      >
                        {recoveringId === conv.id ? 'Recovering...' : 'Recover'}
                      </button>
                    )}
                  </div>
                </div>

                {(conv.lostSaleReason ?? conv.lostSaleSuggestion) && (
                  <div className="mt-3 pl-12 space-y-2">
                    {conv.lostSaleReason && (
                      <div className="flex gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0 pt-0.5"
                          style={{ color: '#94a3b8' }}
                        >
                          Reason
                        </span>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{conv.lostSaleReason}</p>
                      </div>
                    )}
                    {conv.lostSaleSuggestion && (
                      <div
                        className="flex gap-2 p-2.5 rounded-xl"
                        style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}
                      >
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0 pt-0.5"
                          style={{ color: '#16a34a' }}
                        >
                          Recovery
                        </span>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{conv.lostSaleSuggestion}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
