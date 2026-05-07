'use client';

import { useState } from 'react';

type BroadcastStatus = 'sent' | 'scheduled' | 'draft' | 'failed';

interface Broadcast {
  id: string;
  name: string;
  message: string;
  audience: string;
  audienceCount: number;
  status: BroadcastStatus;
  sentAt: string;
  deliveredCount?: number;
  readCount?: number;
}

const MOCK_BROADCASTS: Broadcast[] = [
  {
    id: '1',
    name: 'Eid Collection Launch',
    message: 'Assalam o Alaikum! Hamari Eid 2025 collection aa gayi. New lawn suits, embroidered kurtas, and silk dupattas. 20% early-bird discount for first 48 hours. Reply "EID" to see the full catalogue.',
    audience: 'All customers',
    audienceCount: 847,
    status: 'sent',
    sentAt: '2 days ago',
    deliveredCount: 831,
    readCount: 612,
  },
  {
    id: '2',
    name: 'Restock Alert — Lawn Suits',
    message: 'Khushkhabri! Lawn suits restocked. Blue, green, and white shades wapis available hain. Stock limited hai — pehle aao pehle pao.',
    audience: 'Tag: lawn-interest',
    audienceCount: 203,
    status: 'sent',
    sentAt: '5 days ago',
    deliveredCount: 198,
    readCount: 154,
  },
  {
    id: '3',
    name: 'Weekend Sale Reminder',
    message: 'Aaj aur kal FLAT 15% off on all orders above PKR 5,000. Promo code: WEEKEND15. Offer ends Sunday midnight.',
    audience: 'All customers',
    audienceCount: 847,
    status: 'scheduled',
    sentAt: 'Tomorrow, 10:00 AM',
  },
  {
    id: '4',
    name: 'New Arrivals — Summer Line',
    message: 'Draft message for summer launch campaign.',
    audience: 'Tag: repeat-buyer',
    audienceCount: 134,
    status: 'draft',
    sentAt: 'Not sent',
  },
];

