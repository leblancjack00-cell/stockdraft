'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

export default function Dashboard() {
  const [email, setEmail] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [leagues, setLeagues] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setEmail(session.user.email ?? '')
      const { data } = await supabase.from('leagues').select('*')
      setLeagues(data ?? [])
    }
    load()
  }, [])

  const createLeague = async () => {
    if (!leagueName || !teamName) { setMessage('Enter a league name and team name.'); return }
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/'; return }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({ name: leagueName, commissioner_id: session.user.id, invite_code: inviteCode })
      .select()
      .single()

    if (leagueError) { setMessage(leagueError.message); setLoading(false); return }

    const { error: memberError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: session.user.id, team_name: teamName })

    if (memberError) { setMessage(memberError.message); setLoading(false); return }

    setLeagues(prev => [...prev, league])
    setShowCreate(false)
    setLeagueName('')
    setTeamName('')
    setMessage(`League created! Invite code: ${inviteCode}`)
    setLoading(false)
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-12">
          <div className="text-2xl font-black tracking-wide">STOCKDRAFT</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-400">{email}</div>
            <button onClick={signOut} className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-bold tracking-widest text-zinc-400">
              SIGN OUT
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {leagues.length > 0 && (
          <div className="mb-6">
            <div className="text-xs tracking-widest text-zinc-400 mb-3">MY LEAGUES</div>
            {leagues.map(league => (
              <div key={league.id} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-5 mb-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{league.name}</div>
                  <div className="text-sm text-zinc-400 mt-1">Invite code: <span className="text-emerald-400 font-bold">{league.invite_code}</span></div>
                </div>
                <div className="text-xs text-zinc-500 border border-zinc-700 rounded px-3 py-1">{league.status.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {showCreate ? (
          <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-6 mb-4">
            <div className="text-sm font-bold text-white mb-4">Create a New League</div>
            <label className="block mb-3">
              <div className="text-[11px] tracking-widest text-zinc-400 mb-2">LEAGUE NAME</div>
              <input value={leagueName} onChange={e => setLeagueName(e.target.value)} placeholder="e.g. Riverbend League" className="w-full rounded-md border border-[#1a2040] bg-[#070a12] px-3 py-3 text-sm outline-none text-white" />
            </label>
            <label className="block mb-4">
              <div className="text-[11px] tracking-widest text-zinc-400 mb-2">YOUR TEAM NAME</div>
              <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. BullRun Bros" className="w-full rounded-md border border-[#1a2040] bg-[#070a12] px-3 py-3 text-sm outline-none text-white" />
            </label>
            <div className="flex gap-3">
              <button onClick={createLeague} disabled={loading} className="flex-1 rounded-md border border-emerald-400/25 bg-emerald-500/10 py-3 text-[11px] font-bold tracking-widest text-emerald-300">
                {loading ? 'CREATING...' : 'CREATE LEAGUE'}
              </button>
              <button onClick={() => setShowCreate(false)} className="rounded-md border border-zinc-700 px-4 py-3 text-[11px] font-bold tracking-widest text-zinc-400">
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div onClick={() => setShowCreate(true)} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-6 cursor-pointer hover:border-emerald-400/30">
              <div className="text-2xl mb-3">🏗️</div>
              <div className="font-bold text-white mb-1">Create a League</div>
              <div className="text-sm text-zinc-400">Set up your own league and invite friends</div>
            </div>
            <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-6 cursor-pointer hover:border-sky-400/30">
              <div className="text-2xl mb-3">🔑</div>
              <div className="font-bold text-white mb-1">Join a League</div>
              <div className="text-sm text-zinc-400">Have an invite code? Enter it here</div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}