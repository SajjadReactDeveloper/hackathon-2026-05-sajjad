'use client';

import { usePathname } from 'next/navigation';
import { NotificationBell } from './notification-bell';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':      { title: 'Dashboard',       subtitle: 'Revenue Brain overview' },
  '/inbox':          { title: 'Inbox',            subtitle: 'Your WhatsApp conversations' },
  '/orders':         { title: 'Orders',           subtitle: 'Track and manage customer orders' },
  '/contacts':       { title: 'Contacts',         subtitle: 'Your customer directory' },
  '/products':       { title: 'Products',         subtitle: 'Manage your product catalog' },
  '/knowledge-base': { title: 'Knowledge Base',   subtitle: 'Upload PDFs to ground AI replies' },
  '/rules':          { title: 'Auto Rules',        subtitle: 'Regex triggers that run before AI' },
  '/flows':          { title: 'Flow Builder',      subtitle: 'Visual automation canvas' },
  '/lost-sales':     { title: 'Lost Sales',        subtitle: 'Recover stale buying-intent chats' },
  '/broadcasts':     { title: 'Broadcasts',        subtitle: 'Send bulk WhatsApp messages' },
  '/analytics':      { title: 'Analytics',         subtitle: 'Deep cohort and revenue analysis' },
  '/settings':       { title: 'Settings',          subtitle: 'Business, AI, WhatsApp & voice config' },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface Props {
  userName: string;
  userInitials: string;
  userRole?: string;
  workspaceId?: string;
}

export function TopHeader({ userName, userInitials, userRole = 'Super Admin', workspaceId }: Props) {
  const pathname = usePathname();

  const matchedKey = Object.keys(PAGE_META)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || pathname.startsWith(k + '/'));

  const meta = matchedKey ? PAGE_META[matchedKey]! : { title: 'FlowChat', subtitle: 'Revenue Brain' };

  const displayName = userName.includes('@') ? userName.split('@')[0]! : userName;
  const prettyName = displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/[._-]/g, ' ');

  return (
    <header
      className="shrink-0 flex items-center gap-4 px-6 border-b"
      style={{
        height: 60,
        background: '#ffffff',
        borderColor: 'rgba(0,0,0,0.06)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}
    >
      {/* Left — page title + greeting */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none truncate">
            {meta.title}
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
          {greeting()}, {prettyName}! &nbsp;{meta.subtitle}.
        </p>
      </div>

      {/* Center — search */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 200 }}>
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-[12px] text-slate-700 placeholder-slate-400 outline-none flex-1 min-w-0"
        />
      </div>

      {/* Right — notifications + user */}
      <div className="flex items-center gap-2 shrink-0">
        {workspaceId ? (
          <NotificationBell workspaceId={workspaceId} />
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f8fafc' }}>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-5" style={{ background: '#e2e8f0' }} />

        {/* User info */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #22c55e, #059669)', boxShadow: '0 2px 6px rgba(34,197,94,0.3)' }}
          >
            {userInitials}
          </div>
          <div className="hidden md:block leading-none">
            <p className="text-[12px] font-semibold text-slate-800 leading-none">{prettyName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