const STATUS_CONFIG: Record<BroadcastStatus, { label: string; bg: string; color: string }> = {
  sent:      { label: 'Sent',      bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  scheduled: { label: 'Scheduled', bg: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  draft:     { label: 'Draft',     bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
  failed:    { label: 'Failed',    bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All customers', estimate: '847 recipients' },
  { value: 'tag:repeat-buyer', label: 'Tag: repeat-buyer', estimate: '134 recipients' },
  { value: 'tag:lawn-interest', label: 'Tag: lawn-interest', estimate: '203 recipients' },
  { value: 'tag:vip', label: 'Tag: vip', estimate: '41 recipients' },
  { value: 'tag:new-customer', label: 'Tag: new-customer (last 30d)', estimate: '88 recipients' },
];

export default function BroadcastsPage() {
  const [showCompose, setShowCompose] = useState(false);
  const [msgName, setMsgName] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(MOCK_BROADCASTS);

  const selectedAudience = AUDIENCE_OPTIONS.find((o) => o.value === audience) ?? AUDIENCE_OPTIONS[0];
  const charCount = msgBody.length;
  const msgCount = Math.ceil(charCount / 160) || 1;

  function handleSend() {
    if (!msgName.trim() || !msgBody.trim()) return;
    setSending(true);
    setTimeout(() => {
      const newBroadcast: Broadcast = {
        id: String(Date.now()),
        name: msgName.trim(),
        message: msgBody.trim(),
        audience: selectedAudience.label,
        audienceCount: parseInt(selectedAudience.estimate.split(' ')[0], 10),
        status: scheduleMode === 'later' ? 'scheduled' : 'sent',
        sentAt: scheduleMode === 'later' ? (scheduleTime || 'Scheduled') : 'Just now',
        deliveredCount: scheduleMode === 'now' ? parseInt(selectedAudience.estimate.split(' ')[0], 10) - 2 : undefined,
        readCount: scheduleMode === 'now' ? Math.floor(parseInt(selectedAudience.estimate.split(' ')[0], 10) * 0.68) : undefined,
      };
      setBroadcasts((prev) => [newBroadcast, ...prev]);
      setSending(false);
      setSuccess(true);
      setShowCompose(false);
      setMsgName('');
      setMsgBody('');
      setAudience('all');
      setScheduleMode('now');
      setScheduleTime('');
      setTimeout(() => setSuccess(false), 4000);
    }, 1600);
  }

  return (
    <div className="min-h-full">
      <div className="px-7 pt-7 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Broadcasts</h1>
            <p className="text-sm text-slate-500 mt-1">Send bulk WhatsApp messages to your customer segments.</p>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 text-[13px] font-semibold text-white px-4 py-2.5 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 2px 8px rgba(34,197,94,0.35)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Broadcast
          </button>
        </div>
      </div>

      <div className="px-7 pb-7 space-y-4">
        {/* Success toast */}
        {success && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold"
            style={{ background: 'rgba(34,197,94,0.08)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Broadcast queued successfully. Messages will be delivered within minutes.
          </div>
        )}

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total sent', value: '1,050', sub: 'across 2 broadcasts', color: '#16a34a', bg: 'rgba(34,197,94,0.06)' },
            { label: 'Avg. read rate', value: '72%', sub: 'industry avg. 58%', color: '#0891b2', bg: 'rgba(6,182,212,0.06)' },
            { label: 'Scheduled', value: '1', sub: 'pending delivery', color: '#d97706', bg: 'rgba(245,158,11,0.06)' },
          ].map(({ label, value, sub, color, bg }) => (
            <div key={label} className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${color}20` }}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: `${color}cc` }}>{label}</p>
              <p className="text-[26px] font-bold leading-none tracking-tight mt-1.5" style={{ color }}>{value}</p>
              <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Broadcasts table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Broadcast history</p>
          </div>

          <div className="divide-y divide-slate-50">
            {broadcasts.map((b) => {
              const cfg = STATUS_CONFIG[b.status];
              return (
                <div key={b.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <p className="text-[13px] font-semibold text-slate-900">{b.name}</p>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-1">{b.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                          </svg>
                          {b.audienceCount.toLocaleString()} · {b.audience}
                        </span>
                        <span className="text-[11px] text-slate-400">{b.sentAt}</span>
                      </div>
                    </div>

                    {b.status === 'sent' && b.deliveredCount !== undefined && (
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[12px] font-bold text-slate-700">{b.deliveredCount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">delivered</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-bold" style={{ color: '#0891b2' }}>{b.readCount?.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">read</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-bold" style={{ color: '#16a34a' }}>
                            {b.readCount && b.deliveredCount ? Math.round((b.readCount / b.deliveredCount) * 100) : 0}%
                          </p>
                          <p className="text-[10px] text-slate-400">read rate</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompose(false); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl"
            style={{ background: '#ffffff', boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)' }}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="text-[15px] font-bold text-slate-900">New Broadcast</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Broadcast name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Broadcast name
                </label>
                <input
                  type="text"
                  value={msgName}
                  onChange={(e) => setMsgName(e.target.value)}
                  placeholder="e.g. Eid Collection Launch"
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] text-slate-800 outline-none transition-all"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                />
              </div>

              {/* Message body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Message
                  </label>
                  <span className="text-[10px] font-semibold" style={{ color: charCount > 1000 ? '#ef4444' : '#94a3b8' }}>
                    {charCount} chars · {msgCount} SMS segment{msgCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  rows={5}
                  placeholder="Assalam o Alaikum! Hamari nai collection launch ho gayi..."
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] text-slate-800 outline-none transition-all leading-relaxed"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', resize: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tip: Use Urdu script for best delivery rates on Pakistani numbers.
                </p>
              </div>

              {/* Audience */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] text-slate-800 outline-none transition-all appearance-none cursor-pointer"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                >
                  {AUDIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label} — {o.estimate}</option>
                  ))}
                </select>
              </div>

              {/* Send time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Send time
                </label>
                <div className="flex gap-2">
                  {(['now', 'later'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setScheduleMode(mode)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all"
                      style={
                        scheduleMode === mode
                          ? { background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1.5px solid rgba(34,197,94,0.3)' }
                          : { background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0' }
                      }
                    >
                      {mode === 'now' ? 'Send now' : 'Schedule'}
                    </button>
                  ))}
                </div>
                {scheduleMode === 'later' && (
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full mt-2 px-3 py-2.5 rounded-xl text-[13px] text-slate-800 outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                  />
                )}
              </div>

              {/* Estimate */}
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px]"
                style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}
              >
                <svg className="w-4 h-4 shrink-0" style={{ color: '#0891b2' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span style={{ color: '#0e7490' }}>
                  This will send to approximately <strong>{selectedAudience.estimate}</strong>.
                  {scheduleMode === 'now' ? ' Messages are queued immediately.' : ' Messages will be sent at the scheduled time.'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-[13px] font-semibold rounded-xl transition-colors"
                style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !msgName.trim() || !msgBody.trim()}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Queuing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    {scheduleMode === 'now' ? 'Send broadcast' : 'Schedule broadcast'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
