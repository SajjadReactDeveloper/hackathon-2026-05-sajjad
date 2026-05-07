'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { browserApiClient } from '@/lib/browser-api-client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface MessageItem {
  id: string;
  direction: 'inbound' | 'outbound';
  type: string;
  textBody: string | null;
  mediaUrl: string | null;
  transcription: string | null;
  aiGenerated: boolean;
  status: string;
  createdAt: string;
  detectedLanguage: string | null;
}

interface ConversationData {
  id: string;
  aiEnabled: boolean;
  contact: {
    id: string;
    waPhone: string;
    displayName: string | null;
    profileName: string | null;
  };
}

interface Props {
  initialMessages: MessageItem[];
  conversationId: string;
  workspaceId: string;
  conversation: ConversationData;
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

function groupByDate(messages: MessageItem[]): Array<{ date: string; messages: MessageItem[] }> {
  const groups: Record<string, MessageItem[]> = {};
  for (const msg of messages) {
    const key = formatDate(msg.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  }
  return Object.entries(groups).map(([date, msgs]) => ({ date, messages: msgs }));
}

export function ThreadView({ initialMessages, conversationId, workspaceId, conversation }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`messages:conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const msg = payload.new as unknown as MessageItem;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await browserApiClient('/messages/send', {
        method: 'POST',
        workspaceId,
        body: JSON.stringify({ conversationId, text: trimmed }),
      });
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  const contactName =
    conversation.contact.displayName ??
    conversation.contact.profileName ??
    conversation.contact.waPhone;

  const pal = palette(conversation.contact.waPhone);
  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-full" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: pal.bg, color: pal.text }}
        >
          {initials(conversation.contact.displayName ?? conversation.contact.profileName, conversation.contact.waPhone)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{contactName}</p>
          <p className="text-[11px] text-slate-400 font-medium">{conversation.contact.waPhone}</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={
            conversation.aiEnabled
              ? { background: 'rgba(34,197,94,0.1)', color: '#16a34a' }
              : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }
          }
        >
          {conversation.aiEnabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          )}
          AI {conversation.aiEnabled ? 'On' : 'Off'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400">
            No messages yet
          </div>
        )}
        {groups.map(({ date, messages: dayMsgs }) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
                style={{ background: '#f1f5f9', color: '#94a3b8' }}
              >
                {date}
              </span>
              <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
            </div>
            <div className="space-y-1.5">
              {dayMsgs.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="shrink-0 px-4 py-3"
        style={{
          background: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          boxShadow: '0 -1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {error && (
          <p className="text-[11px] text-red-500 mb-2 font-medium">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend(e as unknown as FormEvent);
              }
            }}
            placeholder="Type a message..."
            rows={2}
            className="flex-1 resize-none rounded-xl text-[13px] font-medium placeholder:text-slate-400 transition-shadow"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              padding: '10px 14px',
              outline: 'none',
              lineHeight: '1.5',
            }}
            onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
            onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: sending || !text.trim() ? '#f1f5f9' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: sending || !text.trim() ? '#94a3b8' : '#ffffff',
              boxShadow: sending || !text.trim() ? 'none' : '0 2px 8px rgba(34,197,94,0.35)',
              cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Enter to send · Shift+Enter for newline</p>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: MessageItem }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-xs lg:max-w-md xl:max-w-lg"
        style={
          isOutbound
            ? {
                background: message.aiGenerated
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#ffffff',
                borderRadius: '18px 18px 4px 18px',
                padding: '9px 14px',
                boxShadow: message.aiGenerated
                  ? '0 2px 8px rgba(34,197,94,0.25)'
                  : '0 2px 8px rgba(59,130,246,0.25)',
              }
            : {
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '18px 18px 18px 4px',
                padding: '9px 14px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }
        }
      >
        {message.type === 'audio' && (
          <div className="flex items-center gap-2 mb-1.5">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: isOutbound ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}
              fill="currentColor" viewBox="0 0 24 24"
            >
              <path d="M12 3a9 9 0 00-9 9v7a1 1 0 002 0v-7a7 7 0 1114 0v7a1 1 0 002 0v-7a9 9 0 00-9-9z"/>
            </svg>
            <span
              className="text-[11px] font-medium"
              style={{ color: isOutbound ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}
            >
              Voice message
            </span>
          </div>
        )}
        {message.transcription && (
          <p
            className="text-[11px] mb-1.5 italic leading-relaxed"
            style={{ color: isOutbound ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}
          >
            &ldquo;{message.transcription}&rdquo;
          </p>
        )}
        {message.textBody && (
          <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed font-medium">
            {message.textBody}
          </p>
        )}
        <div className="flex items-center justify-end gap-1.5 mt-1.5">
          {message.aiGenerated && isOutbound && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
            >
              AI
            </span>
          )}
          {message.aiGenerated && !isOutbound && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}
            >
              AI
            </span>
          )}
          <span
            className="text-[10px] font-medium"
            style={{ color: isOutbound ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}
          >
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
