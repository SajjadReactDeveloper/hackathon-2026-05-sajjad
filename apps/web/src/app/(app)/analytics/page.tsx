import { apiClient } from '@/lib/api-client';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { MessagesChart } from '@/components/dashboard/messages-chart';
import { Heatmap } from '@/components/dashboard/heatmap';

interface Workspace { id: string; name: string }
interface Tiles {
  todayRevenueCents: number;
  weekRevenueCents: number;
  monthRevenueCents: number;
  totalMessages: number;
  aiReplyRate: number;
  openConversations: number;
  totalOrders: number;
}
interface DailyRevenue  { day: string; revenueCents: number; orderCount: number }
interface DailyMessages { day: string; inboundCount: number; outboundCount: number; aiCount: number }
interface HeatmapCell   { hour: number; dayOfWeek: number; count: number }

const STAT_CONFIGS: Array<{
  key: keyof Tiles;
  label: string;
  sub: string;
  gradient: string;
  shadow: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'totalOrders',
    label: 'Total Orders',
    sub: 'across all channels',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
    shadow: 'rgba(139,92,246,0.3)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    key: 'totalMessages',
    label: 'Total Messages',
    sub: 'processed all time',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
    shadow: 'rgba(6,182,212,0.3)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    key: 'aiReplyRate',
    label: 'AI Reply Rate',
    sub: 'automated responses',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
    shadow: 'rgba(236,72,153,0.3)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    key: 'openConversations',
    label: 'Open Chats',
    sub: 'awaiting reply',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
    shadow: 'rgba(245,158,11,0.3)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
];

function formatValue(key: keyof Tiles, tiles: Tiles): string {
  switch (key) {
    case 'totalOrders':       return tiles.totalOrders.toString();
    case 'totalMessages':     return tiles.totalMessages.toLocaleString();
    case 'aiReplyRate':       return `${tiles.aiReplyRate}%`;
    case 'openConversations': return tiles.openConversations.toString();
    default:                  return '0';
  }
}

export default async function AnalyticsPage() {
  let tiles: Tiles = {
    todayRevenueCents: 0,
    weekRevenueCents: 0,
    monthRevenueCents: 0,
    totalMessages: 0,
    aiReplyRate: 0,
    openConversations: 0,
    totalOrders: 0,
  };
  let revenueData:  DailyRevenue[]  = [];
  let messagesData: DailyMessages[] = [];
  let heatmapData:  HeatmapCell[]   = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      const wid = workspace.id;
      const [t, r, m, h] = await Promise.all([
        apiClient<Tiles>('/analytics/tiles',              { workspaceId: wid }),
        apiClient<DailyRevenue[]>('/analytics/revenue',   { workspaceId: wid }),
        apiClient<DailyMessages[]>('/analytics/messages', { workspaceId: wid }),
        apiClient<HeatmapCell[]>('/analytics/heatmap',    { workspaceId: wid }),
      ]);
      tiles = t;
      revenueData = r;
      messagesData = m;
      heatmapData = h;
    }
  } catch { /* show zeros */ }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="px-7 pt-7 pb-5">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Historical trends, message volume, and activity patterns.</p>
      </div>

      <div className="px-7 pb-7 space-y-5">
        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CONFIGS.map(({ key, label, sub, gradient, shadow, icon }) => (
            <div
              key={key}
              className="relative overflow-hidden rounded-2xl p-5 text-white"
              style={{
                background: gradient,
                boxShadow: `0 4px 16px ${shadow}, 0 1px 4px rgba(0,0,0,0.12)`,
              }}
            >
              {/* Decorative circles */}
              <div
                className="absolute -right-4 -top-4 w-20 h-20 rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              />
              <div
                className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />

              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {label}
                  </p>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    {icon}
                  </div>
                </div>
                <p className="text-[26px] font-bold leading-none tracking-tight num">
                  {formatValue(key, tiles)}
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RevenueChart data={revenueData} />
          <MessagesChart data={messagesData} />
        </div>

        {/* Heatmap */}
        <Heatmap data={heatmapData} />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
