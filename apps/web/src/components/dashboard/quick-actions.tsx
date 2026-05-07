'use client';

import Link from 'next/link';
import { useState } from 'react';

const ACTIONS = [
  {
    href: '/inbox',
    label: 'Open Inbox',
    desc: 'Reply to customers',
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    shadow: 'rgba(34,197,94,0.25)',
    iconPath: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  },
  {
    href: '/lost-sales',
    label: 'Lost Sales',
    desc: 'Recover dropped leads',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    shadow: 'rgba(245,158,11,0.25)',
    iconPath: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  {
    href: '/knowledge-base',
    label: 'Knowledge Base',
    desc: 'Upload business docs',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    shadow: 'rgba(139,92,246,0.25)',
    iconPath: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  },
  {
    href: '/products',
    label: 'Add Product',
    desc: 'Expand your catalog',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    shadow: 'rgba(6,182,212,0.25)',
    iconPath: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z',
  },
];

const BASE_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)';

function ActionCard({ href, label, desc, gradient, shadow, iconPath }: typeof ACTIONS[number]) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      className="rounded-2xl p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5"
      style={{
        background: '#ffffff',
        boxShadow: hovered ? `0 4px 16px ${shadow}, 0 0 0 1px rgba(0,0,0,0.04)` : BASE_SHADOW,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: gradient, boxShadow: `0 4px 12px ${shadow}` }}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 leading-none">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      <svg className="w-4 h-4 text-slate-300 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

export function QuickActions() {
  return (
    <div>
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ACTIONS.map((action) => (
          <ActionCard key={action.href} {...action} />
        ))}
      </div>
    </div>
  );
}
