import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      login(token, null)
      navigate('/dashboard')
    } else {
      navigate('/login?error=auth_failed')
    }
  }, [])

  return (
    <div className="callback-loading">
      <div className="spinner" />
      <p>Connecting your Facebook account…</p>
    </div>
  )
}
