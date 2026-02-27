'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

export default function Standings() {
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [standings, setStandings] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)

      // Get league
      const { data: membership } = await supabase
        .from('league_members')
        .select('*, leagues(*)')
        .eq('user_id', session.user.id)
        .limit(1)
        .single()

      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)

      // Get all members
      const { data: members } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', membership.league_id)

      // Get all weekly scores for this league
      const { data: scores } = await supabase
        .from('weekly_scores')
        .select('*')
        .eq('league_id', membership.league_id)

      // Get all matchups
      const { data: matchups } = await supabase
        .from('matchups')
        .select('*')
        .eq('league_id', membership.league_id)

      // Build standings for each member
      const standingsData = (members ?? []).map(member => {
        const memberScores = (scores ?? []).filter(s => s.user_id === member.user_id)
        const totalPts = memberScores.reduce((sum, s) => sum + s.pts, 0)

        // Calculate W/L from matchups
        const memberMatchups = (matchups ?? []).filter(m =>
          m.team_a_id === member.user_id || m.team_b_id === member.user_id
        )
        let wins = 0
        let losses = 0
        memberMatchups.forEach(m => {
          if (!m.is_complete) return
          if (m.winner_id === member.user_id) wins++
          else losses++
        })

        return {
          ...member,
          totalPts: Math.round(totalPts * 10) / 10,
          wins,
          losses,
          isMe: member.user_id === session.user.id,
        }
      }).sort((a, b) => b.totalPts - a.totalPts)

      setStandings(standingsData)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <div className="text-2xl font-black tracking-wide">Standings</div>
          <div className="text-sm text-zinc-400 mt-1">{league?.name} · Week 1</div>
        </div>

        <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] overflow-hidden">
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px', gap: 0 }}
            className="px-4 py-3 border-b border-[#1a2040]">
            <div className="text-xs text-zinc-500">#</div>
            <div className="text-xs text-zinc-500">TEAM</div>
            <div className="text-xs text-zinc-500 text-center">W</div>
            <div className="text-xs text-zinc-500 text-center">L</div>
            <div className="text-xs text-zinc-500 text-right">PTS</div>
          </div>

          {standings.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">No standings yet</div>
          ) : (
            standings.map((team, i) => (
              <div key={team.id}
                style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px', background: team.isMe ? 'rgba(0,191,255,0.05)' : 'transparent' }}
                className={`px-4 py-4 border-b border-[#0f1530] last:border-0 items-center`}>
                <div className="text-sm font-bold" style={{ color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#4a5568' }}>
                  {i + 1}
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {team.team_name}
                    {team.isMe && <span className="text-[10px] text-sky-400 border border-sky-400/30 px-1.5 py-0.5 rounded">YOU</span>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{team.joined_at ? new Date(team.joined_at).toLocaleDateString() : ''}</div>
                </div>
                <div className="text-center font-bold text-emerald-400">{team.wins}</div>
                <div className="text-center font-bold text-red-400">{team.losses}</div>
                <div className={`text-right font-black text-lg ${team.totalPts >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {team.totalPts >= 0 ? '+' : ''}{team.totalPts}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Playoff line */}
        {standings.length > 4 && (
          <div className="mt-2 text-xs text-zinc-500 text-center">
            ── Top 4 advance to playoffs ──
          </div>
        )}

      </div>
    </div>
  )
}
