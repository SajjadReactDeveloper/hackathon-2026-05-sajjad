'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface ConversationItem {
  id: string;
  status: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  aiEnabled: boolean;
  contact: {
    id: string;
    waPhone: string;
    displayName: string | null;
    profileName: string | null;
  };
}

interface Props {
  initialConversations: ConversationItem[];
  workspaceId: string;
}

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

function palette(phone: string) {
  let h = 0;
  for (let i = 0; i < phone.length; i++) h = (h + phone.charCodeAt(i)) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[h]!;
}

function initials(name: string | null, phone: string): string {
  if (name) {
    const p = name.trim().split(' ');
    if (p.length >= 2) return (p[0]![0]! + p[p.length - 1]![0]!).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ConversationList({ initialConversations, workspaceId }: Props) {
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [search, setSearch] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    if (!workspaceId) return;
    const sb = getSupabaseBrowser();
    const ch = sb
      .channel(`conv:${workspaceId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `workspaceId=eq.${workspaceId}`,
      }, (p: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (p.eventType === 'INSERT') {
          setConversations((prev) => [p.new as unknown as ConversationItem, ...prev]);
        } else if (p.eventType === 'UPDATE') {
          setConversations((prev) =>
            prev
              .map((c) => (c.id === (p.new as { id: string }).id ? { ...c, ...(p.new as Partial<ConversationItem>) } : c))
              .sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()),
          );
        }
      })
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [workspaceId]);

  const unreadTotal = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const filtered = search.trim()
    ? conversations.filter((c) => {
        const n = (c.contact.displayName ?? c.contact.profileName ?? '').toLowerCase();
        const q = search.toLowerCase();
        return n.includes(q) || c.contact.waPhone.includes(q);
      })
    : conversations;

  return (
    <aside
      className="w-80 shrink-0 flex flex-col h-full"
      style={{ background: '#ffffff', borderRight: '1px solid #f1f5f9' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Inbox</h2>
          {unreadTotal > 0 && (
            <span
              className="text-[10px] font-bold text-white rounded-full px-2 py-0.5 min-w-[20px] text-center"
              style={{ background: '#22c55e' }}
            >
              {unreadTotal}
            </span>
          )}
        </div>
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400">
            {search ? 'No results' : 'No conversations yet'}
          </div>
        )}
        {filtered.map((conv) => {
          const name = conv.contact.displayName ?? conv.contact.profileName ?? conv.contact.waPhone;
          const sel  = pathname === `/inbox/${conv.id}`;
          const pal  = palette(conv.contact.waPhone);
          return (
            <Link
              key={conv.id}
              href={`/inbox/${conv.id}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors"
              style={{
                background: sel ? '#f0fdf4' : undefined,
                borderLeft: sel ? '3px solid #22c55e' : '3px solid transparent',
                borderBottom: '1px solid #f8fafc',
              }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: pal.bg, color: pal.text }}
              >
                {initials(conv.contact.displayName ?? conv.contact.profileName, conv.contact.waPhone)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="text-[13px] truncate"
                    style={{ fontWeight: conv.unreadCount > 0 ? 700 : 500, color: '#0f172a' }}
                  >
                    {name}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">{relativeTime(conv.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p
                    className="text-[12px] truncate"
                    style={{ color: conv.unreadCount > 0 ? '#475569' : '#94a3b8', fontWeight: conv.unreadCount > 0 ? 500 : 400 }}
                  >
                    {conv.lastMessagePreview ?? ''}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {conv.aiEnabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" title="AI on" />
                    )}
                    {conv.unreadCount > 0 && (
                      <span
                        className="text-[10px] font-bold text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
                        style={{ background: '#22c55e' }}
                      >
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
