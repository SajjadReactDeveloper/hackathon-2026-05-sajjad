'use client';

import type React from 'react';
import { useState, useRef } from 'react';
import { browserApiClient } from '@/lib/browser-api-client';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: string;
  stock: number;
  active: boolean;
}

interface Props {
  workspaceId: string;
  initialProducts: Product[];
}

type FormData = {
  sku: string;
  name: string;
  description: string;
  priceCents: string;
  stock: string;
  active: boolean;
};

const EMPTY_FORM: FormData = { sku: '', name: '', description: '', priceCents: '', stock: '0', active: true };

function formatPKR(cents: string | number) {
  const val = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  return `PKR${(val / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function ProductsClient({ workspaceId, initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description ?? '',
      priceCents: String(parseInt(p.priceCents, 10) / 100),
      stock: String(p.stock),
      active: p.active,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sku.trim() || !form.priceCents) {
      setError('Name, SKU, and price are required.');
      return;
    }
    const price = parseFloat(form.priceCents);
    if (isNaN(price) || price <= 0) { setError('Enter a valid price.'); return; }

    setSaving(true);
    setError(null);
    try {
      const body = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceCents: Math.round(price * 100),
        stock: parseInt(form.stock, 10) || 0,
        active: form.active,
      };

      if (editingId) {
        const updated = await browserApiClient<Product>(`/products/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
          workspaceId,
        });
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await browserApiClient<Product>('/products', {
          method: 'POST',
          body: JSON.stringify(body),
          workspaceId,
        });
        setProducts((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File, productId: string) {
    setUploadingId(productId);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/products/${productId}/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          'x-workspace-id': workspaceId,
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const updated = (await res.json()) as Product;
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    } catch {
      // silent — image upload is best-effort
    } finally {
      setUploadingId(null);
      setImageTargetId(null);
    }
  }

  async function handleToggleActive(p: Product) {
    try {
      const updated = await browserApiClient<Product>(`/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !p.active }),
        workspaceId,
      });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    try {
      await browserApiClient<void>(`/products/${id}`, { method: 'DELETE', workspaceId });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch { /* silent */ }
  }

  const inputStyle: React.CSSProperties = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#0f172a',
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 13,
    outline: 'none',
    width: '100%',
  };

  return (
    <div>
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && imageTargetId) void handleImageUpload(f, imageTargetId);
          e.target.value = '';
        }}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Products</h1>
          <p className="text-sm text-slate-500 mt-1">{products.length} product{products.length !== 1 ? 's' : ''} · AI uses these for price and stock queries</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 text-[13px] font-semibold text-white px-4 py-2 rounded-xl transition-all"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <svg className="w-10 h-10 mx-auto mb-3" style={{ color: '#e2e8f0' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-[13px] font-semibold text-slate-700">No products yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Add one to enable AI price and stock lookups.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                opacity: p.active ? 1 : 0.55,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)'; }}
            >
              {/* Image area */}
              <div
                className="relative h-40 flex items-center justify-center cursor-pointer group"
                style={{ background: '#f8fafc' }}
                onClick={() => { setImageTargetId(p.id); imageRef.current?.click(); }}
              >
                {uploadingId === p.id ? (
                  <svg className="w-6 h-6 animate-spin" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5" style={{ color: '#cbd5e1' }}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="text-[11px] font-medium">Add image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-[11px] text-white font-semibold bg-black/50 px-2.5 py-1 rounded-full transition-opacity">
                    Change image
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p.sku}</p>
                  </div>
                  <p className="text-[13px] font-bold shrink-0" style={{ color: '#16a34a' }}>{formatPKR(p.priceCents)}</p>
                </div>

                {p.description && (
                  <p className="text-[12px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span
                    className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                    style={
                      p.stock > 5
                        ? { background: 'rgba(34,197,94,0.1)', color: '#16a34a' }
                        : p.stock > 0
                        ? { background: 'rgba(245,158,11,0.1)', color: '#d97706' }
                        : { background: 'rgba(239,68,68,0.1)', color: '#dc2626' }
                    }
                  >
                    {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(p)}
                      title={p.active ? 'Deactivate' : 'Activate'}
                      className="relative inline-flex h-4 w-7 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                      style={{ background: p.active ? '#22c55e' : '#e2e8f0' }}
                    >
                      <span
                        className="inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform"
                        style={{ transform: p.active ? 'translateX(12px)' : 'translateX(0)' }}
                      />
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-md rounded-2xl"
            style={{ background: '#ffffff', boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)' }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="text-[15px] font-bold text-slate-900">{editingId ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Lawn Suit — Navy Blue"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="LAWN-001"
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (PKR)</label>
                  <input
                    type="number"
                    value={form.priceCents}
                    onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))}
                    placeholder="3500"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                    className="relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                    style={{ background: form.active ? '#22c55e' : '#e2e8f0' }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                      style={{ transform: form.active ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </button>
                  <span className="text-[12px] font-semibold text-slate-700">Active</span>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Brief description shown to AI and customers..."
                    style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }}
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {error && (
                <p
                  className="text-[12px] font-semibold px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  {error}
                </p>
              )}
            </div>

            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors rounded-xl"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                }}
              >
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
