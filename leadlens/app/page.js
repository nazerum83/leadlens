'use client'
import { useState, useEffect } from 'react'
import Login from '../components/Login'
import Dashboard from '../components/Dashboard'

export default function Home() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const auth = localStorage.getItem('ll_auth')
    if (auth === '1') setAuthed(true)
    setChecking(false)
  }, [])

  const handleLogin = () => setAuthed(true)

  const handleLogout = () => {
    localStorage.removeItem('ll_auth')
    setAuthed(false)
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a' }}>
      <div style={{ fontSize: 24, color: '#6366f1' }}>⬡</div>
    </div>
  )

  return authed
    ? <Dashboard onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />
}
