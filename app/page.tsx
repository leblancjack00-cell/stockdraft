'use client'

import { useState, useEffect } from 'react'
import { createClient } from './lib/supabase'

const font = "'JetBrains Mono', 'Fira Code', monospace"
const TICKERS = ["NVDA","TSLA","AAPL","META","GOOG","AMD","MSFT","COIN","PLTR","NFLX","JPM","AMZN","XOM","V","UBER","SNOW"]
const PTS     = ["+42","+35","+28","−8","+44","+19","+31","+24","+12","+38","+22","−14","+11","+8","+26","+15"]

function TickerRain() {
  const items = TICKERS.map((t, i) => ({
    left: (i / TICKERS.length) * 100 + Math.random() * 5,
    delay: Math.random() * 8,
    duration: Math.random() * 8 + 8,
    ticker: t, pts: PTS[i],
    positive: PTS[i].startsWith('+'),
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {items.map((item, i) => (
        <div key={i} style={{ position: 'absolute', left: `${item.left}%`, top: '-60px', fontSize: 11, color: item.positive ? '#00ff8815' : '#ff446615', fontWeight: 700, animation: `rain ${item.duration}s linear ${item.delay}s infinite`, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
          {item.ticker}<br />{item.pts}
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [mode, setMode] = useState<'landing'|'signin'|'signup'>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) window.location.href = '/dashboard'
    }
    check()
  }, [])

  const submit = async () => {
    setError(''); setLoading(true)
    const supabase = createClient()
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/dashboard'
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  const features = [
    { icon: '🐍', title: 'Snake Draft', desc: 'Draft stocks like fantasy players. Build your portfolio before the season starts.' },
    { icon: '📈', title: 'Live Scoring', desc: 'Points update daily based on real stock price movements.' },
    { icon: '⚔', title: 'Head-to-Head', desc: 'Face a different opponent every week. Win based on whose stocks score more.' },
    { icon: '🔄', title: 'Trades & Waivers', desc: 'Drop underperformers, pick up hot stocks, trade with your league.' },
  ]

  if (mode === 'landing') return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes rain { 0%{transform:translateY(-60px);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(100vh);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        button:hover { filter: brightness(1.15); }
      `}</style>
      <TickerRain />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, #00ff8808 0%, transparent 60%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', color: '#fff' }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #00ff88, #00bfff)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#000' }}>$</div>
          STOCKDRAFT
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setMode('signin')} style={{ padding: '9px 18px', fontSize: 11, fontFamily: font, fontWeight: 700, letterSpacing: '0.1em', background: 'transparent', border: 'none', color: '#4a5568', cursor: 'pointer' }}>SIGN IN</button>
          <button onClick={() => setMode('signup')} style={{ padding: '9px 18px', fontSize: 11, fontFamily: font, fontWeight: 700, letterSpacing: '0.1em', background: 'transparent', border: '1px solid #00bfff40', borderRadius: 6, color: '#00bfff', cursor: 'pointer' }}>GET STARTED</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '60px 40px 80px', maxWidth: 700, margin: '0 auto', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0d1f15', border: '1px solid #00ff8830', borderRadius: 20, padding: '5px 14px', fontSize: 10, color: '#00ff88', letterSpacing: '0.1em', marginBottom: 28 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', animation: 'pulse 1.5s infinite' }} />
          Q1 2025 SEASON NOW LIVE
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 20 }}>
          Fantasy sports,<br />
          <span style={{ background: 'linear-gradient(90deg, #00ff88, #00bfff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            but the stock market.
          </span>
        </h1>
        <p style={{ fontSize: 16, color: '#4a6080', lineHeight: 1.7, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
          Draft stocks, compete weekly against your league, and prove your market instincts are better than everyone else's.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => setMode('signup')} style={{ padding: '13px 28px', fontSize: 12, fontFamily: font, fontWeight: 700, letterSpacing: '0.12em', background: 'linear-gradient(135deg, #00ff88, #00e070)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>CREATE FREE ACCOUNT →</button>
          <button onClick={() => setMode('signin')} style={{ padding: '13px 24px', fontSize: 12, fontFamily: font, fontWeight: 700, letterSpacing: '0.12em', background: '#0d1225', border: '1px solid #1a2040', borderRadius: 6, color: '#c8d0e0', cursor: 'pointer' }}>SIGN IN</button>
        </div>
        <div style={{ marginTop: 16, fontSize: 10, color: '#2a3555' }}>No real money. No ads. Just bragging rights.</div>
      </div>

      {/* Features grid */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 860, margin: '0 auto', padding: '0 40px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {features.map((f, i) => (
            <div key={i} style={{ padding: 20, background: '#0d1225', border: '1px solid #1a2040', borderRadius: 10 }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#c8d0e0', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: '#4a5568', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 40px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg, #0d1a2a, #091520)', border: '1px solid #1a3050', borderRadius: 14, padding: 40, maxWidth: 540, margin: '0 auto' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Ready to draft your portfolio?</div>
          <div style={{ fontSize: 12, color: '#4a6080', marginBottom: 24 }}>Invite your friends, draft your stocks, and start competing this week.</div>
          <button onClick={() => setMode('signup')} style={{ width: '100%', padding: '13px', fontSize: 12, fontFamily: font, fontWeight: 700, letterSpacing: '0.12em', background: 'linear-gradient(135deg, #00ff88, #00e070)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>START FOR FREE — IT TAKES 2 MINUTES</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes rain { 0%{transform:translateY(-60px);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(100vh);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input::placeholder { color: #2a3555; }
      `}</style>
      <TickerRain />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, #00bfff05, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, background: '#0d1225', border: '1px solid #1a2040', borderRadius: 12, padding: '36px 36px', position: 'relative', zIndex: 10, boxShadow: '0 40px 80px rgba(0,0,0,0.5)', animation: 'fadeUp 0.3s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #00ff88, #00bfff)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#000', boxShadow: '0 0 20px #00ff8840' }}>$</div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>STOCKDRAFT</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </div>
          <div style={{ fontSize: 12, color: '#4a5568' }}>
            {mode === 'signin' ? 'Sign in to your account' : 'Free forever. No credit card required.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#1a0810', border: '1px solid #ff446640', borderRadius: 6, fontSize: 11, color: '#ff4466' }}>{error}</div>
          )}

          {/* Email */}
          <div>
            <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Email</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoFocus
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '13px 14px', background: '#09091a', border: '1px solid #1a2040', borderRadius: 6, color: '#c8d0e0', fontFamily: font, fontSize: 13, outline: 'none' }}
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Password</div>
            <div style={{ display: 'flex', background: '#09091a', border: '1px solid #1a2040', borderRadius: 6, overflow: 'hidden' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Create a strong password' : 'Your password'}
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{ flex: 1, padding: '13px 14px', background: 'transparent', border: 'none', color: '#c8d0e0', fontFamily: font, fontSize: 13, outline: 'none' }}
              />
              <span onClick={() => setShowPw(s => !s)} style={{ padding: '0 14px', color: '#4a5568', cursor: 'pointer', fontSize: 10, letterSpacing: '0.08em', display: 'flex', alignItems: 'center' }}>{showPw ? 'HIDE' : 'SHOW'}</span>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!email || !password || loading}
            style={{ width: '100%', padding: '13px', fontSize: 12, fontFamily: font, fontWeight: 700, letterSpacing: '0.12em', background: (!email || !password) ? '#091a10' : 'linear-gradient(135deg, #00ff88, #00e070)', color: '#000', border: 'none', borderRadius: 6, cursor: (!email || !password) ? 'not-allowed' : 'pointer', opacity: (!email || !password) ? 0.5 : 1 }}>
            {loading ? '...' : mode === 'signin' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#4a5568' }}>
          {mode === 'signin' ? (
            <>Don't have an account? <span onClick={() => { setMode('signup'); setError('') }} style={{ color: '#00bfff', cursor: 'pointer' }}>Sign up free</span></>
          ) : (
            <>Already have an account? <span onClick={() => { setMode('signin'); setError('') }} style={{ color: '#00bfff', cursor: 'pointer' }}>Sign in</span></>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span onClick={() => setMode('landing')} style={{ fontSize: 11, color: '#2a3555', cursor: 'pointer' }}>← Back to home</span>
        </div>
      </div>
    </div>
  )
}