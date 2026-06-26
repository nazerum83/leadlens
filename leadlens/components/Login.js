'use client'
import { useState } from 'react'
import styles from './Login.module.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 500))
    if (email.toLowerCase() === 'erum@leadlens.ai' && password === 'LeadLens@2026') {
      localStorage.setItem('ll_auth', '1')
      onLogin()
    } else {
      setError('Incorrect email or password.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>⬡</div>
          <span className={styles.logoText}>LeadLens</span>
        </div>
        <p className={styles.sub}>AI-Powered Lead Intelligence</p>
        <form onSubmit={handle} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="erum@leadlens.ai" className={styles.input} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" className={styles.input} required />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className={styles.footer}>
          <div className={styles.footerDot} />
          <span>Erum Naz · AI Automation Specialist</span>
        </div>
      </div>
    </div>
  )
}
