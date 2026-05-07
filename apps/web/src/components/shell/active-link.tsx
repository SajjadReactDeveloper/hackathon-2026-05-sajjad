'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  href: string;
  icon: ReactNode;
  label: string;
}

export function ActiveLink({ href, icon, label }: Props) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative group"
      style={active ? {
        background: 'rgba(34,197,94,0.12)',
        color: '#86efac',
      } : {
        color: 'rgba(148,163,184,0.75)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(226,232,240,0.9)';
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(148,163,184,0.75)';
          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
        }
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
          style={{ background: '#22c55e' }}
        />
      )}
      <span className="shrink-0" style={{ color: active ? '#86efac' : 'rgba(100,116,139,0.9)' }}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
