'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export interface AppNotification {
  id: string;
  type: 'message' | 'order' | 'fraud';
  title: string;
  body: string;
  href: string;
  timestamp: Date;
  read: boolean;
}

interface Props {
  workspaceId: string;
}

export function NotificationBell({ workspaceId }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Supabase Realtime subscriptions
  useEffect(() => {
    if (!workspaceId) return;
    const supabase = getSupabaseBrowser();

    const msgChannel = supabase
      .channel(`notif-messages-${workspaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `workspaceId=eq.${workspaceId}` },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          if (row['direction'] !== 'inbound') return;
          const preview = typeof row['textBody'] === 'string'
            ? row['textBody'].slice(0, 60)
            : `[${row['type'] ?? 'media'}]`;
          push({ type: 'message', title: 'New WhatsApp message', body: preview, href: '/inbox' });
        },
      )
      .subscribe();

    const orderChannel = supabase
      .channel(`notif-orders-${workspaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `workspaceId=eq.${workspaceId}` },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          const num = row['orderNumber'] as string ?? '';
          const score = typeof row['fraudScore'] === 'number' ? row['fraudScore'] : 0;
          const totalCents = typeof row['totalCents'] === 'bigint' ? Number(row['totalCents'])
            : typeof row['totalCents'] === 'number' ? row['totalCents'] : 0;
          const total = `PKR${(totalCents / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

          if (score >= 70) {
            push({ type: 'fraud', title: `Fraud alert: Order #${num}`, body: `Score ${score}/100 — review before processing`, href: '/orders' });
          } else {
            push({ type: 'order', title: `New order #${num}`, body: total, href: '/orders' });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(msgChannel);
      void supabase.removeChannel(orderChannel);
    };
  }, [workspaceId]);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function push(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    setNotifications((prev) => [
      { ...notif, id: `${Date.now()}-${Math.random()}`, timestamp: new Date(), read: false },
      ...prev.slice(0, 19),
    ]);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: open ? '#f1f5f9' : '#f8fafc' }}
        title="Notifications"
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
            style={{ background: '#ef4444', boxShadow: '0 0 0 2px #ffffff' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        {unread === 0 && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 0 1.5px #ffffff' }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-xl border overflow-hidden z-50"
          style={{ background: '#ffffff', borderColor: 'rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#f1f5f9' }}>
            <p className="text-[13px] font-semibold text-slate-800">Notifications</p>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-medium" style={{ color: '#22c55e' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-[12px] text-slate-400">No notifications yet</p>
                <p className="text-[11px] text-slate-300">New messages and orders will appear here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors border-b last:border-0"
                  style={{ borderColor: '#f8fafc', background: n.read ? 'transparent' : 'rgba(34,197,94,0.03)' }}
                >
                  {/* Icon */}
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: n.type === 'fraud' ? 'rgba(239,68,68,0.1)' : n.type === 'order' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)' }}
                  >
                    {n.type === 'fraud' && (
                      <svg className="w-3.5 h-3.5" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    )}
                    {n.type === 'order' && (
                      <svg className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                      </svg>
                    )}
                    {n.type === 'message' && (
                      <svg className="w-3.5 h-3.5" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    )}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-800 leading-tight">{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatTime(n.timestamp)}</p>
                  </div>

                  {!n.read && (
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#22c55e' }} />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}
