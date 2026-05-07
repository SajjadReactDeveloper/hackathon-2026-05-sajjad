import { SettingsTabs } from '@/components/shell/settings-tabs';

const TABS = [
  { href: '/settings/business', label: 'Business' },
  { href: '/settings/ai',       label: 'AI Config' },
  { href: '/settings/whatsapp', label: 'WhatsApp' },
  { href: '/settings/voice',    label: 'Voice Clone' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      {/* Settings header with tab bar */}
      <div
        className="px-7 pt-7 pb-0"
        style={{ background: '#f1f5f9' }}
      >
        <div className="mb-4">
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your workspace configuration.</p>
        </div>

        {/* Tab bar */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl"
          style={{
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
          }}
        >
          <SettingsTabs tabs={TABS} />
        </div>

        {/* Separator line below tabs */}
        <div className="mt-5 h-px" style={{ background: 'rgba(0,0,0,0.06)' }} />
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
