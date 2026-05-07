'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  href: string;
  label: string;
}

interface Props {
  tabs: Tab[];
}

export function SettingsTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {tabs.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150"
            style={
              active
                ? {
                    background: 'rgba(34,197,94,0.12)',
                    color: '#16a34a',
                  }
                : {
                    color: '#64748b',
                  }
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
