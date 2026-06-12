import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../utils/api'
import type { Page, Product, ProductListResponse } from '../types'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  in_stock:  { label: 'In Stock',     cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  low_stock: { label: 'Low Stock',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  stockout:  { label: 'Out of Stock', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

type Draft = Partial<Product>

const EMPTY_DRAFT: Draft = {
  name: '', sku: '', description: '', price: 0, currency: 'USD',
  stock_qty: 0, low_stock_threshold: 3, is_active: true,
}

export default function Inventory() {
  const { logout } = useAuth() as unknown as { logout: () => void }
  const navigate = useNavigate()

  const [pages, setPages] = useState<Page[]>([])
  const [selected, setSelected] = useState<Page | null>(null)
  const [data, setData] = useState<ProductListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { void fetchPages() }, [])
  useEffect(() => { if (selected) void fetchProducts() }, [selected])

  const fetchPages = async () => {
    try {
      const r = await api.get<{ pages: Page[] }>('/pages/')
      setPages(r.data.pages)
      if (r.data.pages.length) setSelected(r.data.pages[0])
    } catch (e: any) {
      if (e.response?.status === 401) { logout(); navigate('/login') }
    }
  }

  const fetchProducts = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const r = await api.get<ProductListResponse>(`/inventory/${selected.id}/products`)
      setData(r.data)
    } catch { setData(null) } finally { setLoading(false) }
  }

  const saveDraft = async () => {
    if (!selected || !editing?.name?.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: editing.name, sku: editing.sku || null, description: editing.description || null,
        price: Number(editing.price) || 0, currency: editing.currency || 'USD',
        stock_qty: Number(editing.stock_qty) || 0,
        low_stock_threshold: Number(editing.low_stock_threshold) || 0,
        image_url: editing.image_url || null, is_active: editing.is_active ?? true,
      }
      if (editing.id) await api.put(`/inventory/${selected.id}/products/${editing.id}`, payload)
      else await api.post(`/inventory/${selected.id}/products`, payload)
      setEditing(null)
      await fetchProducts()
    } finally { setSaving(false) }
  }

  const adjustStock = async (p: Product, delta: number) => {
    if (!selected) return
    await api.patch(`/inventory/${selected.id}/products/${p.id}/stock`, { delta })
    await fetchProducts()
  }

  const remove = async (p: Product) => {
    if (!selected || !confirm(`Delete "${p.name}"?`)) return
    await api.delete(`/inventory/${selected.id}/products/${p.id}`)
    await fetchProducts()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e2f0]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a2a38] bg-[#111118] px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-3 py-1.5 text-sm text-[#8888aa] hover:text-white">
            ← Dashboard
          </button>
          <span className="text-lg font-bold">⚡ PageSync
            <span className="ml-1.5 bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] bg-clip-text text-sm font-bold text-transparent">Inventory</span>
          </span>
        </div>
        {selected && (
          <button onClick={() => setEditing({ ...EMPTY_DRAFT })}
            className="rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4059d6]">
            + Add Product
          </button>
        )}
      </header>

      <div className="flex min-h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-[#2a2a38] bg-[#111118] p-3">
          <div className="mb-3 px-2 text-xs tracking-wider text-[#8888aa]">PAGES</div>
          {pages.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border p-2 text-left ${
                selected?.id === p.id ? 'border-[#4f6ef7] bg-[#1a1a24]' : 'border-transparent hover:bg-[#1a1a24]'}`}>
              {p.picture
                ? <img src={p.picture} alt="" className="h-8 w-8 rounded-md object-cover" />
                : <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] text-sm font-bold">{p.name[0]}</div>}
              <div className="truncate text-sm font-semibold">{p.name}</div>
            </button>
          ))}
          {pages.length === 0 && <p className="px-2 text-sm text-[#8888aa]">No pages connected.</p>}
        </aside>

        {/* Main */}
        <main className="flex-1 p-6">
          {!selected ? (
            <p className="py-12 text-center text-[#8888aa]">Select a page to manage its inventory.</p>
          ) : (
            <>
              {/* Stats */}
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat n={data?.total ?? 0} label="Products" />
                <Stat n={data?.in_stock ?? 0} label="In stock" color="text-emerald-400" />
                <Stat n={data?.low_stock ?? 0} label="Low stock" color="text-amber-400" />
                <Stat n={data?.stockout ?? 0} label="Out of stock" color="text-red-400" />
              </div>

              {loading ? (
                <p className="py-12 text-center text-[#8888aa]">Loading…</p>
              ) : (data?.products.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-[#2a2a38] py-16 text-center">
                  <div className="text-4xl">📦</div>
                  <h3 className="mt-2 font-semibold">No products yet</h3>
                  <p className="mt-1 text-sm text-[#8888aa]">Add products so the AI agent can quote real prices and live stock.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data!.products.map((p) => {
                    const badge = STATUS_BADGE[p.status]
                    return (
                      <div key={p.id} className="flex flex-col rounded-xl border border-[#2a2a38] bg-[#111118] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{p.name}</div>
                            {p.sku && <div className="text-xs text-[#8888aa]">SKU {p.sku}</div>}
                          </div>
                          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                        </div>
                        {p.description && <p className="mt-1.5 line-clamp-2 text-sm text-[#8888aa]">{p.description}</p>}
                        <div className="mt-3 flex items-end justify-between">
                          <div className="text-lg font-bold">{p.price.toFixed(2)} <span className="text-sm font-normal text-[#8888aa]">{p.currency}</span></div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => void adjustStock(p, -1)} className="h-7 w-7 rounded-md border border-[#2a2a38] bg-[#1a1a24] text-[#8888aa] hover:text-white">−</button>
                            <span className="w-10 text-center font-mono">{p.stock_qty}</span>
                            <button onClick={() => void adjustStock(p, +1)} className="h-7 w-7 rounded-md border border-[#2a2a38] bg-[#1a1a24] text-[#8888aa] hover:text-white">+</button>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2 border-t border-[#2a2a38] pt-3">
                          <button onClick={() => setEditing({ ...p })} className="flex-1 rounded-md border border-[#2a2a38] bg-[#1a1a24] py-1.5 text-sm text-[#8888aa] hover:text-white">Edit</button>
                          <button onClick={() => void remove(p)} className="rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10">Delete</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Add/Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-[#2a2a38] bg-[#111118] p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">{editing.id ? 'Edit product' : 'Add product'}</h2>
            <div className="space-y-3">
              <Field label="Name">
                <input className={inputCls} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU"><input className={inputCls} value={editing.sku || ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></Field>
                <Field label="Currency"><input className={inputCls} value={editing.currency || ''} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} /></Field>
              </div>
              <Field label="Description">
                <textarea rows={2} className={inputCls} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Price"><input type="number" step="0.01" className={inputCls} value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) })} /></Field>
                <Field label="Stock qty"><input type="number" className={inputCls} value={editing.stock_qty ?? 0} onChange={(e) => setEditing({ ...editing, stock_qty: parseInt(e.target.value) })} /></Field>
                <Field label="Low at"><input type="number" className={inputCls} value={editing.low_stock_threshold ?? 0} onChange={(e) => setEditing({ ...editing, low_stock_threshold: parseInt(e.target.value) })} /></Field>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-4 py-2 text-sm text-[#8888aa]">Cancel</button>
              <button onClick={() => void saveDraft()} disabled={saving || !editing.name?.trim()}
                className="rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-[#2a2a38] bg-[#0a0a0f] px-3 py-2 text-sm outline-none focus:border-[#4f6ef7]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#8888aa]">{label}</span>
      {children}
    </label>
  )
}

function Stat({ n, label, color = 'text-white' }: { n: number; label: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[#2a2a38] bg-[#111118] p-4">
      <div className={`text-2xl font-extrabold ${color}`}>{n}</div>
      <div className="mt-0.5 text-xs text-[#8888aa]">{label}</div>
    </div>
  )
}
