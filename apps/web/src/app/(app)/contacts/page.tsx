import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface Workspace { id: string }

interface Contact {
  id: string;
  waPhone: string;
  displayName: string | null;
  profileName: string | null;
  tags: string[];
  lastSeenAt: string | null;
  lifetimeValueCents: string;
  orderCount: number;
}

interface ListResponse {
  items: Contact[];
  total: number;
}

function initials(name: string | null, phone: string) {
  if (name) return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return phone.slice(-2);
}

function formatPKR(cents: string | number) {
  const val = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  if (val === 0) return '—';
  return `PKR${(val / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export default async function ContactsPage() {
  let workspaceId = '';
  let contacts: Contact[] = [];
  let total = 0;

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      const res = await apiClient<ListResponse>('/contacts?limit=50', { workspaceId });
      contacts = res.items;
      total = res.total;
    }
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Contacts</h1>
          <p className="text-sm text-slate-500 mt-1">{total} customer{total !== 1 ? 's' : ''} · all conversations</p>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <p className="text-[13px] text-slate-400 font-medium">No contacts yet. They are created automatically when customers message you on WhatsApp.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Phone</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orders</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">LTV</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Last seen</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const name = contact.displayName ?? contact.profileName ?? contact.waPhone;
                const lastSeen = contact.lastSeenAt
                  ? new Date(contact.lastSeenAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
                  : '—';

                return (
                  <tr
                    key={contact.id}
                    className="group transition-colors"
                    style={{ borderBottom: '1px solid #f8fafc' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#ffffff', boxShadow: '0 2px 6px rgba(34,197,94,0.3)' }}
                        >
                          {initials(contact.displayName ?? contact.profileName, contact.waPhone)}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-900 truncate max-w-[140px]">{name}</p>
                          {contact.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {contact.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                                  style={{ background: '#f1f5f9', color: '#64748b' }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-400 font-mono hidden md:table-cell num">
                      {contact.waPhone}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[13px] font-bold num ${contact.orderCount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                        {contact.orderCount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-700 hidden sm:table-cell num">
                      {formatPKR(contact.lifetimeValueCents)}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-400 hidden lg:table-cell">
                      {lastSeen}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href="/inbox"
                        className="text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#16a34a' }}
                      >
                        View chat
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > 50 && (
            <div
              className="px-5 py-3 text-[11px] text-slate-400 font-medium"
              style={{ borderTop: '1px solid #f1f5f9' }}
            >
              Showing 50 of {total} contacts
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
