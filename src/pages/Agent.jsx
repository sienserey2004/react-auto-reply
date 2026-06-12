import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../utils/api'

const STAGES = [
  { key: 'new',             label: 'New',          emoji: '✨' },
  { key: 'greeting',        label: 'Greeting',     emoji: '👋' },
  { key: 'product_inquiry', label: 'Product',      emoji: '🛍️' },
  { key: 'stock_check',     label: 'Stock',        emoji: '📦' },
  { key: 'closing',         label: 'Closing',      emoji: '🤝' },
  { key: 'payment',         label: 'Payment',      emoji: '💳' },
  { key: 'completed',       label: 'Completed',    emoji: '✅' },
  { key: 'handoff',         label: 'Needs human',  emoji: '🙋' },
]
const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.key, s]))

export default function Agent() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [pages, setPages]           = useState([])
  const [selectedPage, setSelected] = useState(null)
  const [config, setConfig]         = useState(null)
  const [convos, setConvos]         = useState(null)
  const [tab, setTab]               = useState('settings')
  const [saving, setSaving]         = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  // test playground
  const [testMsg, setTestMsg]   = useState('')
  const [testThread, setThread] = useState([])
  const [testing, setTesting]   = useState(false)

  useEffect(() => { fetchPages() }, [])
  useEffect(() => {
    if (selectedPage) { fetchConfig(); fetchConvos(); setThread([]) }
  }, [selectedPage])

  const fetchPages = async () => {
    try {
      const r = await api.get('/pages/')
      setPages(r.data.pages)
      if (r.data.pages.length > 0) setSelected(r.data.pages[0])
    } catch (e) {
      if (e.response?.status === 401) { logout(); navigate('/login') }
    }
  }

  const fetchConfig = async () => {
    try {
      const r = await api.get(`/agent/${selectedPage.id}/config`)
      setConfig(r.data)
    } catch { setConfig(null) }
  }

  const fetchConvos = async () => {
    try {
      const r = await api.get(`/agent/${selectedPage.id}/conversations`)
      setConvos(r.data)
    } catch { setConvos(null) }
  }

  const patchConfig = async (changes) => {
    if (!selectedPage) return
    const next = { ...config, ...changes }
    setConfig(next)
    setSaving(true)
    try {
      const r = await api.put(`/agent/${selectedPage.id}/config`, changes)
      setConfig(r.data)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } finally {
      setSaving(false)
    }
  }

  const runTest = async () => {
    if (!testMsg.trim() || !selectedPage) return
    setTesting(true)
    const myMsg = testMsg.trim()
    try {
      const r = await api.post(`/agent/${selectedPage.id}/test`, {
        history: testThread.map(t => ({ role: t.role, text: t.text })),
        message: myMsg,
        current_stage: testThread.length
          ? (testThread.findLast?.(t => t.stage)?.stage || 'new')
          : 'new',
      })
      setThread(t => [
        ...t,
        { role: 'customer', text: myMsg },
        { role: 'agent', text: r.data.reply, meta: r.data, stage: r.data.funnel_stage },
      ])
      setTestMsg('')
    } finally {
      setTesting(false)
    }
  }

  const enabled = config?.enabled

  return (
    <div className="ag-root">
      <header className="ag-header">
        <div className="ag-header-left">
          <button className="ag-back" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <span className="ag-logo">⚡ PageSync <span className="ag-tag">AI Sales Agent</span></span>
        </div>
        {savedFlash && <span className="ag-saved">✓ Saved</span>}
      </header>

      <div className="ag-layout">
        {/* Sidebar – page picker */}
        <aside className="ag-sidebar">
          <div className="ag-sidebar-label">PAGES</div>
          {pages.map(p => (
            <button
              key={p.id}
              className={`ag-page-item ${selectedPage?.id === p.id ? 'active' : ''}`}
              onClick={() => setSelected(p)}
            >
              {p.picture
                ? <img src={p.picture} alt="" className="ag-page-thumb" />
                : <div className="ag-page-thumb-ph">{p.name[0]}</div>}
              <div className="ag-page-meta">
                <div className="ag-page-name">{p.name}</div>
                <div className="ag-page-cat">{p.category || 'Page'}</div>
              </div>
            </button>
          ))}
          {pages.length === 0 && <p className="ag-side-empty">No pages connected.</p>}
        </aside>

        <main className="ag-main">
          {!selectedPage || !config ? (
            <div className="ag-empty"><p>Select a page to configure its 24/7 AI agent.</p></div>
          ) : (
            <>
              {/* Master switch */}
              <section className={`ag-switch-card ${enabled ? 'on' : ''}`}>
                <div className="ag-switch-info">
                  <div className="ag-switch-title">
                    {enabled ? '🟢 Agent is LIVE — Sell While You Sleep' : '⚪ Agent is off'}
                  </div>
                  <div className="ag-switch-sub">
                    {enabled
                      ? 'Replying to customer DMs 24/7 in under 5 seconds.'
                      : 'Turn on to let the AI handle customer messages automatically.'}
                  </div>
                </div>
                <button
                  className={`ag-toggle ${enabled ? 'on' : ''}`}
                  onClick={() => patchConfig({ enabled: !enabled })}
                  disabled={saving}
                  aria-label="Toggle agent"
                >
                  <span className="ag-toggle-knob" />
                </button>
              </section>

              {/* Tabs */}
              <div className="ag-tabs">
                {['settings', 'funnel', 'test'].map(t => (
                  <button
                    key={t}
                    className={`ag-tab ${tab === t ? 'active' : ''}`}
                    onClick={() => { setTab(t); if (t === 'funnel') fetchConvos() }}
                  >
                    {t === 'settings' ? '⚙️ Settings'
                      : t === 'funnel' ? '🛒 Live Funnel'
                      : '🧪 Test Agent'}
                  </button>
                ))}
              </div>

              {tab === 'settings' && (
                <section className="ag-form">
                  <div className="ag-field">
                    <label>Business name</label>
                    <input
                      value={config.business_name || ''}
                      placeholder={selectedPage.name}
                      onChange={e => setConfig({ ...config, business_name: e.target.value })}
                      onBlur={e => patchConfig({ business_name: e.target.value })}
                    />
                  </div>

                  <div className="ag-row">
                    <div className="ag-field">
                      <label>Persona</label>
                      <select
                        value={config.persona}
                        onChange={e => patchConfig({ persona: e.target.value })}
                      >
                        <option value="friendly">Friendly</option>
                        <option value="professional">Professional</option>
                        <option value="playful">Playful</option>
                      </select>
                    </div>
                    <div className="ag-field">
                      <label>Language</label>
                      <select
                        value={config.language_mode}
                        onChange={e => patchConfig({ language_mode: e.target.value })}
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="khmernglish">Khmernglish</option>
                        <option value="km">Khmer</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="ag-field ag-field-sm">
                      <label>Currency</label>
                      <input
                        value={config.currency || ''}
                        onChange={e => setConfig({ ...config, currency: e.target.value })}
                        onBlur={e => patchConfig({ currency: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="ag-field">
                    <label>Product & business info <span className="ag-hint">(the agent answers ONLY from this — list products, prices, hours, delivery, policies)</span></label>
                    <textarea
                      rows={7}
                      value={config.business_info || ''}
                      placeholder={"e.g.\nNike Air Force 1 — $85, sizes 38-44, in stock\nDelivery: $1.5 in Phnom Penh, next day\nPayment: ABA / KHQR\nHours: 9am-9pm daily"}
                      onChange={e => setConfig({ ...config, business_info: e.target.value })}
                      onBlur={e => patchConfig({ business_info: e.target.value })}
                    />
                  </div>

                  <div className="ag-field">
                    <label>Opening message <span className="ag-hint">(optional — used to greet new chats)</span></label>
                    <input
                      value={config.greeting_message || ''}
                      placeholder="Hi! Welcome to our shop 😊 How can I help?"
                      onChange={e => setConfig({ ...config, greeting_message: e.target.value })}
                      onBlur={e => patchConfig({ greeting_message: e.target.value })}
                    />
                  </div>

                  <div className="ag-field">
                    <label>Brand voice notes <span className="ag-hint">(optional tone guidance)</span></label>
                    <input
                      value={config.tone_instructions || ''}
                      placeholder="Always polite, use the customer's name, never pushy"
                      onChange={e => setConfig({ ...config, tone_instructions: e.target.value })}
                      onBlur={e => patchConfig({ tone_instructions: e.target.value })}
                    />
                  </div>

                  <div className="ag-field">
                    <label>
                      Confidence threshold — {Math.round((config.confidence_threshold || 0) * 100)}%
                      <span className="ag-hint">(below this the agent asks a human instead of auto-sending)</span>
                    </label>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={config.confidence_threshold || 0}
                      onChange={e => setConfig({ ...config, confidence_threshold: parseFloat(e.target.value) })}
                      onMouseUp={e => patchConfig({ confidence_threshold: parseFloat(e.target.value) })}
                      onTouchEnd={e => patchConfig({ confidence_threshold: parseFloat(e.target.value) })}
                    />
                  </div>
                </section>
              )}

              {tab === 'funnel' && (
                <section className="ag-funnel">
                  <div className="ag-funnel-stats">
                    <div className="ag-stat">
                      <div className="ag-stat-n">{convos?.total ?? 0}</div>
                      <div className="ag-stat-l">Conversations</div>
                    </div>
                    <div className="ag-stat">
                      <div className="ag-stat-n accent">
                        {Math.round((convos?.automation_rate ?? 0) * 100)}%
                      </div>
                      <div className="ag-stat-l">Automation rate</div>
                    </div>
                    <div className="ag-stat">
                      <div className="ag-stat-n green">
                        {convos?.funnel_breakdown?.completed ?? 0}
                      </div>
                      <div className="ag-stat-l">Completed</div>
                    </div>
                    <div className="ag-stat">
                      <div className="ag-stat-n warn">
                        {convos?.funnel_breakdown?.handoff ?? 0}
                      </div>
                      <div className="ag-stat-l">Need human</div>
                    </div>
                  </div>

                  {/* Funnel bar */}
                  <div className="ag-funnel-bar">
                    {STAGES.filter(s => s.key !== 'handoff' && s.key !== 'new').map(s => {
                      const n = convos?.funnel_breakdown?.[s.key] ?? 0
                      return (
                        <div className="ag-funnel-step" key={s.key}>
                          <div className="ag-funnel-emoji">{s.emoji}</div>
                          <div className="ag-funnel-count">{n}</div>
                          <div className="ag-funnel-name">{s.label}</div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="ag-convo-list">
                    {(convos?.conversations ?? []).length === 0 ? (
                      <div className="ag-empty-state">
                        <div className="ag-empty-icon">💬</div>
                        <h3>No conversations yet</h3>
                        <p>Once customers DM your page, the agent's chats appear here.</p>
                      </div>
                    ) : convos.conversations.map(c => {
                      const st = STAGE_LABEL[c.funnel_stage] || STAGE_LABEL.new
                      return (
                        <div className="ag-convo-row" key={c.id}>
                          <div className="ag-convo-id">{c.sender_id.slice(-8)}</div>
                          <span className={`ag-stage-badge stage-${c.funnel_stage}`}>
                            {st.emoji} {st.label}
                          </span>
                          <div className="ag-convo-last">
                            {c.last_customer_message
                              ? <span className="ag-cust">“{c.last_customer_message}”</span>
                              : <span className="ag-muted">—</span>}
                            {c.last_agent_reply &&
                              <span className="ag-reply"> → {c.last_agent_reply}</span>}
                          </div>
                          <div className="ag-convo-side">
                            {c.status === 'needs_human' &&
                              <span className="ag-need-human">needs human</span>}
                            <span className="ag-convo-count">{c.message_count} msg</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {tab === 'test' && (
                <section className="ag-test">
                  <div className="ag-test-note">
                    Try the agent as if you were a customer. Nothing is sent to Facebook.
                    {!config.business_info &&
                      <strong> Tip: add product info in Settings for realistic replies.</strong>}
                  </div>
                  <div className="ag-chat">
                    {testThread.length === 0 && (
                      <div className="ag-chat-empty">Send a message to start the test chat…</div>
                    )}
                    {testThread.map((m, i) => (
                      <div key={i} className={`ag-bubble ${m.role}`}>
                        <div className="ag-bubble-text">{m.text}</div>
                        {m.meta && (
                          <div className="ag-bubble-meta">
                            <span className={`ag-stage-badge stage-${m.meta.funnel_stage}`}>
                              {(STAGE_LABEL[m.meta.funnel_stage] || STAGE_LABEL.new).label}
                            </span>
                            <span>conf {Math.round(m.meta.confidence * 100)}%</span>
                            <span>{m.meta.auto_send ? '⚡ auto-send' : '🙋 review'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="ag-test-input">
                    <input
                      value={testMsg}
                      placeholder="Type a customer message…  (e.g. Tlai man? / How much?)"
                      onChange={e => setTestMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runTest()}
                    />
                    <button onClick={runTest} disabled={testing || !testMsg.trim()}>
                      {testing ? '…' : 'Send'}
                    </button>
                    {testThread.length > 0 &&
                      <button className="ag-test-clear" onClick={() => setThread([])}>Reset</button>}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
