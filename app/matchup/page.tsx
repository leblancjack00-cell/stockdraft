'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

export default function Matchup() {
  const [session, setSession] = useState<any>(null)
  const [matchup, setMatchup] = useState<any>(null)
  const [myTeam, setMyTeam] = useState<any>(null)
  const [oppTeam, setOppTeam] = useState<any>(null)
  const [myScores, setMyScores] = useState<any[]>([])
  const [oppScores, setOppScores] = useState<any[]>([])
  const [league, setLeague] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)

      const { data: membership } = await supabase
        .from('league_members')
        .select('*, leagues(*)')
        .eq('user_id', session.user.id)
        .limit(1)
        .single()

      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)

      const { data: matchupData } = await supabase
        .from('matchups')
        .select('*')
        .eq('league_id', membership.league_id)
        .eq('week', 1)
        .or(`team_a_id.eq.${session.user.id},team_b_id.eq.${session.user.id}`)
        .single()

      if (!matchupData) return
      setMatchup(matchupData)

      const oppId = matchupData.team_a_id === session.user.id
        ? matchupData.team_b_id
        : matchupData.team_a_id

      const { data: members } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', membership.league_id)
        .in('user_id', [session.user.id, oppId])

      setMyTeam(members?.find((m: any) => m.user_id === session.user.id))
      setOppTeam(members?.find((m: any) => m.user_id === oppId))

      const { data: scores } = await supabase
        .from('weekly_scores')
        .select('*, stocks(*)')
        .eq('league_id', membership.league_id)
        .eq('week', 1)
        .in('user_id', [session.user.id, oppId])

      setMyScores(scores?.filter((s: any) => s.user_id === session.user.id) ?? [])
      setOppScores(scores?.filter((s: any) => s.user_id === oppId) ?? [])
    }
    load()
  }, [])

  const myTotal = myScores.reduce((sum, s) => sum + s.pts, 0)
  const oppTotal = oppScores.reduce((sum, s) => sum + s.pts, 0)
  const winning = myTotal > oppTotal

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <a href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 block">← Dashboard</a>
          <div className="text-2xl font-black tracking-wide">Week 1 Matchup</div>
          <div className="text-sm text-zinc-400 mt-1">{league?.name}</div>
        </div>

        {!matchup ? (
          <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-8 text-center">
            <div className="text-2xl mb-3">⚔️</div>
            <div className="font-bold text-white mb-1">No matchup found</div>
            <div className="text-sm text-zinc-400">Matchups are generated once the draft is complete</div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-xs tracking-widest text-zinc-400 mb-2">{myTeam?.team_name ?? 'Your Team'}</div>
                  <div className={`text-5xl font-black ${winning ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {myTotal.toFixed(1)}
                  </div>
                  {winning && <div className="text-xs text-emerald-400 mt-2 tracking-widest">WINNING</div>}
                </div>
                <div className="text-2xl text-zinc-600 px-4">VS</div>
                <div className="text-center flex-1">
                  <div className="text-xs tracking-widest text-zinc-400 mb-2">{oppTeam?.team_name ?? 'Opponent'}</div>
                  <div className={`text-5xl font-black ${!winning && oppTotal > myTotal ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {oppTotal.toFixed(1)}
                  </div>
                  {!winning && oppTotal > myTotal && <div className="text-xs text-emerald-400 mt-2 tracking-widest">WINNING</div>}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs tracking-widest text-zinc-400 mb-3">YOUR LINEUP</div>
              {myScores.length === 0 ? (
                <div className="text-sm text-zinc-500 py-4">No scores yet — run the scoring engine first</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myScores.map((score: any) => (
                    <div key={score.id} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="font-bold text-white">{score.stocks.ticker}</div>
                        <div className="text-xs text-zinc-400">{score.stocks.name}</div>
                      </div>
                      <div className="text-sm text-zinc-400">{score.pct_change > 0 ? '▲' : '▼'} {Math.abs(score.pct_change).toFixed(2)}%</div>
                      <div className={`text-lg font-black w-16 text-right ${score.pts >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {score.pts >= 0 ? '+' : ''}{score.pts.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs tracking-widest text-zinc-400 mb-3">OPPONENT LINEUP</div>
              {oppScores.length === 0 ? (
                <div className="text-sm text-zinc-500 py-4">Opponent has no scores yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {oppScores.map((score: any) => (
                    <div key={score.id} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="font-bold text-white">{score.stocks.ticker}</div>
                        <div className="text-xs text-zinc-400">{score.stocks.name}</div>
                      </div>
                      <div className="text-sm text-zinc-400">{score.pct_change > 0 ? '▲' : '▼'} {Math.abs(score.pct_change).toFixed(2)}%</div>
                      <div className={`text-lg font-black w-16 text-right ${score.pts >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {score.pts >= 0 ? '+' : ''}{score.pts.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
