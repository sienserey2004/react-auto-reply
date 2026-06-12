import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../utils/api'

export default function Dashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [pages, setPages] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pages')
  const [subscribing, setSubscribing] = useState({})

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pagesRes, eventsRes] = await Promise.all([
        api.get('/pages/'),
        api.get('/webhook/events?limit=30'),
      ])
      setPages(pagesRes.data.pages)
      setEvents(eventsRes.data.events)
    } catch (err) {
      if (err.response?.status === 401) { logout(); navigate('/login') }
    } finally {
      setLoading(false)
    }
  }

  const toggleSubscription = async (page) => {
    setSubscribing(s => ({ ...s, [page.id]: true }))
    try {
      const endpoint = page.webhook_subscribed === 'true'
        ? `/pages/${page.id}/unsubscribe`
        : `/pages/${page.id}/subscribe`
      await api.post(endpoint)
      await fetchData()
    } finally {
      setSubscribing(s => ({ ...s, [page.id]: false }))
    }
  }

  const subscribedCount = pages.filter(p => p.webhook_subscribed === 'true').length

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo">⚡ PageSync</div>
        <div className="dash-actions">
          <button className="refresh-btn" onClick={() => navigate('/analysis')} style={{borderColor:'var(--accent)',color:'var(--accent)'}}>🤖 AI Analysis</button>
          <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login') }}>Sign out</button>
        </div>
      </header>

      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-number">{pages.length}</div>
          <div className="stat-label">Pages Connected</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-number">{subscribedCount}</div>
          <div className="stat-label">Webhooks Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{events.length}</div>
          <div className="stat-label">Events Received</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{events.filter(e => e.event_type === 'message').length}</div>
          <div className="stat-label">Messages</div>
        </div>
      </div>

      <div className="dash-tabs">
        <button className={activeTab === 'pages' ? 'tab active' : 'tab'} onClick={() => setActiveTab('pages')}>
          📄 Pages ({pages.length})
        </button>
        <button className={activeTab === 'events' ? 'tab active' : 'tab'} onClick={() => setActiveTab('events')}>
          🔔 Events ({events.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading…</p></div>
      ) : activeTab === 'pages' ? (
        <div className="pages-grid">
          {pages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No pages found</h3>
              <p>Make sure your Facebook account manages at least one Page.</p>
            </div>
          ) : pages.map(page => (
            <div className="page-card" key={page.id}>
              <div className="page-header">
                {page.picture
                  ? <img src={page.picture} alt={page.name} className="page-avatar" />
                  : <div className="page-avatar-placeholder">{page.name[0]}</div>
                }
                <div className="page-info">
                  <div className="page-name">{page.name}</div>
                  <div className="page-meta">{page.category || 'Page'} · {page.fan_count?.toLocaleString() ?? '—'} fans</div>
                </div>
              </div>
              <div className="page-id">ID: {page.id}</div>
              <div className="page-status">
                <span className={`status-badge ${page.webhook_subscribed === 'true' ? 'active' : 'inactive'}`}>
                  {page.webhook_subscribed === 'true' ? '● Live' : '○ Not subscribed'}
                </span>
              </div>
              <button
                className={`subscribe-btn ${page.webhook_subscribed === 'true' ? 'unsub' : 'sub'}`}
                onClick={() => toggleSubscription(page)}
                disabled={subscribing[page.id]}
              >
                {subscribing[page.id] ? '…'
                  : page.webhook_subscribed === 'true' ? 'Unsubscribe' : 'Subscribe to Webhooks'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="events-list">
          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h3>No events yet</h3>
              <p>Subscribe a page to start receiving webhook events.</p>
            </div>
          ) : events.map(event => (
            <div className="event-row" key={event.id}>
              <div className="event-type-badge">{event.event_type}</div>
              <div className="event-body">
                {event.message_text
                  ? <span className="event-text">"{event.message_text}"</span>
                  : <span className="event-no-text">No text payload</span>
                }
                {event.sender_id && <span className="event-sender">from {event.sender_id}</span>}
              </div>
              <div className="event-time">
                {new Date(event.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
