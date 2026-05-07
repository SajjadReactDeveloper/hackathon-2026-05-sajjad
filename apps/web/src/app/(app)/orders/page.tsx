import Link from 'next/link';
import type React from 'react';
import { apiClient } from '@/lib/api-client';

interface Workspace { id: string }

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdVia: string;
  fraudScore: number;
  fraudSignals: string[];
  deliveryAddress: string | null;
  createdAt: string;
  contact: { id: string; waPhone: string; displayName: string | null } | null;
  items: OrderItem[];
}

interface OrdersResponse { items: Order[]; total: number }

function fraudBadge(score: number) {
  if (score < 30) return { label: 'Low', style: { background: 'rgba(34,197,94,0.1)', color: '#16a34a' } };
  if (score < 60) return { label: 'Med', style: { background: 'rgba(245,158,11,0.1)', color: '#d97706' } };
  return { label: 'High', style: { background: 'rgba(239,68,68,0.1)', color: '#dc2626' } };
}

function formatPKR(cents: number): string {
  return `PKR${(cents / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const VIA_LABELS: Record<string, string> = {
  voice_note: 'Voice Note',
  image: 'Image',
  ai_parser: 'AI Parser',
  manual: 'Manual',
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:    { background: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  confirmed:  { background: 'rgba(59,130,246,0.1)',  color: '#2563eb' },
  processing: { background: 'rgba(99,102,241,0.1)',  color: '#4f46e5' },
  shipped:    { background: 'rgba(139,92,246,0.1)',  color: '#7c3aed' },
  delivered:  { background: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  cancelled:  { background: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  returned:   { background: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

export default async function OrdersPage() {
  let workspaceId = '';
  let orders: Order[] = [];
  let total = 0;

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      const data = await apiClient<OrdersResponse>('/orders?page=1&limit=50', { workspaceId });
      orders = data.items;
      total = data.total;
    }
  } catch {
    // show empty state
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">{total} total orders · all channels</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center h-64 gap-3 text-center"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: '#f8fafc' }}
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-slate-700">No orders yet</p>
          <p className="text-[12px] text-slate-400 max-w-[220px] leading-relaxed">Orders created via voice note, image, or AI will appear here.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Via</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const fraud = fraudBadge(order.fraudScore ?? 0);
                const statusStyle = STATUS_STYLES[order.status] ?? { background: 'rgba(100,116,139,0.1)', color: '#64748b' };
                return (
                  <tr
                    key={order.id}
                    className="group transition-colors"
                    style={{ borderBottom: '1px solid #f8fafc' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-[13px] font-bold hover:underline"
                        style={{ color: '#16a34a' }}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-slate-700 font-medium">
                      {order.contact?.displayName ?? order.contact?.waPhone ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-md font-semibold"
                        style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                      >
                        {VIA_LABELS[order.createdVia] ?? order.createdVia}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-bold text-slate-900 num">
                      {formatPKR(order.totalCents)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold capitalize"
                        style={statusStyle}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold num"
                        style={fraud.style}
                      >
                        {fraud.label} · {order.fraudScore}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-400 num">
                      {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
