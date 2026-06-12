import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../utils/api'
import type {
  Page, Product, Order, OrderListResponse, Merchant, PaymentInit, PaymentStatus,
} from '../types'

const ORDER_BADGE: Record<string, string> = {
  pending:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  paid:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  fulfilled: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  expired:   'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}
const inputCls = 'w-full rounded-lg border border-[#2a2a38] bg-[#0a0a0f] px-3 py-2 text-sm outline-none focus:border-[#4f6ef7]'

type Tab = 'orders' | 'new' | 'merchant'

export default function Orders() {
  const { logout } = useAuth() as unknown as { logout: () => void }
  const navigate = useNavigate()

  const [pages, setPages] = useState<Page[]>([])
  const [selected, setSelected] = useState<Page | null>(null)
  const [tab, setTab] = useState<Tab>('orders')

  const [orders, setOrders] = useState<OrderListResponse | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [merchant, setMerchant] = useState<Merchant | null>(null)

  const [cart, setCart] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [delivery, setDelivery] = useState('')
  const [creating, setCreating] = useState(false)

  const [payOrder, setPayOrder] = useState<Order | null>(null)

  useEffect(() => { void fetchPages() }, [])
  useEffect(() => {
    if (selected) { void fetchOrders(); void fetchProducts(); void fetchMerchant() }
  }, [selected])

  const fetchPages = async () => {
    try {
      const r = await api.get<{ pages: Page[] }>('/pages/')
      setPages(r.data.pages)
      if (r.data.pages.length) setSelected(r.data.pages[0])
    } catch (e: any) {
      if (e.response?.status === 401) { logout(); navigate('/login') }
    }
  }
  const fetchOrders = async () => {
    if (!selected) return
    try { setOrders((await api.get<OrderListResponse>(`/commerce/${selected.id}/orders`)).data) }
    catch { setOrders(null) }
  }
  const fetchProducts = async () => {
    if (!selected) return
    try { setProducts((await api.get(`/inventory/${selected.id}/products`)).data.products) }
    catch { setProducts([]) }
  }
  const fetchMerchant = async () => {
    if (!selected) return
    try { setMerchant((await api.get<Merchant>(`/commerce/${selected.id}/merchant`)).data) }
    catch { setMerchant(null) }
  }

  const cartTotal = products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0)
  const cartCurrency = products.find((p) => cart[p.id])?.currency || 'USD'
  const setQty = (id: string, qty: number) =>
    setCart((c) => { const n = { ...c }; if (qty <= 0) delete n[id]; else n[id] = qty; return n })

  const createOrder = async () => {
    if (!selected) return
    const items = Object.entries(cart).map(([product_id, qty]) => ({ product_id, qty }))
    if (!items.length) return
    setCreating(true)
    try {
      await api.post(`/commerce/${selected.id}/orders`, {
        items, customer_name: customerName || null, delivery_info: delivery || null,
      })
      setCart({}); setCustomerName(''); setDelivery('')
      await fetchOrders()
      setTab('orders')
    } finally { setCreating(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e2f0]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a2a38] bg-[#111118] px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-3 py-1.5 text-sm text-[#8888aa] hover:text-white">← Dashboard</button>
          <span className="text-lg font-bold">⚡ PageSync
            <span className="ml-1.5 bg-gradient-to-r from-[#4f6ef7] to-[#7c3aed] bg-clip-text text-sm font-bold text-transparent">Checkout & Payments</span>
          </span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-65px)]">
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
        </aside>

        <main className="flex-1 p-6">
          {!selected ? (
            <p className="py-12 text-center text-[#8888aa]">Select a page.</p>
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-5 flex gap-2">
                {(['orders', 'new', 'merchant'] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                      tab === t ? 'border-[#4f6ef7] bg-[#1a1a24] text-white' : 'border-[#2a2a38] bg-[#111118] text-[#8888aa]'}`}>
                    {t === 'orders' ? '🧾 Orders' : t === 'new' ? '➕ New Order' : '🏦 Merchant'}
                  </button>
                ))}
              </div>

              {tab === 'orders' && (
                <>
                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat n={orders?.total ?? 0} label="Orders" />
                    <Stat n={orders?.pending ?? 0} label="Pending" color="text-amber-400" />
                    <Stat n={orders?.paid ?? 0} label="Paid" color="text-emerald-400" />
                    <Stat n={orders?.revenue ?? 0} label="Revenue" color="text-emerald-400" money />
                  </div>
                  {(orders?.orders.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#2a2a38] py-16 text-center">
                      <div className="text-4xl">🧾</div>
                      <h3 className="mt-2 font-semibold">No orders yet</h3>
                      <p className="mt-1 text-sm text-[#8888aa]">Create an order to generate a KHQR invoice.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orders!.orders.map((o) => (
                        <div key={o.id} className="flex items-center gap-4 rounded-xl border border-[#2a2a38] bg-[#111118] p-4">
                          <div className="font-mono text-xs text-[#8888aa]">#{o.id.slice(-6)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</div>
                            <div className="text-xs text-[#8888aa]">
                              {o.customer_name || 'Walk-in'} · {new Date(o.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{o.total.toFixed(2)} {o.currency}</div>
                            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${ORDER_BADGE[o.status]}`}>{o.status}</span>
                          </div>
                          {o.status === 'pending' && (
                            <button onClick={() => setPayOrder(o)}
                              className="rounded-lg bg-[#4f6ef7] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4059d6]">
                              💳 Pay (KHQR)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'new' && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
                  <div>
                    <h3 className="mb-3 font-semibold">Select products</h3>
                    {products.length === 0 ? (
                      <p className="text-sm text-[#8888aa]">No products. Add some in Inventory first.</p>
                    ) : (
                      <div className="space-y-2">
                        {products.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-[#2a2a38] bg-[#111118] p-3">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{p.name}</div>
                              <div className="text-xs text-[#8888aa]">{p.price.toFixed(2)} {p.currency} · {p.stock_qty} in stock</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setQty(p.id, (cart[p.id] || 0) - 1)} className="h-7 w-7 rounded-md border border-[#2a2a38] bg-[#1a1a24]">−</button>
                              <span className="w-8 text-center font-mono">{cart[p.id] || 0}</span>
                              <button onClick={() => setQty(p.id, (cart[p.id] || 0) + 1)} disabled={(cart[p.id] || 0) >= p.stock_qty}
                                className="h-7 w-7 rounded-md border border-[#2a2a38] bg-[#1a1a24] disabled:opacity-40">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-fit rounded-xl border border-[#2a2a38] bg-[#111118] p-4">
                    <h3 className="mb-3 font-semibold">Invoice</h3>
                    <label className="mb-2 block">
                      <span className="mb-1 block text-xs text-[#8888aa]">Customer name</span>
                      <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </label>
                    <label className="mb-3 block">
                      <span className="mb-1 block text-xs text-[#8888aa]">Delivery info</span>
                      <input className={inputCls} value={delivery} onChange={(e) => setDelivery(e.target.value)} />
                    </label>
                    <div className="border-t border-[#2a2a38] pt-3 text-sm">
                      <div className="flex justify-between font-bold">
                        <span>Total</span><span>{cartTotal.toFixed(2)} {cartCurrency}</span>
                      </div>
                    </div>
                    <button onClick={() => void createOrder()} disabled={creating || cartTotal <= 0}
                      className="mt-4 w-full rounded-lg bg-[#4f6ef7] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {creating ? 'Creating…' : 'Create order'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'merchant' && (
                <MerchantForm pageId={selected.id} merchant={merchant} onSaved={fetchMerchant} />
              )}
            </>
          )}
        </main>
      </div>

      {payOrder && selected && (
        <PaymentModal
          pageId={selected.id}
          order={payOrder}
          onClose={() => { setPayOrder(null); void fetchOrders() }}
        />
      )}
    </div>
  )
}

// ── Merchant settings form ─────────────────────────────────────────────────────

function MerchantForm({ pageId, merchant, onSaved }: { pageId: string; merchant: Merchant | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    merchant_name: '', bank_account: '', merchant_city: 'Phnom Penh',
    terminal_label: 'POS-01', store_label: 'Online', phone_number: '', is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (merchant) setForm({
      merchant_name: merchant.merchant_name, bank_account: merchant.bank_account,
      merchant_city: merchant.merchant_city, terminal_label: merchant.terminal_label,
      store_label: merchant.store_label, phone_number: merchant.phone_number || '', is_active: merchant.is_active,
    })
  }, [merchant])

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/commerce/${pageId}/merchant`, { ...form, phone_number: form.phone_number || null })
      setSaved(true); setTimeout(() => setSaved(false), 1500)
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg rounded-xl border border-[#2a2a38] bg-[#111118] p-5">
      <h3 className="mb-1 font-semibold">Bakong merchant</h3>
      <p className="mb-4 text-xs text-[#8888aa]">Used to generate KHQR codes. Get these from your Bakong merchant registration.</p>
      <div className="space-y-3">
        <FormRow label="Merchant name"><input className={inputCls} value={form.merchant_name} onChange={(e) => setForm({ ...form, merchant_name: e.target.value })} /></FormRow>
        <FormRow label="Bakong account ID (e.g. name@aclb)"><input className={inputCls} value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="City"><input className={inputCls} value={form.merchant_city} onChange={(e) => setForm({ ...form, merchant_city: e.target.value })} /></FormRow>
          <FormRow label="Phone"><input className={inputCls} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></FormRow>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Terminal label"><input className={inputCls} value={form.terminal_label} onChange={(e) => setForm({ ...form, terminal_label: e.target.value })} /></FormRow>
          <FormRow label="Store label"><input className={inputCls} value={form.store_label} onChange={(e) => setForm({ ...form, store_label: e.target.value })} /></FormRow>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button onClick={() => void save()} disabled={saving || !form.merchant_name || !form.bank_account}
          className="rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save merchant'}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-400">✓ Saved</span>}
      </div>
    </div>
  )
}

// ── Payment modal (QR + polling) ───────────────────────────────────────────────

function PaymentModal({ pageId, order, onClose }: { pageId: string; order: Order; onClose: () => void }) {
  const [init, setInit] = useState<PaymentInit | null>(null)
  const [status, setStatus] = useState<'loading' | 'Pending' | 'Paid' | 'Expired' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const r = await api.post<PaymentInit>(`/commerce/${pageId}/orders/${order.id}/pay`)
        if (!active) return
        setInit(r.data)
        setStatus('Pending')
        if (r.data.expires_at) {
          const ends = new Date(r.data.expires_at).getTime()
          setSecondsLeft(Math.max(0, Math.round((ends - Date.now()) / 1000)))
          tickRef.current = setInterval(() => {
            setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
          }, 1000)
        }
        // Poll status every 5 seconds (per Bakong guide).
        pollRef.current = setInterval(() => void check(), 5000)
      } catch (e: any) {
        if (!active) return
        setStatus('error')
        setError(e.response?.data?.detail || 'Failed to create payment')
      }
    })()
    return () => { active = false; stopTimers() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const check = async () => {
    try {
      const r = await api.get<PaymentStatus>(`/commerce/${pageId}/orders/${order.id}/payment`)
      setStatus(r.data.status)
      if (r.data.status === 'Paid' || r.data.status === 'Expired') stopTimers()
    } catch { /* keep polling */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2a38] bg-[#111118] p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-sm text-[#8888aa]">Order #{order.id.slice(-6)}</div>
        <div className="mb-4 text-2xl font-extrabold">{order.total.toFixed(2)} {order.currency}</div>

        {status === 'loading' && <p className="py-10 text-[#8888aa]">Generating KHQR…</p>}
        {status === 'error' && <p className="py-10 text-red-400">{error}</p>}

        {status === 'Pending' && init && (
          <>
            {init.image_uri
              ? <img src={init.image_uri} alt="KHQR" className="mx-auto h-60 w-60 rounded-xl bg-white p-2" />
              : <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-xl border border-[#2a2a38] text-xs text-[#8888aa]">QR image unavailable</div>}
            <div className="mt-3 text-sm text-[#8888aa]">Scan with any Bakong-supported banking app</div>
            {secondsLeft > 0 && (
              <div className="mt-1 text-sm font-mono text-amber-400">
                Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {init.deeplink && (
                <a href={init.deeplink} target="_blank" rel="noreferrer"
                  className="rounded-lg bg-[#4f6ef7] py-2.5 text-sm font-semibold text-white">Open Bakong app</a>
              )}
              <button onClick={() => void check()} className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] py-2.5 text-sm text-[#8888aa] hover:text-white">
                Check payment now
              </button>
            </div>
            <p className="mt-3 text-xs text-[#8888aa]">Auto-checking every 5s…</p>
          </>
        )}

        {status === 'Paid' && (
          <div className="py-8">
            <div className="text-5xl">✅</div>
            <div className="mt-3 text-xl font-bold text-emerald-400">Payment received</div>
            <p className="mt-1 text-sm text-[#8888aa]">Stock updated and order marked paid.</p>
          </div>
        )}
        {status === 'Expired' && (
          <div className="py-8">
            <div className="text-5xl">⌛</div>
            <div className="mt-3 text-xl font-bold text-zinc-400">QR expired</div>
            <p className="mt-1 text-sm text-[#8888aa]">Reopen to generate a fresh code.</p>
          </div>
        )}

        <button onClick={onClose} className="mt-5 w-full rounded-lg border border-[#2a2a38] bg-[#1a1a24] py-2 text-sm text-[#8888aa] hover:text-white">Close</button>
      </div>
    </div>
  )
}

// ── Small helpers ────────────────────────────────────────────────────────────────

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-[#8888aa]">{label}</span>{children}</label>
}

function Stat({ n, label, color = 'text-white', money = false }: { n: number; label: string; color?: string; money?: boolean }) {
  return (
    <div className="rounded-xl border border-[#2a2a38] bg-[#111118] p-4">
      <div className={`text-2xl font-extrabold ${color}`}>{money ? n.toFixed(2) : n}</div>
      <div className="mt-0.5 text-xs text-[#8888aa]">{label}</div>
    </div>
  )
}
