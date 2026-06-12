import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../utils/api'

const SENTIMENT_COLOR = {
  positive: '#22c55e',
  neutral:  '#f59e0b',
  negative: '#ef4444',
}
const URGENCY_COLOR = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
}
const INTENT_EMOJI = {
  inquiry:        '❓',
  complaint:      '😤',
  feedback:       '💬',
  purchase_intent:'🛒',
  support:        '🛠️',
  spam:           '🚫',
  other:          '📌',
}

export default function Analysis() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [pages, setPages]           = useState([])
  const [selectedPage, setSelected] = useState(null)
  const [summary, setSummary]       = useState(null)
  const [results, setResults]       = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [analysing, setAnalysing]   = useState(false)
  const [filter, setFilter]         = useState({ sentiment: '', intent: '', urgency: '' })

  useEffect(() => { fetchPages() }, [])
  useEffect(() => { if (selectedPage) { fetchSummary(); fetchResults() } }, [selectedPage, filter])

  const fetchPages = async () => {
    try {
      const r = await api.get('/pages/')
      setPages(r.data.pages)
      if (r.data.pages.length > 0) setSelected(r.data.pages[0])
    } catch(e) {
      if (e.response?.status === 401) { logout(); navigate('/login') }
    }
  }

  const fetchSummary = async () => {
    try {
      const r = await api.get(`/analysis/${selectedPage.id}/summary`)
      setSummary(r.data)
    } catch { setSummary(null) }
  }

  const fetchResults = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.sentiment) params.set('sentiment', filter.sentiment)
      if (filter.intent)    params.set('intent', filter.intent)
      if (filter.urgency)   params.set('urgency', filter.urgency)
      const r = await api.get(`/analysis/${selectedPage.id}/results?${params}`)
      setResults(r.data.analyses)
    } catch { setResults([]) } finally { setLoading(false) }
  }

  const runAnalysis = async () => {
    if (!selectedPage) return
    setAnalysing(true)
    try {
      await api.post(`/analysis/${selectedPage.id}/analyse`, { force_reanalyse: true })
      setTimeout(() => { fetchSummary(); fetchResults(); setAnalysing(false) }, 4000)
    } catch { setAnalysing(false) }
  }

  const sentimentBar = (breakdown = {}) => {
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1
    return (
      <div className="an-bar-wrap">
        {['positive', 'neutral', 'negative'].map(s => {
          const pct = Math.round(((breakdown[s] || 0) / total) * 100)
          return pct > 0 ? (
            <div
              key={s}
              className="an-bar-seg"
              style={{ width: `${pct}%`, background: SENTIMENT_COLOR[s] }}
              title={`${s}: ${pct}%`}
            />
          ) : null
        })}
      </div>
    )
  }

  return (
    <div className="an-root">
      {/* Header */}
      <header className="an-header">
        <div className="an-header-left">
          <button className="an-back" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <span className="an-logo">⚡ PageSync <span className="an-tag">AI Analysis</span></span>
        </div>
        <div className="an-header-right">
          {selectedPage && (
            <button className={`an-run-btn ${analysing ? 'busy' : ''}`} onClick={runAnalysis} disabled={analysing}>
              {analysing ? <><span className="an-spin" /> Analysing…</> : '✦ Run GPT Analysis'}
            </button>
          )}
        </div>
      </header>

      <div className="an-layout">
        {/* Sidebar – page picker */}
        <aside className="an-sidebar">
          <div className="an-sidebar-label">PAGES</div>
          {pages.map(p => (
            <button
              key={p.id}
              className={`an-page-item ${selectedPage?.id === p.id ? 'active' : ''}`}
              onClick={() => { setSelected(p); setActiveConvo(null) }}
            >
              {p.picture
                ? <img src={p.picture} alt="" className="an-page-thumb" />
                : <div className="an-page-thumb-ph">{p.name[0]}</div>
              }
              <div>
                <div className="an-page-name">{p.name}</div>
                <div className="an-page-cat">{p.category || 'Page'}</div>
              </div>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="an-main">
          {!selectedPage ? (
            <div className="an-empty"><p>Select a page to view analysis.</p></div>
          ) : (
            <>
              {/* Summary cards */}
              {summary && summary.total_analysed > 0 && (
                <section className="an-summary">
                  <div className="an-summary-stats">
                    <div className="an-stat">
                      <div className="an-stat-n">{summary.total_analysed}</div>
                      <div className="an-stat-l">Conversations</div>
                    </div>
                    {Object.entries(summary.sentiment_breakdown).map(([k, v]) => (
                      <div className="an-stat" key={k}>
                        <div className="an-stat-n" style={{ color: SENTIMENT_COLOR[k] }}>{v}</div>
                        <div className="an-stat-l">{k}</div>
                      </div>
                    ))}
                    {Object.entries(summary.urgency_breakdown).map(([k, v]) => (
                      <div className="an-stat" key={k}>
                        <div className="an-stat-n" style={{ color: URGENCY_COLOR[k] }}>{v}</div>
                        <div className="an-stat-l">{k} urgency</div>
                      </div>
                    ))}
                  </div>

                  {sentimentBar(summary.sentiment_breakdown)}

                  <div className="an-exec">
                    <div className="an-exec-label">GPT Executive Summary</div>
                    <p className="an-exec-text">{summary.executive_summary}</p>
                  </div>

                  {summary.action_items?.length > 0 && (
                    <div className="an-actions">
                      <div className="an-exec-label">Recommended Actions</div>
                      <ul className="an-action-list">
                        {summary.action_items.map((item, i) => (
                          <li key={i}><span className="an-bullet">→</span> {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.top_topics?.length > 0 && (
                    <div className="an-topics">
                      <div className="an-exec-label">Top Topics</div>
                      <div className="an-topic-chips">
                        {summary.top_topics.map(({ topic, count }) => (
                          <span key={topic} className="an-chip">
                            {topic} <span className="an-chip-count">{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Filters */}
              <div className="an-filters">
                <span className="an-filters-label">Filter:</span>
                {['positive','neutral','negative'].map(s => (
                  <button
                    key={s}
                    className={`an-filter-chip ${filter.sentiment === s ? 'on' : ''}`}
                    style={filter.sentiment === s ? { background: SENTIMENT_COLOR[s] + '33', borderColor: SENTIMENT_COLOR[s], color: SENTIMENT_COLOR[s] } : {}}
                    onClick={() => setFilter(f => ({ ...f, sentiment: f.sentiment === s ? '' : s }))}
                  >{s}</button>
                ))}
                {['low','medium','high'].map(u => (
                  <button
                    key={u}
                    className={`an-filter-chip ${filter.urgency === u ? 'on' : ''}`}
                    style={filter.urgency === u ? { background: URGENCY_COLOR[u] + '33', borderColor: URGENCY_COLOR[u], color: URGENCY_COLOR[u] } : {}}
                    onClick={() => setFilter(f => ({ ...f, urgency: f.urgency === u ? '' : u }))}
                  >{u} urgency</button>
                ))}
                {(filter.sentiment || filter.urgency || filter.intent) && (
                  <button className="an-filter-clear" onClick={() => setFilter({ sentiment: '', intent: '', urgency: '' })}>✕ clear</button>
                )}
              </div>

              {/* Conversation list */}
              {loading ? (
                <div className="an-loading"><div className="an-spin-lg" /><p>Loading analyses…</p></div>
              ) : results.length === 0 ? (
                <div className="an-empty-state">
                  <div className="an-empty-icon">🤖</div>
                  <h3>No analyses yet</h3>
                  <p>Click <strong>Run GPT Analysis</strong> to analyse customer conversations on this page.</p>
                </div>
              ) : (
                <div className="an-convo-grid">
                  {results.map(r => (
                    <div
                      key={r.id}
                      className={`an-convo-card ${activeConvo?.id === r.id ? 'active' : ''}`}
                      onClick={() => setActiveConvo(activeConvo?.id === r.id ? null : r)}
                    >
                      <div className="an-convo-top">
                        <div className="an-sender-id" title={r.sender_id}>
                          {r.sender_id.slice(-8)}
                        </div>
                        <div className="an-badges">
                          <span className="an-badge-sentiment" style={{ color: SENTIMENT_COLOR[r.sentiment] }}>
                            ● {r.sentiment}
                          </span>
                          <span className="an-badge-urgency" style={{ color: URGENCY_COLOR[r.urgency] }}>
                            {r.urgency}
                          </span>
                        </div>
                      </div>

                      <div className="an-convo-intent">
                        {INTENT_EMOJI[r.intent] || '📌'} {r.intent?.replace('_', ' ')}
                        {r.language && r.language !== 'en' && (
                          <span className="an-lang">{r.language.toUpperCase()}</span>
                        )}
                      </div>

                      <p className="an-convo-summary">{r.summary}</p>

                      {r.topics?.length > 0 && (
                        <div className="an-mini-topics">
                          {r.topics.slice(0, 3).map(t => (
                            <span key={t} className="an-mini-chip">{t}</span>
                          ))}
                        </div>
                      )}

                      {activeConvo?.id === r.id && (
                        <div className="an-convo-detail" onClick={e => e.stopPropagation()}>
                          <div className="an-detail-divider" />
                          <div className="an-detail-section">
                            <div className="an-detail-label">Suggested Reply</div>
                            <div className="an-suggested-reply">
                              {r.suggested_reply || 'No suggestion generated.'}
                            </div>
                          </div>
                          <div className="an-detail-meta">
                            <span>{r.message_count} messages</span>
                            <span>Analysed {new Date(r.analyzed_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
