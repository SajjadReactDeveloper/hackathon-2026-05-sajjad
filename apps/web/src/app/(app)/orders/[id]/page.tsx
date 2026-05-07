import type React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Workspace { id: string }

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  productId: string | null;
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
  notes: string | null;
  createdAt: string;
  contact: { id: string; waPhone: string; displayName: string | null } | null;
  items: OrderItem[];
}

interface PageProps { params: Promise<{ id: string }> }

function formatPKR(cents: number): string {
  return `PKR${(cents / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:    { background: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  confirmed:  { background: 'rgba(59,130,246,0.1)',  color: '#2563eb' },
  processing: { background: 'rgba(99,102,241,0.1)',  color: '#4f46e5' },
  shipped:    { background: 'rgba(139,92,246,0.1)',  color: '#7c3aed' },
  delivered:  { background: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  cancelled:  { background: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  returned:   { background: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

const VIA_LABELS: Record<string, string> = {
  voice_note: 'Voice Note',
  image: 'Product Image',
  ai_parser: 'AI Parser',
  manual: 'Manual Entry',
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  let order: Order | null = null;
  let workspaceId = '';

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (!workspace) return notFound();
    workspaceId = workspace.id;
    order = await apiClient<Order>(`/orders/${id}`, { workspaceId });
  } catch {
    return notFound();
  }

  if (!order) return notFound();

  const fraudScore = order.fraudScore ?? 0;
  const fraudStyle = fraudScore < 30
    ? { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)', color: '#16a34a', bar: '#22c55e' }
    : fraudScore < 60
    ? { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', color: '#d97706', bar: '#f59e0b' }
    : { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', color: '#dc2626', bar: '#ef4444' };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    borderRadius: 16,
  };

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/orders"
          className="text-[12px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
        >
          Orders
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-[12px] font-semibold text-slate-700">{order.orderNumber}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Order details card */}
        <div className="p-5 space-y-3" style={cardStyle}>
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Order Details</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-slate-500 font-medium">Status</span>
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold capitalize"
                style={STATUS_STYLES[order.status] ?? { background: 'rgba(100,116,139,0.1)', color: '#64748b' }}
              >
                {order.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-slate-500 font-medium">Total</span>
              <span className="text-[13px] font-bold text-slate-900 num">{formatPKR(order.totalCents)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-slate-500 font-medium">Created via</span>
              <span className="text-[12px] text-slate-700 font-medium">{VIA_LABELS[order.createdVia] ?? order.createdVia}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-slate-500 font-medium">Date</span>
              <span className="text-[12px] text-slate-700 num">
                {new Date(order.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {order.contact && (
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-500 font-medium">Customer</span>
                <span className="text-[12px] text-slate-700 font-medium">
                  {order.contact.displayName ?? order.contact.waPhone}
                </span>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex justify-between gap-3">
                <span className="text-[12px] text-slate-500 font-medium shrink-0">Address</span>
                <span className="text-[12px] text-slate-700 text-right">{order.deliveryAddress}</span>
              </div>
            )}
            {order.notes && (
              <div className="flex justify-between gap-3">
                <span className="text-[12px] text-slate-500 font-medium shrink-0">Notes</span>
                <span className="text-[12px] text-slate-700 text-right">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fraud score card */}
        <div
          className="p-5"
          style={{
            borderRadius: 16,
            background: fraudStyle.bg,
            border: `1px solid ${fraudStyle.border}`,
          }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ color: fraudStyle.color, opacity: 0.7 }}
          >
            COD Fraud Score
          </h2>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-[40px] font-bold leading-none num" style={{ color: fraudStyle.color }}>{fraudScore}</span>
            <span className="text-[13px] font-medium mb-1" style={{ color: fraudStyle.color, opacity: 0.6 }}>/ 100</span>
          </div>
          <div className="w-full rounded-full h-1.5 mb-4" style={{ background: `${fraudStyle.bar}20` }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${fraudScore}%`, background: fraudStyle.bar }}
            />
          </div>
          {Array.isArray(order.fraudSignals) && order.fraudSignals.length > 0 ? (
            <ul className="space-y-1.5">
              {order.fraudSignals.map((signal, i) => (
                <li key={i} className="text-[12px] flex items-start gap-1.5" style={{ color: fraudStyle.color, opacity: 0.8 }}>
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] font-medium" style={{ color: fraudStyle.color, opacity: 0.65 }}>No fraud signals detected</p>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div
          className="px-5 py-3.5"
          style={{ borderBottom: '1px solid #f1f5f9' }}
        >
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Order Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item</th>
              <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</th>
              <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Price</th>
              <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td className="px-5 py-3 text-[13px] text-slate-900 font-medium">{item.name}</td>
                <td className="px-5 py-3 text-right text-[13px] text-slate-700 num">{item.quantity}</td>
                <td className="px-5 py-3 text-right text-[13px] text-slate-700 num">
                  {item.unitPriceCents ? formatPKR(item.unitPriceCents) : '—'}
                </td>
                <td className="px-5 py-3 text-right text-[13px] font-semibold text-slate-900 num">
                  {item.lineTotalCents ? formatPKR(item.lineTotalCents) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <td colSpan={3} className="px-5 py-3 text-right text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total</td>
              <td className="px-5 py-3 text-right text-[14px] font-bold text-slate-900 num">{formatPKR(order.totalCents)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
