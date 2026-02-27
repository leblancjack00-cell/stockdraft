'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const font = "'JetBrains Mono', 'Fira Code', monospace"

export default function Standings() {
  const [league, setLeague] = useState<any>(null)
  const [standings, setStandings] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }

      const { data: membership } = await supabase
        .from('league_members').select('*, leagues(*)')
        .eq('user_id', session.user.id).limit(1).single()
      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)

      const { data: members } = await supabase
        .from('league_members').select('*').eq('league_id', membership.league_id)

      const { data: scores } = await supabase
        .from('weekly_scores').select('*').eq('league_id', membership.league_id)

      const { data: matchups } = await supabase
        .from('matchups').select('*').eq('league_id', membership.league_id)

      const standingsData = (members ?? []).map((member: any) => {
        const memberScores = (scores ?? []).filter((s: any) => s.user_id === member.user_id)
        const totalPts = memberScores.reduce((sum: number, s: any) => sum + s.pts, 0)
        const memberMatchups = (matchups ?? []).filter((m: any) => m.team_a_id === member.user_id || m.team_b_id === member.user_id)
        let wins = 0, losses = 0
        memberMatchups.forEach((m: any) => {
          if (!m.is_complete) return
          if (m.winner_id === member.user_id) wins++
          else losses++
        })
        return { ...member, totalPts: Math.round(totalPts * 10) / 10, wins, losses, isMe: member.user_id === session.user.id }
      }).sort((a: any, b: any) => b.totalPts - a.totalPts)

      setStandings(standingsData)
    }
    load()
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap');`}</style>

      {/* Status bar */}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>STANDINGS</span>
        <span style={{ fontSize: 11, color: '#00ff88' }}>{league?.name}</span>
        <span style={{ fontSize: 11, color: '#4a5568' }}>WEEK 1</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>

        <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 60px 60px 80px 80px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
            <span>#</span>
            <span>TEAM</span>
            <span style={{ textAlign: 'center' }}>W</span>
            <span style={{ textAlign: 'center' }}>L</span>
            <span style={{ textAlign: 'right' }}>PTS</span>
            <span style={{ textAlign: 'right' }}>RETURN</span>
          </div>

          {standings.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No standings yet</div>
          ) : standings.map((team, i) => (
            <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 60px 60px 80px 80px', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #0f1530', background: team.isMe ? 'rgba(0,255,136,0.03)' : 'transparent' }}>
              <div style={{ fontSize: i < 3 ? 16 : 12, color: i < 3 ? '#fff' : '#2a3555', fontWeight: 700 }}>
                {i < 3 ? medals[i] : i + 1}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: team.isMe ? '#fff' : '#c8d0e0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {team.team_name}
                  {team.isMe && <span style={{ fontSize: 9, color: '#00ff88', border: '1px solid #00ff8830', padding: '1px 6px', borderRadius: 2, letterSpacing: '0.08em' }}>YOU</span>}
                </div>
                {i < 4 && <div style={{ fontSize: 9, color: '#00ff8860', marginTop: 2, letterSpacing: '0.06em' }}>✓ PLAYOFF</div>}
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#00ff88' }}>{team.wins}</div>
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#ff4466' }}>{team.losses}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: team.totalPts >= 0 ? '#00ff88' : '#ff4466' }}>
                {team.totalPts >= 0 ? '+' : ''}{team.totalPts}
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: team.totalPts >= 0 ? '#00ff8880' : '#ff446680' }}>
                {team.totalPts >= 0 ? '+' : ''}{(team.totalPts / 10).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        {/* Playoff picture */}
        {standings.length > 0 && (
          <div style={{ marginTop: 16, background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #0f1530', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em' }}>PLAYOFF PICTURE</div>
            <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {standings.map((team, i) => (
                <div key={team.id} style={{ padding: '10px 14px', borderRadius: 6, fontSize: 11, background: i < 4 ? (team.isMe ? '#0d1f15' : '#0a1525') : '#09091a', border: `1px solid ${i < 4 ? (team.isMe ? '#00ff8840' : '#1a3050') : '#0f1530'}`, color: i < 4 ? (team.isMe ? '#00ff88' : '#6ab4ff') : '#2a3555' }}>
                  <div style={{ fontSize: 9, marginBottom: 3, opacity: 0.6 }}>#{i + 1}</div>
                  {team.team_name}
                  {i < 4 && <div style={{ fontSize: 9, color: '#00ff8860', marginTop: 3 }}>✓ PLAYOFF</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
