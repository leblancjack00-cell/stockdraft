'use client'

import { useState, useRef } from 'react'
import { createClient } from './lib/supabase'

const font = "'JetBrains Mono', 'Fira Code', monospace"
const TICKERS = ["NVDA","TSLA","AAPL","META","GOOG","AMD","MSFT","COIN","PLTR","NFLX","JPM","AMZN","XOM","V","UBER"]
const PTS = ["+42","+35","+28","−8","+44","+19","+31","+24","+12","+38","+22","−14","+11","+15","+18"]

export default function Home() {
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailFocus, setEmailFocus] = useState(false)
  const [passFocus, setPassFocus] = useState(false)
  const items = useRef(Array.from({length:24},(_,i)=>({left:Math.random()*100,delay:Math.random()*6,duration:Math.random()*8+6,ticker:TICKERS[i%TICKERS.length],pts:PTS[i%PTS.length],positive:PTS[i%PTS.length].startsWith('+')})))

  const submit = async () => {
    if (!email || !password) { setError('Enter your email and password.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setError('Check your email to confirm your account.')
      setLoading(false)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{fontFamily:font,background:'#080b14',color:'#c8d0e0',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap');
        @keyframes fall{from{transform:translateY(-60px);opacity:0}10%{opacity:1}90%{opacity:1}to{transform:translateY(110vh);opacity:0}}
        *{box-sizing:border-box}
      `}</style>

      <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
        {items.current.map((item,i)=>(
          <div key={i} style={{position:'absolute',left:`${item.left}%`,top:'-60px',fontSize:11,color:item.positive?'#00ff8818':'#ff446618',fontFamily:font,fontWeight:700,whiteSpace:'nowrap',animation:`fall ${item.duration}s ${item.delay}s infinite linear`}}>
            {item.ticker} <span style={{color:item.positive?'#00ff8830':'#ff446630'}}>{item.pts}</span>
          </div>
        ))}
      </div>

      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:400,padding:24}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:12,marginBottom:16}}>
            <div style={{width:44,height:44,background:'linear-gradient(135deg,#00ff88,#00bfff)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:'#000',boxShadow:'0 0 30px #00ff8840'}}>$</div>
            <span style={{fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'0.12em'}}>STOCKDRAFT</span>
          </div>
          <div style={{fontSize:11,color:'#2a3555',letterSpacing:'0.1em'}}>FANTASY STOCK TRADING LEAGUE</div>
        </div>

        <div style={{background:'#0b1022',border:'1px solid #1a2040',borderRadius:12,padding:28,boxShadow:'0 24px 60px rgba(0,0,0,0.5)'}}>
          <div style={{display:'flex',marginBottom:24,borderBottom:'1px solid #1a2040'}}>
            {(['signin','signup'] as const).map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError('')}} style={{flex:1,padding:'10px',fontSize:11,fontFamily:font,fontWeight:700,letterSpacing:'0.1em',background:'none',border:'none',borderBottom:mode===m?'2px solid #00ff88':'2px solid transparent',color:mode===m?'#00ff88':'#4a5568',cursor:'pointer',marginBottom:-1}}>
                {m==='signin'?'SIGN IN':'SIGN UP'}
              </button>
            ))}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <div style={{fontSize:10,color:'#4a6080',letterSpacing:'0.12em',marginBottom:6}}>EMAIL</div>
              <div style={{background:'#09091a',border:`1px solid ${emailFocus?'#00bfff60':'#1a2040'}`,borderRadius:6,transition:'border-color 0.15s'}}>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onFocus={()=>setEmailFocus(true)} onBlur={()=>setEmailFocus(false)} placeholder="you@example.com" onKeyDown={e=>e.key==='Enter'&&submit()} style={{width:'100%',padding:'13px 14px',background:'transparent',border:'none',outline:'none',color:'#c8d0e0',fontSize:13,fontFamily:font}}/>
              </div>
            </div>
            <div>
              <div style={{fontSize:10,color:'#4a6080',letterSpacing:'0.12em',marginBottom:6}}>PASSWORD</div>
              <div style={{background:'#09091a',border:`1px solid ${passFocus?'#00bfff60':'#1a2040'}`,borderRadius:6,display:'flex',alignItems:'center',transition:'border-color 0.15s'}}>
                <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} onFocus={()=>setPassFocus(true)} onBlur={()=>setPassFocus(false)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&submit()} style={{flex:1,padding:'13px 14px',background:'transparent',border:'none',outline:'none',color:'#c8d0e0',fontSize:13,fontFamily:font}}/>
                <span onClick={()=>setShowPass(s=>!s)} style={{padding:'0 14px',color:'#4a5568',cursor:'pointer',fontSize:10,letterSpacing:'0.08em',userSelect:'none'}}>{showPass?'HIDE':'SHOW'}</span>
              </div>
            </div>

            {error&&<div style={{fontSize:11,color:error.includes('Check')?'#00ff88':'#ff4466',padding:'8px 12px',background:error.includes('Check')?'#0d1f15':'#1a0d10',border:`1px solid ${error.includes('Check')?'#00ff8830':'#ff446630'}`,borderRadius:4}}>{error}</div>}

            <button onClick={submit} disabled={loading} style={{width:'100%',padding:'13px',fontSize:12,fontFamily:font,fontWeight:700,letterSpacing:'0.12em',borderRadius:6,border:'none',background:loading?'#091a10':'linear-gradient(135deg,#00ff88,#00e070)',color:'#000',cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,marginTop:4}}>
              {loading?'LOADING...':mode==='signin'?'SIGN IN':'CREATE ACCOUNT'}
            </button>
          </div>

          <div style={{marginTop:20,textAlign:'center',fontSize:10,color:'#2a3555'}}>
            {mode==='signin'?"Don't have an account? ":"Already have an account? "}
            <span onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('')}} style={{color:'#00bfff',cursor:'pointer'}}>{mode==='signin'?'Sign up':'Sign in'}</span>
          </div>
        </div>

        <div style={{marginTop:24,textAlign:'center',fontSize:10,color:'#2a3555',letterSpacing:'0.08em'}}>DRAFT STOCKS · SCORE DAILY · WIN YOUR LEAGUE</div>
      </div>
    </div>
  )
}
