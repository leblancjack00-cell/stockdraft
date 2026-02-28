'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

const font = "'JetBrains Mono', 'Fira Code', monospace"

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const w = 64, h = 24
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const last = pts.split(' ').pop()!.split(',')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  )
}

const MiniBar = ({ you, opp, isWin }: { you: number, opp: number, isWin: boolean }) => {
  const total = you + opp || 1
  const pct = Math.round((you / total) * 100)
  return (
    <div style={{ display: 'flex', gap: 2, height: 5, borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, background: isWin ? '#00ff88' : '#ff4466', transition: 'width 1s ease' }} />
      <div style={{ flex: 1, background: '#1a2040' }} />
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [myMember, setMyMember] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('matchup')
  const [prices, setPrices] = useState<Record<string, any>>({})

  const [matchup, setMatchup] = useState<any>(null)
  const [opponent, setOpponent] = useState<any>(null)
  const [myRoster, setMyRoster] = useState<any[]>([])
  const [oppRoster, setOppRoster] = useState<any[]>([])
  const [myScores, setMyScores] = useState<Record<string, number>>({})
  const [oppScores, setOppScores] = useState<Record<string, number>>({})
  const [weekHistory, setWeekHistory] = useState<any[]>([])

  const [standings, setStandings] = useState<any[]>([])

  const [freeAgents, setFreeAgents] = useState<any[]>([])
  const [recentTx, setRecentTx] = useState<any[]>([])
  const [dropping, setDropping] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txMsg, setTxMsg] = useState('')

  const [leagues, setLeagues] = useState<any[]>([])
  const [leagueMembers, setLeagueMembers] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [joinTeamName, setJoinTeamName] = useState('')
  const [foundLeague, setFoundLeague] = useState<any>(null)
  const [leagueMsg, setLeagueMsg] = useState('')
  const [leagueLoading, setLeagueLoading] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  const [hoveredStock, setHoveredStock] = useState<string | null>(null)
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)

      const { data: memberships } = await supabase
        .from('league_members').select('*, leagues(*)')
        .eq('user_id', session.user.id)

      if (!memberships || memberships.length === 0) {
        setLeagues([])
        return
      }

      const allLeagues = memberships.map((m: any) => m.leagues).filter(Boolean)
      setLeagues(allLeagues)

      const membership = memberships[0]
      setMyMember(membership)
      setLeague(membership.leagues)
      const leagueId = membership.league_id

      const { data: rosterData } = await supabase
        .from('roster_slots').select('*, stocks(*)')
        .eq('league_id', leagueId).eq('user_id', session.user.id)
      setMyRoster(rosterData ?? [])

      const { data: scoreData } = await supabase
        .from('weekly_scores').select('*')
        .eq('league_id', leagueId)
      const myS: Record<string, number> = {}
      const oppS: Record<string, number> = {}

      const { data: matchupData } = await supabase
        .from('matchups').select('*')
        .eq('league_id', leagueId)
        .or(`team_a_id.eq.${session.user.id},team_b_id.eq.${session.user.id}`)
        .order('week', { ascending: false }).limit(1).maybeSingle()

      let oppId: string | null = null
      if (matchupData) {
        setMatchup(matchupData)
        oppId = matchupData.team_a_id === session.user.id ? matchupData.team_b_id : matchupData.team_a_id
        const { data: oppMember } = await supabase
          .from('league_members').select('*')
          .eq('league_id', leagueId).eq('user_id', oppId).maybeSingle()
        setOpponent(oppMember)
        const { data: oppRosterData } = await supabase
          .from('roster_slots').select('*, stocks(*)')
          .eq('league_id', leagueId).eq('user_id', oppId)
        setOppRoster(oppRosterData ?? [])
      }

      ;(scoreData ?? []).forEach((s: any) => {
        if (s.user_id === session.user.id) myS[s.stock_id] = s.pts
        else if (s.user_id === oppId) oppS[s.stock_id] = s.pts
      })
      setMyScores(myS)
      setOppScores(oppS)

      const { data: allMatchups } = await supabase
        .from('matchups').select('*')
        .eq('league_id', leagueId)
        .or(`team_a_id.eq.${session.user.id},team_b_id.eq.${session.user.id}`)
        .order('week')
      const hist = (allMatchups ?? []).map((m: any) => {
        const isA = m.team_a_id === session.user.id
        return { week: m.week, you: isA ? m.score_a : m.score_b, opp: isA ? m.score_b : m.score_a, current: m.week === matchupData?.week }
      })
      setWeekHistory(hist)

      const { data: members } = await supabase
        .from('league_members').select('*').eq('league_id', leagueId)
      setLeagueMembers(members ?? [])
      const { data: allMatchupsAll } = await supabase
        .from('matchups').select('*').eq('league_id', leagueId)
      const { data: allScores } = await supabase
        .from('weekly_scores').select('*').eq('league_id', leagueId)

      const standingsData = (members ?? []).map((m: any) => {
        const pts = (allScores ?? []).filter((s: any) => s.user_id === m.user_id).reduce((a: number, s: any) => a + s.pts, 0)
        const myMatchups = (allMatchupsAll ?? []).filter((mx: any) => mx.team_a_id === m.user_id || mx.team_b_id === m.user_id)
        let wins = 0, losses = 0
        myMatchups.forEach((mx: any) => { if (!mx.is_complete) return; if (mx.winner_id === m.user_id) wins++; else losses++ })
        return { ...m, totalPts: Math.round(pts * 10) / 10, wins, losses, isMe: m.user_id === session.user.id }
      }).sort((a: any, b: any) => b.totalPts - a.totalPts)
      setStandings(standingsData)

      const { data: allSlots } = await supabase.from('roster_slots').select('stock_id').eq('league_id', leagueId)
      const draftedIds = new Set((allSlots ?? []).map((s: any) => s.stock_id))
      const { data: allStocks } = await supabase.from('stocks').select('*').order('ticker')
      setFreeAgents((allStocks ?? []).filter((s: any) => !draftedIds.has(s.id)))

      const { data: recentPicks } = await supabase
        .from('draft_picks').select('*, stocks(*), league_members(team_name)')
        .eq('league_id', leagueId).order('picked_at', { ascending: false }).limit(6)
      setRecentTx(recentPicks ?? [])

      const { data: stocksForPrices } = await supabase.from('stocks').select('ticker')
      const tickers = (stocksForPrices ?? []).map((s: any) => s.ticker).join(',')
      if (tickers) {
        const res = await fetch(`/api/prices?tickers=${tickers}`)
        const priceData = await res.json()
        setPrices(priceData)
      }
    }
    load()
  }, [])

  const myTotal = Object.values(myScores).reduce((a: number, b) => a + b, 0)
  const oppTotal = Object.values(oppScores).reduce((a: number, b) => a + b, 0)
  const isWinning = myTotal >= oppTotal

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const createLeague = async () => {
    if (!leagueName || !teamName) { setLeagueMsg('Enter league and team name.'); return }
    setLeagueLoading(true); setLeagueMsg('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: lg, error } = await supabase.from('leagues')
      .insert({ name: leagueName, commissioner_id: session.user.id, invite_code: inviteCode })
      .select().single()
    if (error) { setLeagueMsg(error.message); setLeagueLoading(false); return }
    await supabase.from('league_members').insert({ league_id: lg.id, user_id: session.user.id, team_name: teamName })
    setLeagues(prev => [...prev, lg])
    setShowCreate(false); setLeagueName(''); setTeamName('')
    setLeagueMsg(`League created! Invite code: ${inviteCode}`)
    setLeagueLoading(false)
  }

  const lookupCode = async (code: string) => {
    if (code.length < 6) return
    const supabase = createClient()
    const { data } = await supabase.from('leagues').select('*').eq('invite_code', code).maybeSingle()
    setFoundLeague(data ?? null)
  }

  const joinLeague = async () => {
    if (!foundLeague || !joinTeamName) { setLeagueMsg('Enter a team name.'); return }
    setLeagueLoading(true); setLeagueMsg('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('league_members')
      .insert({ league_id: foundLeague.id, user_id: session.user.id, team_name: joinTeamName })
    if (error) { setLeagueMsg(error.message.includes('unique') ? 'Already joined.' : error.message); setLeagueLoading(false); return }
    setLeagues(prev => [...prev, foundLeague])
    setShowJoin(false); setInviteInput(''); setJoinTeamName(''); setFoundLeague(null)
    setLeagueMsg(`Joined ${foundLeague.name}!`)
    setLeagueLoading(false)
  }

  const dropStock = async (slot: any) => {
    setTxLoading(true); setTxMsg('')
    const supabase = createClient()
    await supabase.from('roster_slots').delete().eq('id', slot.id)
    setMyRoster(prev => prev.filter(s => s.id !== slot.id))
    setFreeAgents(prev => [...prev, slot.stocks].sort((a: any, b: any) => a.ticker.localeCompare(b.ticker)))
    setDropping(null); setTxMsg(`Dropped ${slot.stocks.ticker}`)
    setTxLoading(false)
  }

  const addStock = async (stock: any) => {
    setTxLoading(true); setTxMsg('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !league) return
    await supabase.from('roster_slots').insert({ league_id: league.id, user_id: session.user.id, stock_id: stock.id })
    const { data: newSlot } = await supabase.from('roster_slots').select('*, stocks(*)')
      .eq('league_id', league.id).eq('user_id', session.user.id).eq('stock_id', stock.id).maybeSingle()
    if (newSlot) setMyRoster(prev => [...prev, newSlot])
    setFreeAgents(prev => prev.filter((s: any) => s.id !== stock.id))
    setAdding(null); setTxMsg(`Added ${stock.ticker}`)
    setTxLoading(false)
  }

  const cardStyle = { background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' as const }
  const cardHeaderStyle = { padding: '12px 16px', borderBottom: '1px solid #1a2040', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0f1e' }
  const cardTitleStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#4a6080' }

  const navItems = [
    { id: 'matchup', label: 'Matchup', icon: '⚔' },
    { id: 'roster', label: 'My Roster', icon: '📋' },
    { id: 'standings', label: 'Standings', icon: '🏆' },
    { id: 'waiver', label: 'Waiver Wire', icon: '🔄' },
    { id: 'leagues', label: 'Leagues', icon: '🏛', dropdown: [
      { label: 'My Leagues', action: 'leagues' },
      { label: 'League Settings', action: 'league_settings' },
      { label: 'Scoring Rules', action: 'scoring_rules' },
      { label: 'Members', action: 'members' },
    ]},
  ]

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #080b14; }
        ::-webkit-scrollbar-thumb { background: #1a2040; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        .hover-row:hover { background: #0f1830 !important; cursor: default; }
        .nav-item:hover { background: #0d1225 !important; color: #c8d0e0 !important; }
      `}</style>

      <div style={{ background: 'linear-gradient(90deg, #0d1225 0%, #0a0f1e 100%)', borderBottom: '1px solid #1a2040', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', color: '#fff' }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #00ff88, #00bfff)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#000' }}>$</div>
          STOCKDRAFT
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 11, color: '#4a5568' }}>
          <span style={{ color: '#2a3555' }}>{league?.name ?? 'NO LEAGUE'}</span>
          <span style={{ color: '#2a3555' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d1f15', border: '1px solid #00ff8840', borderRadius: 4, padding: '4px 10px', color: '#00ff88', fontSize: 11 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', animation: 'pulse 1.5s ease-in-out infinite' }} />
            MARKET OPEN
          </div>
          <div onClick={signOut} style={{ padding: '4px 10px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 4, cursor: 'pointer', color: '#4a5568', letterSpacing: '0.08em' }}>SIGN OUT</div>
        </div>
      </div>

      <div style={{ background: '#070a12', borderBottom: '1px solid #14182e', padding: '5px 0', overflow: 'hidden', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', gap: 48, animation: 'ticker 30s linear infinite' }}>
          {[...Array(2)].map((_, repeat) => (
            <span key={repeat} style={{ display: 'inline-flex', gap: 48 }}>
              {(myRoster ?? []).map((stock: any, i: number) => {
                const price = prices?.[stock.stocks?.ticker]
                const pos = price?.changePct >= 0
                const isOnMyRoster = true
                return (
                  <span key={i} style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.06em' }}>
                    {isOnMyRoster && <span style={{ color: '#00ff88', marginRight: 4, fontSize: 8 }}>●</span>}
                    <span style={{ color: '#a0b4d0', fontWeight: 700 }}>{stock.stocks?.ticker}</span>
                    {price && <span style={{ color: pos ? '#00ff88' : '#ff4466', marginLeft: 6 }}>{pos ? '▲' : '▼'} {Math.abs(price.changePct).toFixed(2)}%</span>}
                    {price && <span style={{ color: '#2a3555', marginLeft: 6 }}>${price.close.toFixed(2)}</span>}
                  </span>
                )
              })}
              <span style={{ color: '#1a2535' }}>·</span>
              <span style={{ fontSize: 11, color: '#2a3555' }}>STOCKDRAFT</span>
              <span style={{ fontSize: 11, color: '#2a3555' }}>WEEK {matchup?.week ?? 1}</span>
              <span style={{ fontSize: 11, color: '#2a3555' }}>SCORES UPDATE DAILY</span>
            </span>
          ))}
        </div>
      </div>

      {matchup && (
        <div style={{ background: '#0a0d1a', borderBottom: '1px solid #1a2040', padding: '0 24px', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <span style={{ color: '#2a3555', letterSpacing: '0.1em', fontSize: 10 }}>WK {matchup?.week ?? 1}</span>
            <span style={{ color: '#1a2535' }}>·</span>
            <span style={{ color: isWinning ? '#fff' : '#4a5568', fontWeight: 700 }}>{myMember?.team_name ?? 'YOU'}</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: isWinning ? '#00ff88' : '#c8d0e0', marginLeft: 4 }}>{myTotal.toFixed(1)}</span>
          </div>
          <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.15em', padding: '3px 10px', border: `1px solid ${isWinning ? '#00ff8840' : '#ff446640'}`, borderRadius: 3, color: isWinning ? '#00ff88' : '#ff4466' }}>{isWinning ? 'WINNING' : 'LOSING'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: !isWinning ? '#00ff88' : '#c8d0e0', marginRight: 4 }}>{oppTotal.toFixed(1)}</span>
            <span style={{ color: !isWinning ? '#fff' : '#4a5568', fontWeight: 700 }}>{opponent?.team_name ?? 'OPP'}</span>
          </div>
        </div>
      )}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, flexShrink: 0, overflowX: 'auto' }}>
        <span style={{ color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>SEASON PROGRESS</span>
        {Array.from({ length: 13 }, (_, i) => (
          <div key={i} style={{ width: 24, height: 6, borderRadius: 3, background: i === (matchup?.week ?? 1) - 1 ? '#00ff88' : i < (matchup?.week ?? 1) - 1 ? '#1e3a28' : '#14182e', border: i === (matchup?.week ?? 1) - 1 ? '1px solid #00ff8860' : '1px solid transparent', flexShrink: 0 }} title={`Week ${i + 1}`} />
        ))}
        <span style={{ color: '#2a3555', whiteSpace: 'nowrap' }}>PLAYOFFS: WK 11–13</span>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 200, background: '#0a0d1a', borderRight: '1px solid #14182e', padding: '16px 0', flexShrink: 0 }}>
          <div style={{ padding: '8px 20px 16px', fontSize: 10, color: '#2a3555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {league?.name ?? 'NO LEAGUE'}
          </div>
          {navItems.map(item => (
            <div key={item.id} className="nav-item"
              onClick={() => setActiveTab(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer', color: activeTab === item.id ? '#fff' : '#4a5568', background: activeTab === item.id ? '#0d1225' : 'transparent', borderLeft: `2px solid ${activeTab === item.id ? '#00ff88' : 'transparent'}`, textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.15s', position: 'relative' as const }}
              onMouseEnter={() => (item as any).dropdown && setHoveredNav(item.id)}
              onMouseLeave={() => setHoveredNav(null)}>
              <span>{item.icon}</span>{item.label}
              {(item as any).dropdown && hoveredNav === item.id && (
                <div style={{ position: 'absolute', left: '100%', top: 0, width: 200, background: '#0d1225', border: '1px solid #1a2040', borderRadius: 6, zIndex: 200, boxShadow: '4px 4px 20px rgba(0,0,0,0.5)' }}
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}>
                  {(item as any).dropdown.map((d: any) => (
                    <div key={d.action} onClick={(e) => { e.stopPropagation(); setActiveTab(d.action); setHoveredNav(null) }}
                      style={{ padding: '11px 16px', fontSize: 12, color: '#c8d0e0', cursor: 'pointer', borderBottom: '1px solid #14182e', letterSpacing: '0.06em' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#14182e')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {d.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={{ margin: '20px 0', borderTop: '1px solid #14182e' }} />
          <div style={{ padding: '0 20px', fontSize: 10, color: '#2a3555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>YOUR TEAM</div>
          <div style={{ padding: '0 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#c8d0e0', marginBottom: 4 }}>{myMember?.team_name ?? '—'}</div>
            <div style={{ fontSize: 11, color: '#00ff88' }}>{standings.find(s => s.isMe)?.wins ?? 0}W – {standings.find(s => s.isMe)?.losses ?? 0}L</div>
            <div style={{ fontSize: 10, color: '#4a5568', marginTop: 12, marginBottom: 4 }}>SEASON PTS</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{(standings.find(s => s.isMe)?.totalPts ?? 0).toFixed(1)}</div>
            <div style={{ fontSize: 10, color: myTotal >= 0 ? '#00ff88' : '#ff4466', marginTop: 2 }}>{myTotal >= 0 ? '+' : ''}{myTotal.toFixed(1)} this week</div>
          </div>
          <div style={{ margin: '20px 0', borderTop: '1px solid #14182e' }} />
          <div style={{ padding: '0 20px' }}>
            <a href="/draft" style={{ display: 'block', padding: '8px 12px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid #00ff8840', borderRadius: 4, color: '#00ff88', textDecoration: 'none', textAlign: 'center', marginBottom: 8 }}>DRAFT ROOM</a>
            <a href="/stocks" style={{ display: 'block', padding: '8px 12px', fontSize: 10, letterSpacing: '0.08em', border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', textDecoration: 'none', textAlign: 'center' }}>BROWSE STOCKS</a>
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #14182e' }}>
            {navItems.map(item => (
              <div key={item.id} onClick={() => setActiveTab(item.id)}
                style={{ padding: '10px 20px', fontSize: 11, cursor: 'pointer', color: activeTab === item.id ? '#fff' : '#4a5568', background: activeTab === item.id ? '#0d1225' : 'transparent', borderBottom: `2px solid ${activeTab === item.id ? '#00ff88' : 'transparent'}`, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.15s' }}>
                {item.label}
              </div>
            ))}
          </div>

          {activeTab === 'matchup' && (
            <>
              <div style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1428 50%, #0a0f1e 100%)', border: '1px solid #1a2040', borderRadius: 8, padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 50% -20%, #00ff8808 0%, transparent 60%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 10, color: '#2a3555', letterSpacing: '0.15em', textAlign: 'center', marginBottom: 16 }}>
                  WEEK {matchup?.week ?? 1} MATCHUP {matchup ? '· IN PROGRESS' : '· NO MATCHUP SET'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{myMember?.team_name ?? 'YOUR TEAM'}</div>
                    <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em', color: isWinning ? '#fff' : '#4a5568', lineHeight: 1 }}>{myTotal.toFixed(1)}</div>
                    <div style={{ fontSize: 13, color: '#00ff88', marginTop: 4 }}>▲ Live</div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, marginBottom: 8, letterSpacing: '0.2em', color: '#2a3050' }}>VS</div>
                    <div style={{ fontSize: 10, color: '#1a2535' }}>────</div>
                    <div style={{ fontSize: 9, marginTop: 8, color: isWinning ? '#00ff88' : '#ff4466' }}>{isWinning ? 'WINNING' : 'LOSING'}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{opponent?.team_name ?? 'NO OPPONENT'}</div>
                    <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em', color: !isWinning ? '#fff' : '#4a5568', lineHeight: 1 }}>{oppTotal.toFixed(1)}</div>
                    <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>▲ Live</div>
                  </div>
                </div>
                <div style={{ marginTop: 20, padding: '0 40px' }}>
                  <MiniBar you={myTotal} opp={oppTotal} isWin={isWinning} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, fontSize: 10, color: '#2a3555' }}>
                  <span>HIGH SCORER: <span style={{ color: '#a0b4d0' }}>{myRoster.length > 0 ? [...myRoster].sort((a: any, b: any) => (myScores[b.stock_id] ?? 0) - (myScores[a.stock_id] ?? 0))[0]?.stocks?.ticker ?? '—' : '—'}</span></span>
                  <span>·</span>
                  <span>STOCKS: <span style={{ color: '#c8d0e0' }}>{myRoster.length}</span></span>
                </div>
              </div>

              {weekHistory.length > 0 && (
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>Season History</span>
                    <span style={{ fontSize: 10, color: '#00ff88' }}>{standings.find(s => s.isMe)?.wins ?? 0}W {standings.find(s => s.isMe)?.losses ?? 0}L</span>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    {weekHistory.map((w, i) => {
                      const win = w.you > w.opp
                      const maxPts = Math.max(...weekHistory.map(x => Math.max(x.you, x.opp)), 100)
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ fontSize: 9, color: w.current ? '#fff' : '#2a3555' }}>{w.you?.toFixed(0)}</div>
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, border: w.current ? '1px solid #00ff8840' : '1px solid transparent', borderRadius: 3, padding: 2 }}>
                            <div style={{ height: Math.max(Math.round((w.you / maxPts) * 60), 4), background: win ? '#00ff8860' : '#ff446660', borderRadius: 2 }} />
                            <div style={{ height: 1, background: '#1a2040' }} />
                            <div style={{ height: Math.max(Math.round((w.opp / maxPts) * 60), 4), background: '#1a2a3a', borderRadius: 2 }} />
                          </div>
                          <div style={{ fontSize: 9, color: w.current ? '#00ff88' : '#2a3555' }}>W{w.week}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ padding: '0 16px 12px', display: 'flex', gap: 16, fontSize: 9, color: '#2a3555' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 6, background: '#00ff8860', borderRadius: 1 }} /> Your score</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 6, background: '#1a2a3a', borderRadius: 1 }} /> Opponent</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>Your Lineup</span>
                    <span style={{ fontSize: 10, color: '#00ff88' }}>{myTotal.toFixed(1)} PTS</span>
                  </div>
                  {myRoster.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No stocks — go to Draft</div>
                  ) : myRoster.map((slot: any) => {
                    const pts = myScores[slot.stock_id] ?? 0
                    return (
                      <div key={slot.id} className="hover-row" style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0f1530' }}>
                        <div style={{ width: 60, fontSize: 13, fontWeight: 700, color: '#a0b4d0', letterSpacing: '0.06em' }}>{slot.stocks.ticker}</div>
                        <div style={{ flex: 1, fontSize: 11, color: '#4a5a70' }}>{slot.stocks.name}</div>
                        <div style={{ width: 70, textAlign: 'right', fontSize: 13, fontWeight: 600, color: pts >= 0 ? '#00ff88' : '#ff4466' }}>{pts > 0 ? '+' : ''}{pts.toFixed(1)}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>{opponent?.team_name ?? 'Opponent'}</span>
                    <span style={{ fontSize: 10, color: '#ff4466' }}>{oppTotal.toFixed(1)} PTS</span>
                  </div>
                  {oppRoster.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No opponent yet</div>
                  ) : oppRoster.map((slot: any) => {
                    const pts = oppScores[slot.stock_id] ?? 0
                    return (
                      <div key={slot.id} className="hover-row" style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0f1530' }}>
                        <div style={{ width: 60, fontSize: 13, fontWeight: 700, color: '#a0b4d0', letterSpacing: '0.06em' }}>{slot.stocks.ticker}</div>
                        <div style={{ flex: 1, fontSize: 11, color: '#4a5a70' }}>{slot.stocks.name}</div>
                        <div style={{ width: 70, textAlign: 'right', fontSize: 13, fontWeight: 600, color: pts >= 0 ? '#00ff88' : '#ff4466' }}>{pts > 0 ? '+' : ''}{pts.toFixed(1)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'roster' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{myRoster.length} STOCKS ON ROSTER</span>
                <a href="/draft" style={{ padding: '5px 12px', fontSize: 10, border: '1px solid #00ff8840', borderRadius: 4, color: '#00ff88', textDecoration: 'none', letterSpacing: '0.08em' }}>+ DRAFT MORE</a>
              </div>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>Active Roster</span>
                  <span style={{ fontSize: 10, color: '#4a5568' }}>WEEK PTS: {myTotal.toFixed(1)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '24px 70px 1fr 80px 80px 70px 70px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
                  <span>#</span><span>TICKER</span><span>NAME</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>TREND</span><span style={{ textAlign: 'right' }}>PTS</span>
                </div>
                {myRoster.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No stocks yet. <a href="/draft" style={{ color: '#00ff88' }}>Go draft some →</a></div>
                ) : myRoster.map((slot: any, i: number) => {
                  const price = prices[slot.stocks.ticker]
                  const isPos = price?.changePct >= 0
                  const pts = myScores[slot.stock_id] ?? 0
                  const sparkData = [100, 101, 100.5, 102, 101.5, 103, 102, 103.5].map(v => v + (Math.random() * 2 - 1))
                  return (
                    <div key={slot.id} className="hover-row" style={{ display: 'grid', gridTemplateColumns: '24px 70px 1fr 80px 80px 70px 70px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0f1530' }}>
                      <div style={{ fontSize: 10, color: '#2a3555' }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568', boxShadow: `0 0 5px ${SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568'}60` }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#a0b4d0', letterSpacing: '0.06em' }}>{slot.stocks.ticker}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#c8d0e0' }}>{slot.stocks.name}</div>
                        <div style={{ fontSize: 10, color: '#2a3555', marginTop: 1 }}>{slot.stocks.sector}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                      <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>{price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(2)}%` : '—'}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Sparkline data={sparkData} color={pts >= 0 ? '#00ff88' : '#ff4466'} />
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: pts >= 0 ? '#00ff88' : '#ff4466' }}>{pts !== 0 ? `${pts > 0 ? '+' : ''}${pts.toFixed(1)}` : '—'}</div>
                    </div>
                  )
                })}
              </div>
              {myRoster.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={cardStyle}>
                    <div style={cardHeaderStyle}><span style={cardTitleStyle}>Sector Exposure</span></div>
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Array.from(new Set(myRoster.map((s: any) => s.stocks.sector))).map((sec: any) => {
                        const count = myRoster.filter((s: any) => s.stocks.sector === sec).length
                        const pct = Math.round((count / myRoster.length) * 100)
                        const color = SECTOR_COLORS[sec] ?? '#4a5568'
                        return (
                          <div key={sec}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#c8d0e0', marginBottom: 4 }}>
                              <span style={{ color }}>{sec}</span><span>{pct}%</span>
                            </div>
                            <div style={{ height: 5, background: '#0a0d1a', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div style={cardStyle}>
                    <div style={cardHeaderStyle}><span style={cardTitleStyle}>Week Performance</span></div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: myTotal >= 0 ? '#00ff88' : '#ff4466', marginBottom: 4 }}>{myTotal >= 0 ? '+' : ''}{myTotal.toFixed(1)} <span style={{ fontSize: 12, color: '#4a5568' }}>pts</span></div>
                      <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 16 }}>this week</div>
                      {(() => {
                        const sorted = [...myRoster].sort((a: any, b: any) => (myScores[b.stock_id] ?? 0) - (myScores[a.stock_id] ?? 0))
                        const best = sorted[0], worst = sorted[sorted.length - 1]
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a5568' }}>
                              <span>Best performer</span><span style={{ color: '#00ff88' }}>{best.stocks.ticker} {myScores[best.stock_id] !== undefined ? `${myScores[best.stock_id] >= 0 ? '+' : ''}${myScores[best.stock_id].toFixed(1)}` : '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a5568' }}>
                              <span>Worst performer</span><span style={{ color: '#ff4466' }}>{worst.stocks.ticker} {myScores[worst.stock_id] !== undefined ? `${myScores[worst.stock_id] >= 0 ? '+' : ''}${myScores[worst.stock_id].toFixed(1)}` : '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a5568' }}>
                              <span>Stocks on roster</span><span style={{ color: '#c8d0e0' }}>{myRoster.length}</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'standings' && (
            <>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>{league?.name ?? 'League'} — Week {matchup?.week ?? 1}</span>
                  <span style={{ fontSize: 10, color: '#4a5568' }}>{standings.length} TEAMS</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 60px 90px 90px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #0f1530' }}>
                  <span>#</span><span>TEAM</span><span style={{ textAlign: 'center' }}>W</span><span style={{ textAlign: 'center' }}>L</span><span style={{ textAlign: 'right' }}>PTS</span><span style={{ textAlign: 'right' }}>RETURN</span>
                </div>
                {standings.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No standings yet</div>
                ) : standings.map((team: any, i: number) => (
                  <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 60px 90px 90px', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid #0f1530', background: team.isMe ? '#0d1f15' : 'transparent', borderLeft: `2px solid ${team.isMe ? '#00ff88' : 'transparent'}` }}>
                    <div style={{ fontSize: i < 3 ? 16 : 12, fontWeight: 700, color: i < 3 ? '#00ff88' : '#2a3555' }}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</div>
                    <div style={{ fontSize: 12, color: team.isMe ? '#fff' : '#c8d0e0', fontWeight: team.isMe ? 700 : 400 }}>
                      {team.team_name} {team.isMe && <span style={{ fontSize: 9, color: '#00ff88', marginLeft: 6 }}>YOU</span>}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#00ff88' }}>{team.wins}</div>
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#ff4466' }}>{team.losses}</div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#c8d0e0' }}>{team.totalPts.toLocaleString()}</div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: team.totalPts >= 0 ? '#00ff88' : '#ff4466' }}>{team.totalPts >= 0 ? '+' : ''}{(team.totalPts / 10).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}><span style={cardTitleStyle}>Playoff Picture</span></div>
                <div style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                  {standings.map((team: any, i: number) => (
                    <div key={team.id} style={{ padding: '10px 14px', borderRadius: 6, fontSize: 11, background: i < 4 ? (team.isMe ? '#0d1f15' : '#0a1525') : '#09091a', border: `1px solid ${i < 4 ? (team.isMe ? '#00ff8840' : '#1a3050') : '#0f1530'}`, color: i < 4 ? (team.isMe ? '#00ff88' : '#6ab4ff') : '#2a3555' }}>
                      <div style={{ fontSize: 9, marginBottom: 3, opacity: 0.6 }}>#{i + 1}</div>
                      {team.team_name}
                      {i < 4 && <div style={{ fontSize: 9, color: '#00ff8860', marginTop: 3 }}>✓ PLAYOFF</div>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'waiver' && (
            <>
              {txMsg && <div style={{ padding: '8px 16px', background: '#081a10', border: '1px solid #00ff8840', borderRadius: 6, fontSize: 11, color: '#00ff88' }}>{txMsg}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>WAIVER WIRE · {freeAgents.length} AVAILABLE</span>
                <span style={{ fontSize: 11, color: '#2a3555', letterSpacing: '0.08em' }}>CLAIMS PROCESS SUN 12:01 AM · MY ROSTER: {myRoster.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>Available Stocks</span>
                    <span style={{ fontSize: 10, color: '#4a5568' }}>SORTED BY TICKER</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
                    <span>STOCK</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>ACTION</span>
                  </div>
                  {freeAgents.slice(0, 15).map((stock: any) => {
                    const price = prices[stock.ticker]
                    const isPos = price?.changePct >= 0
                    const isAddingThis = adding === stock.id
                    return (
                      <div key={stock.id}>
                        <div className="hover-row" style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid #0f1530' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: SECTOR_COLORS[stock.sector] ?? '#4a5568', boxShadow: `0 0 5px ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#a0b4d0' }}>{stock.ticker}</div>
                              <div style={{ fontSize: 9, color: '#2a3555' }}>{stock.sector}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 11, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                          <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>{price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(1)}%` : '—'}</div>
                          <div style={{ textAlign: 'right' }}>
                            <div onClick={() => setAdding(isAddingThis ? null : stock.id)} style={{ display: 'inline-flex', padding: '4px 10px', fontSize: 9, background: '#0d1f15', border: '1px solid #00ff8840', borderRadius: 3, color: '#00ff88', cursor: 'pointer', letterSpacing: '0.08em' }}>CLAIM</div>
                          </div>
                        </div>
                        {isAddingThis && (
                          <div style={{ padding: '10px 16px', background: '#080f08', borderBottom: '1px solid #0f1530', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#4a5568', flex: 1 }}>Add {stock.ticker}?</span>
                            <div onClick={() => !txLoading && addStock(stock)} style={{ padding: '5px 12px', fontSize: 10, background: '#0d1f15', border: '1px solid #00ff8840', borderRadius: 3, color: '#00ff88', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.08em' }}>CONFIRM</div>
                            <div onClick={() => setAdding(null)} style={{ padding: '5px 12px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 3, color: '#4a5568', cursor: 'pointer', letterSpacing: '0.08em' }}>CANCEL</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>My Roster</span>
                    <span style={{ fontSize: 10, color: '#4a5568' }}>TAP DROP TO REMOVE</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
                    <span>STOCK</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>ACTION</span>
                  </div>
                  {myRoster.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No stocks on roster</div>
                  ) : myRoster.map((slot: any) => {
                    const price = prices[slot.stocks.ticker]
                    const isPos = price?.changePct >= 0
                    const isDroppingThis = dropping === slot.id
                    return (
                      <div key={slot.id}>
                        <div className="hover-row" style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid #0f1530' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568', boxShadow: `0 0 5px ${SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#a0b4d0' }}>{slot.stocks.ticker}</div>
                              <div style={{ fontSize: 9, color: '#2a3555' }}>{slot.stocks.sector}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 11, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                          <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>{price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(1)}%` : '—'}</div>
                          <div style={{ textAlign: 'right' }}>
                            <div onClick={() => setDropping(isDroppingThis ? null : slot.id)} style={{ display: 'inline-flex', padding: '4px 10px', fontSize: 9, background: '#1a0d10', border: '1px solid #ff446640', borderRadius: 3, color: '#ff4466', cursor: 'pointer', letterSpacing: '0.08em' }}>RELEASE</div>
                          </div>
                        </div>
                        {isDroppingThis && (
                          <div style={{ padding: '10px 16px', background: '#110810', borderBottom: '1px solid #0f1530', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#4a5568', flex: 1 }}>Drop {slot.stocks.ticker}?</span>
                            <div onClick={() => !txLoading && dropStock(slot)} style={{ padding: '5px 12px', fontSize: 10, background: '#1a0d10', border: '1px solid #ff446640', borderRadius: 3, color: '#ff4466', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.08em' }}>CONFIRM</div>
                            <div onClick={() => setDropping(null)} style={{ padding: '5px 12px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 3, color: '#4a5568', cursor: 'pointer', letterSpacing: '0.08em' }}>CANCEL</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              {recentTx.length > 0 && (
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={cardTitleStyle}>Recent Draft Picks</span></div>
                  {recentTx.map((tx: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0f1530', gap: 12 }}>
                      <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#00ff8820', color: '#00ff88', border: '1px solid #00ff8840', letterSpacing: '0.08em', flexShrink: 0 }}>DRAFT</div>
                      <div style={{ flex: 1, fontSize: 12, color: '#c8d0e0' }}>{tx.stocks?.ticker}</div>
                      <div style={{ fontSize: 11, color: '#4a5568' }}>{tx.league_members?.team_name}</div>
                      <div style={{ fontSize: 10, color: '#2a3555' }}>Pick #{tx.pick_number}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'league_settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}><span style={cardTitleStyle}>League Settings</span></div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    ['League Name', league?.name ?? '—'],
                    ['Season', league?.season ?? '—'],
                    ['Status', league?.status?.toUpperCase() ?? 'ACTIVE'],
                    ['Invite Code', league?.invite_code ?? '—'],
                    ['Current Week', `Week ${league?.week ?? 1}`],
                    ['Visibility', league?.is_public ? 'Public' : 'Private'],
                    ['Teams', leagues.length.toString()],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '11px 0', borderBottom: '1px solid #0f1530' }}>
                      <div style={{ fontSize: 12, color: '#4a5568' }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#c8d0e0' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}><span style={cardTitleStyle}>Draft Settings</span></div>
                <div style={{ padding: 20 }}>
                  {[
                    ['Draft Type', 'Snake Draft'],
                    ['Seconds Per Pick', '60 seconds'],
                    ['Draft Order', 'Randomized'],
                    ['Waiver Wire', 'Enabled'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '11px 0', borderBottom: '1px solid #0f1530' }}>
                      <div style={{ fontSize: 12, color: '#4a5568' }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#c8d0e0' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scoring_rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}><span style={cardTitleStyle}>Base Scoring</span></div>
                <div style={{ padding: 20 }}>
                  {[
                    ['Format', 'Head-to-Head Weekly'],
                    ['Scoring Type', 'Price % Change'],
                    ['Points Per 1% Gain', '+5 pts'],
                    ['Points Per 1% Loss', '-5 pts'],
                    ['Score Updates', 'Daily after market close'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '11px 0', borderBottom: '1px solid #0f1530' }}>
                      <div style={{ fontSize: 12, color: '#4a5568' }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#c8d0e0' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}><span style={cardTitleStyle}>Bonus Points</span></div>
                <div style={{ padding: 20 }}>
                  {[
                    ['52-Week High Hit', '+10 pts'],
                    ['Beat Earnings Estimate', '+15 pts'],
                    ['Gain Over 10% in a Week', '+20 pts'],
                    ['Stock Halted / Delisted', '-25 pts'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '11px 0', borderBottom: '1px solid #0f1530' }}>
                      <div style={{ fontSize: 12, color: '#4a5568' }}>{label}</div>
                      <div style={{ fontSize: 12, color: value.startsWith('-') ? '#ff4466' : '#00ff88' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}><span style={cardTitleStyle}>Playoff Structure</span></div>
                <div style={{ padding: 20 }}>
                  {[
                    ['Regular Season', 'Weeks 1–10'],
                    ['Playoffs', 'Weeks 11–13'],
                    ['Playoff Teams', 'Top 4'],
                    ['Championship', 'Week 13'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '11px 0', borderBottom: '1px solid #0f1530' }}>
                      <div style={{ fontSize: 12, color: '#4a5568' }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#c8d0e0' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div style={cardStyle}>
              <div style={cardHeaderStyle}><span style={cardTitleStyle}>League Members</span></div>
              <div>
                {(leagueMembers ?? []).map((m: any) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #0f1530', background: m.user_id === session?.user?.id ? '#0d1f15' : 'transparent' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{m.team_name} {m.user_id === session?.user?.id && <span style={{ fontSize: 9, color: '#00ff88', marginLeft: 6 }}>YOU</span>}</div>
                      <div style={{ fontSize: 10, color: '#2a3555', marginTop: 2 }}>Joined {new Date(m.joined_at ?? m.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: 11, color: m.user_id === league?.commissioner_id ? '#00ff88' : '#4a5568' }}>
                      {m.user_id === league?.commissioner_id ? '⭐ Commissioner' : 'Member'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'leagues' && (
            <>
              {leagueMsg && <div style={{ padding: '8px 16px', background: '#081a10', border: '1px solid #00ff8840', borderRadius: 6, fontSize: 11, color: '#00ff88' }}>{leagueMsg}</div>}
              {leagues.length > 0 && (
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={cardTitleStyle}>My Leagues</span></div>
                  {leagues.map((lg: any) => (
                    <div key={lg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #0f1530' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{lg.name}</div>
                        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 3 }}>Invite code: <span style={{ color: '#00ff88', fontWeight: 700 }}>{lg.invite_code}</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 10, color: '#4a5568', border: '1px solid #1a2040', borderRadius: 3, padding: '3px 8px', letterSpacing: '0.08em' }}>{lg.status?.toUpperCase()}</div>
                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); router.push(`/league/${lg.id}`) }} style={{ fontSize: 10, color: '#00bfff', border: '1px solid #00bfff40', borderRadius: 3, padding: '3px 8px', letterSpacing: '0.08em', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>SETTINGS →</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!showCreate && !showJoin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div onClick={() => setShowCreate(true)} style={{ ...cardStyle, padding: 24, cursor: 'pointer' }}>
                    <div style={{ fontSize: 24, marginBottom: 12 }}>🏗️</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Create a League</div>
                    <div style={{ fontSize: 11, color: '#4a5568' }}>Set up your own league and invite friends</div>
                  </div>
                  <div onClick={() => setShowJoin(true)} style={{ ...cardStyle, padding: 24, cursor: 'pointer' }}>
                    <div style={{ fontSize: 24, marginBottom: 12 }}>🔑</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Join a League</div>
                    <div style={{ fontSize: 11, color: '#4a5568' }}>Have an invite code? Enter it here</div>
                  </div>
                </div>
              )}
              {showCreate && (
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={cardTitleStyle}>Create a New League</span></div>
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 6 }}>LEAGUE NAME</div>
                      <input value={leagueName} onChange={e => setLeagueName(e.target.value)} placeholder="e.g. Riverbend League" style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: font, fontSize: 13, outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 6 }}>YOUR TEAM NAME</div>
                      <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. BullRun Bros" style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: font, fontSize: 13, outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div onClick={() => !leagueLoading && createLeague()} style={{ flex: 1, padding: '10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center', background: '#0d1f15', border: '1px solid #00ff8840', borderRadius: 4, color: '#00ff88', cursor: 'pointer' }}>{leagueLoading ? 'CREATING...' : 'CREATE LEAGUE'}</div>
                      <div onClick={() => setShowCreate(false)} style={{ padding: '10px 16px', fontSize: 10, letterSpacing: '0.1em', border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', cursor: 'pointer' }}>CANCEL</div>
                    </div>
                  </div>
                </div>
              )}
              {showJoin && (
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={cardTitleStyle}>Join a League</span></div>
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 6 }}>INVITE CODE</div>
                      <input value={inviteInput} onChange={e => { const v = e.target.value.toUpperCase(); setInviteInput(v); setFoundLeague(null); if (v.length === 6) lookupCode(v) }} placeholder="e.g. 4N1MVE" maxLength={6} style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: font, fontSize: 13, outline: 'none', letterSpacing: '0.2em', fontWeight: 700 }} />
                    </div>
                    {foundLeague && (
                      <div style={{ padding: 12, background: '#081a10', border: '1px solid #00ff8840', borderRadius: 6 }}>
                        <div style={{ fontSize: 9, color: '#00ff88', letterSpacing: '0.1em', marginBottom: 4 }}>LEAGUE FOUND</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{foundLeague.name}</div>
                      </div>
                    )}
                    {foundLeague && (
                      <div>
                        <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 6 }}>YOUR TEAM NAME</div>
                        <input value={joinTeamName} onChange={e => setJoinTeamName(e.target.value)} placeholder="e.g. Paper Hands" style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: font, fontSize: 13, outline: 'none' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div onClick={() => !leagueLoading && foundLeague && joinLeague()} style={{ flex: 1, padding: '10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center', background: '#0a1525', border: '1px solid #00bfff40', borderRadius: 4, color: foundLeague ? '#00bfff' : '#2a3555', cursor: foundLeague ? 'pointer' : 'default' }}>{leagueLoading ? 'JOINING...' : 'JOIN LEAGUE'}</div>
                      <div onClick={() => { setShowJoin(false); setFoundLeague(null); setInviteInput('') }} style={{ padding: '10px 16px', fontSize: 10, letterSpacing: '0.1em', border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', cursor: 'pointer' }}>CANCEL</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}