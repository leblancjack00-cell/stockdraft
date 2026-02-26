'use client'

import { useState } from 'react'
import { createClient } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string>('')
  const router = useRouter()

  const signUp = async () => {
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    setMessage(error ? error.message : 'Account created! Now sign in.')
  }

  const signIn = async () => {
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[#1a2040] bg-[#0b1022] p-8">
        <div className="text-2xl font-black tracking-wide">STOCKDRAFT</div>
        <div className="mt-1 text-sm text-zinc-400">Sign up or sign in to continue</div>
        <label className="mt-8 block">
          <div className="text-[11px] tracking-widest text-zinc-400">EMAIL</div>
          <input className="mt-2 w-full rounded-md border border-[#1a2040] bg-[#070a12] px-3 py-3 text-sm outline-none" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="mt-4 block">
          <div className="text-[11px] tracking-widest text-zinc-400">PASSWORD</div>
          <input className="mt-2 w-full rounded-md border border-[#1a2040] bg-[#070a12] px-3 py-3 text-sm outline-none" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
        </label>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={signUp} className="rounded-md border border-emerald-400/25 bg-emerald-500/10 py-3 text-[11px] font-bold tracking-[0.2em] text-emerald-300">SIGN UP</button>
          <button onClick={signIn} className="rounded-md border border-sky-400/25 bg-sky-500/10 py-3 text-[11px] font-bold tracking-[0.2em] text-sky-300">SIGN IN</button>
        </div>
        {message ? <div className="mt-4 rounded-md border border-[#1a2040] bg-[#070a12] px-3 py-3 text-xs text-zinc-200">{message}</div> : null}
      </div>
    </div>
  )
}
