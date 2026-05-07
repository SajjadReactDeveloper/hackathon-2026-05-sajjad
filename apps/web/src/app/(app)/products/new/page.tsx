'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { browserApiClient } from '@/lib/browser-api-client';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Workspace { id: string }
interface Product {
  id: string;
  sku: string;
  name: string;
}

type SaveStatus = 'idle' | 'saving' | 'done' | 'error';

export default function NewProductPage() {
  const router = useRouter();

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    browserApiClient<Workspace[]>('/workspaces/me')
      .then((ws) => { if (ws[0]) setWorkspaceId(ws[0].id); })
      .catch(() => { /* will show error on submit */ });
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Product name is required.'); return; }
    if (!sku.trim()) { setError('SKU is required.'); return; }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('Enter a valid price in PKR.'); return; }
    if (!workspaceId) { setError('Workspace not found. Please refresh and try again.'); return; }

    setSaveStatus('saving');
    try {
      const created = await browserApiClient<Product>('/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          priceCents: Math.round(priceNum * 100),
          stock: parseInt(stock, 10) || 0,
          active,
        }),
        workspaceId,
      });

      if (imageFile) {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        const formData = new FormData();
        formData.append('file', imageFile);
        await fetch(`${API_URL}/products/${created.id}/image`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            'x-workspace-id': workspaceId,
          },
          body: formData,
        });
      }

      setSaveStatus('done');
      router.push('/products');
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    }
  }

  const inputBase: React.CSSProperties = {
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    color: '#0f172a',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 13,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
  };

  return (
    <div className="min-h-full">
      <div className="px-7 pt-7 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.push('/products')}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Products
          </button>
          <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-[12px] font-semibold text-slate-700">New product</span>
        </div>
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none mt-2">Add Product</h1>
        <p className="text-sm text-slate-500 mt-1">New products are immediately available for AI price and stock queries.</p>
      </div>

      <div className="px-7 pb-7">
        <form onSubmit={(e) => { void handleSubmit(e); }} className="max-w-2xl space-y-5">

          {/* Image + details card */}
          <div className="rounded-2xl p-5 space-y-5" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Product details</p>

            {/* Image upload */}
            <div>
              <label style={labelStyle}>Product image</label>
              <label className="flex items-center gap-4 cursor-pointer group">
                <div
                  className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden shrink-0 transition-all"
                  style={{ background: '#f1f5f9', border: '2px dashed #e2e8f0' }}
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <svg className="w-7 h-7 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18.75 9.75h.008v.008h-.008V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-6.75 2.625a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {imagePreview ? 'Change image' : 'Upload image'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    JPG or PNG, up to 5 MB. Sent to customers when they ask about this product.
                  </p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            {/* Name */}
            <div>
              <label style={labelStyle}>
                Product name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lawn Suit — Navy Blue"
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Shown to AI and customers. Include material, sizes, available colours, care instructions, etc."
                style={{ ...inputBase, resize: 'none', lineHeight: '1.6' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Pricing + Inventory */}
          <div className="rounded-2xl p-5 space-y-5" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Pricing & inventory</p>

            <div className="grid grid-cols-3 gap-4">
              {/* SKU */}
              <div>
                <label style={labelStyle}>
                  SKU <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="LAWN-001"
                  style={{ ...inputBase, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Price */}
              <div>
                <label style={labelStyle}>
                  Price (PKR) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold select-none"
                    style={{ color: '#94a3b8' }}
                  >
                    ₨
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="3500"
                    style={{ ...inputBase, paddingLeft: 28 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label style={labelStyle}>Stock qty</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  style={inputBase}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                className="relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                style={{ background: active ? '#22c55e' : '#e2e8f0' }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: active ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </button>
              <div>
                <p className="text-[13px] font-semibold text-slate-700">Active</p>
                <p className="text-[11px] text-slate-400">Inactive products are hidden from AI and customers.</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(239,68,68,0.07)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: '0 2px 10px rgba(34,197,94,0.35)',
              }}
            >
              {saveStatus === 'saving' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add product
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
