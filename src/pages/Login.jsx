import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard')
  }, [isAuthenticated])

  const handleFacebookLogin = async () => {
    try {
      const res = await fetch('/api/auth/facebook/login')
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const data = await res.json()
      if (data.oauth_url) {
        window.location.href = data.oauth_url
      } else {
        console.error('No oauth_url in response:', data)
        alert('Failed to get Facebook login URL. Please check server configuration.')
      }
    } catch (err) {
      console.error('Facebook login failed:', err)
      alert('Failed to connect to server. Please ensure the backend is running.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">⚡</div>
          <h1>PageSync</h1>
          <p>Connect your Facebook Pages and manage webhooks in one place</p>
        </div>

        <div className="login-features">
          <div className="feature"><span>📄</span> Manage Facebook Pages</div>
          <div className="feature"><span>🔔</span> Real-time Webhook Events</div>
          <div className="feature"><span>📊</span> Message Analytics</div>
        </div>

        <button className="fb-login-btn" onClick={handleFacebookLogin}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continue with Facebook
        </button>

        <p className="login-footer">
          We only request permissions needed to manage your pages and webhooks.
        </p>
      </div>
    </div>
  )
}
