'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

const font = "'JetBrains Mono', 'Fira Code', monospace"

export default function Matchup() {
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [myTeam, setMyTeam] = useState<any>(null)
  const [opponent, setOpponent] = useState<any>(null)
  const [myRoster, setMyRoster] = useState<any[]>([])
  const [oppRoster, setOppRoster] = useState<any[]>([])
  const [myScores, setMyScores] = useState<Record<string, number>>({})
  const [oppScores, setOppScores] = useState<Record<string, number>>({})
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [week, setWeek] = useState(1)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)

      const { data: membership } = await supabase
        .from('league_members').select('*, leagues(*)')
        .eq('user_id', session.user.id).limit(1).single()
      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)
      setMyTeam(membership)

      const { data: matchup } = await supabase
        .from('matchups').select('*')
        .eq('league_id', membership.league_id)
        .or(`team_a_id.eq.${session.user.id},team_b_id.eq.${session.user.id}`)
        .limit(1).single()

      let oppId = null
      if (matchup) {
        setWeek(matchup.week)
        oppId = matchup.team_a_id === session.user.id ? matchup.team_b_id : matchup.team_a_id
        const { data: oppMember } = await supabase
          .from('league_members').select('*')
          .eq('league_id', membership.league_id).eq('user_id', oppId).single()
        setOpponent(oppMember)
      }

      const { data: myRosterData } = await supabase
        .from('roster_slots').select('*, stocks(*)')
        .eq('league_id', membership.league_id).eq('user_id', session.user.id)
      setMyRoster(myRosterData ?? [])

      if (oppId) {
        const { data: oppRosterData } = await supabase
          .from('roster_slots').select('*, stocks(*)')
          .eq('league_id', membership.league_id).eq('user_id', oppId)
        setOppRoster(oppRosterData ?? [])
      }

      const { data: scores } = await supabase
        .from('weekly_scores').select('*')
        .eq('league_id', membership.league_id)
      const myS: Record<string, number> = {}
      const oppS: Record<string, number> = {}
      ;(scores ?? []).forEach((s: any) => {
        if (s.user_id === session.user.id) myS[s.stock_id] = s.pts
        else if (s.user_id === oppId) oppS[s.stock_id] = s.pts
      })
      setMyScores(myS)
      setOppScores(oppS)

      const { data: allStocks } = await supabase.from('stocks').select('ticker')
      const tickers = (allStocks ?? []).map((s: any) => s.ticker).join(',')
      const res = await fetch(`/api/prices?tickers=${tickers}`)
      setPrices(await res.json())
    }
    load()
  }, [])

  const myTotal = Object.values(myScores).reduce((a, b) => a + b, 0)
  const oppTotal = Object.values(oppScores).reduce((a, b) => a + b, 0)
  const myWinning = myTotal >= oppTotal

  const RosterTable = ({ roster, scores, label, isMe }: any) => {
    const total = Object.values(scores).reduce((a: any, b: any) => a + b, 0) as number
    return (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 12 }}>
          {label} · <span style={{ color: isMe ? '#00ff88' : '#c8d0e0', fontWeight: 700 }}>{(total as number).toFixed(1)} PTS</span>
        </div>
        <div style={{ background: '#0b1022', border: `1px solid ${isMe ? '#00ff8820' : '#1a2040'}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px', padding: '8px 14px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
            <span>STOCK</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>PTS</span>
          </div>
          {roster.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No roster</div>
          ) : roster.map((slot: any) => {
            const price = prices[slot.stocks.ticker]
            const isPos = price?.changePct >= 0
            const pts = scores[slot.stock_id] ?? 0
            return (
              <div key={slot.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #0f1530' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568', boxShadow: `0 0 5px ${SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{slot.stocks.ticker}</div>
                    <div style={{ fontSize: 9, color: '#4a5568' }}>{slot.stocks.sector}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>
                  {price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(2)}%` : '—'}
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: pts > 0 ? '#00ff88' : pts < 0 ? '#ff4466' : '#2a3555' }}>
                  {pts !== 0 ? `${pts > 0 ? '+' : ''}${pts.toFixed(1)}` : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap');`}</style>

      {/* Status bar */}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>MATCHUP</span>
        <span style={{ fontSize: 11, color: '#00ff88' }}>{league?.name}</span>
        <span style={{ fontSize: 11, color: '#4a5568' }}>WEEK {week}</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>

        {/* Score hero */}
        <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em', marginBottom: 8 }}>{myTeam?.team_name ?? 'YOUR TEAM'}</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: myWinning ? '#00ff88' : '#ff4466', lineHeight: 1 }}>{myTotal.toFixed(1)}</div>
            <div style={{ fontSize: 9, color: myWinning ? '#00ff8860' : '#ff446660', marginTop: 6, letterSpacing: '0.08em' }}>{myWinning ? '▲ WINNING' : '▼ LOSING'}</div>
          </div>

          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#2a3555', letterSpacing: '0.2em' }}>VS</div>
            <div style={{ fontSize: 9, color: '#2a3555', marginTop: 4 }}>WK {week}</div>
          </div>

          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em', marginBottom: 8 }}>{opponent?.team_name ?? 'NO OPPONENT'}</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: !myWinning ? '#00ff88' : '#ff4466', lineHeight: 1 }}>{oppTotal.toFixed(1)}</div>
            <div style={{ fontSize: 9, color: !myWinning ? '#00ff8860' : '#ff446660', marginTop: 6, letterSpacing: '0.08em' }}>{!myWinning ? '▲ WINNING' : '▼ LOSING'}</div>
          </div>
        </div>

        {/* Rosters */}
        <div style={{ display: 'flex', gap: 16 }}>
          <RosterTable roster={myRoster} scores={myScores} label={myTeam?.team_name ?? 'YOUR TEAM'} isMe={true} />
          <RosterTable roster={oppRoster} scores={oppScores} label={opponent?.team_name ?? 'OPPONENT'} isMe={false} />
        </div>

        {!opponent && (
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#2a3555', padding: 32, background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8 }}>
            No matchup scheduled yet. Matchups are set when your league has more members.
          </div>
        )}
      </div>
    </div>
  )
}
