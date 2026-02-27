'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

export default function Dashboard() {
  const [email, setEmail] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [joinTeamName, setJoinTeamName] = useState('')
  const [foundLeague, setFoundLeague] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [leagues, setLeagues] = useState<any[]>([])
  const [roster, setRoster] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState('matchup')
  const [matchup, setMatchup] = useState<any>(null)
  const [myScores, setMyScores] = useState<any[]>([])
  const [standings, setStandings] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setEmail(session.user.email ?? '')

      const { data: leaguesData } = await supabase.from('leagues').select('*')
      setLeagues(leaguesData ?? [])

      const { data: membership } = await supabase
        .from('league_members').select('*, leagues(*)')
        .eq('user_id', session.user.id).limit(1).single()

      if (membership) {
        const { data: slots } = await supabase
          .from('roster_slots').select('*, stocks(*)')
          .eq('league_id', membership.league_id)
          .eq('user_id', session.user.id)
        setRoster(slots ?? [])

        if (slots && slots.length > 0) {
          const tickers = slots.map((s: any) => s.stocks.ticker).join(',')
          const res = await fetch(`/api/prices?tickers=${tickers}`)
          const priceData = await res.json()
          setPrices(priceData)
        }

        const { data: matchupData } = await supabase
          .from('matchups').select('*')
          .eq('league_id', membership.league_id).eq('week', 1)
          .or(`team_a_id.eq.${session.user.id},team_b_id.eq.${session.user.id}`)
          .single()
        setMatchup(matchupData)

        const { data: scores } = await supabase
          .from('weekly_scores').select('*, stocks(*)')
          .eq('league_id', membership.league_id).eq('week', 1)
          .eq('user_id', session.user.id)
        setMyScores(scores ?? [])

        const { data: members } = await supabase
          .from('league_members').select('*')
          .eq('league_id', membership.league_id)

        const { data: allScores } = await supabase
          .from('weekly_scores').select('*')
          .eq('league_id', membership.league_id).eq('week', 1)

        const standingsData = (members ?? []).map((m: any) => {
          const pts = (allScores ?? []).filter((s: any) => s.user_id === m.user_id).reduce((sum: number, s: any) => sum + s.pts, 0)
          return { ...m, totalPts: Math.round(pts * 10) / 10, isMe: m.user_id === session.user.id }
        }).sort((a: any, b: any) => b.totalPts - a.totalPts)
        setStandings(standingsData)
      }
    }
    load()
  }, [])

  const createLeague = async () => {
    if (!leagueName || !teamName) { setMessage('Enter a league name and team name.'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: league, error } = await supabase.from('leagues')
      .insert({ name: leagueName, commissioner_id: session.user.id, invite_code: inviteCode })
      .select().single()
    if (error) { setMessage(error.message); setLoading(false); return }
    await supabase.from('league_members').insert({ league_id: league.id, user_id: session.user.id, team_name: teamName })
    setLeagues(prev => [...prev, league])
    setShowCreate(false); setLeagueName(''); setTeamName('')
    setMessage(`League created! Invite code: ${inviteCode}`)
    setLoading(false)
  }

  const lookupCode = async (code: string) => {
    if (code.length < 6) return
    const supabase = createClient()
    const { data } = await supabase.from('leagues').select('*').eq('invite_code', code).single()
    setFoundLeague(data ?? null)
  }

  const joinLeague = async () => {
    if (!foundLeague || !joinTeamName) return
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('league_members')
      .insert({ league_id: foundLeague.id, user_id: session.user.id, team_name: joinTeamName })
    if (error) { setMessage(error.message.includes('unique') ? 'Already in this league.' : error.message); setLoading(false); return }
    setLeagues(prev => [...prev, foundLeague])
    setShowJoin(false); setInviteInput(''); setJoinTeamName(''); setFoundLeague(null)
    setMessage(`Joined ${foundLeague.name}!`)
    setLoading(false)
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const totalPts = myScores.reduce((sum, s) => sum + s.pts, 0)
  const font = "'JetBrains Mono', 'Fira Code', monospace"

  const tabStyle = (tab: string) => ({
    padding: '8px 16px', fontSize: 11, cursor: 'pointer',
    letterSpacing: '0.08em', fontFamily: font,
    borderBottom: activeTab === tab ? '2px solid #00ff88' : '2px solid transparent',
    color: activeTab === tab ? '#00ff88' : '#4a5568',
    background: 'none', border: 'none',
    borderBottom: activeTab === tab ? '2px solid #00ff88' : '2px solid transparent',
  } as any)

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh' }}>

      {message && (
        <div style={{ background: '#0d1f15', border: '1px solid #00ff8840', color: '#00ff88', padding: '10px 24px', fontSize: 12 }}>
          {message}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #1a2040', marginBottom: 24 }}>
          {[['matchup', 'MATCHUP'], ['roster', 'MY ROSTER'], ['standings', 'STANDINGS'], ['leagues', 'LEAGUES']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>{label}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#4a5568', alignSelf: 'center', fontFamily: font }}>{email}</span>
          <button onClick={signOut} style={{ fontSize: 10, color: '#4a5568', background: 'none', border: '1px solid #1a2040', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontFamily: font, letterSpacing: '0.08em' }}>SIGN OUT</button>
        </div>

        {/* MATCHUP TAB */}
        {activeTab === 'matchup' && (
          <div>
            {/* Score hero */}
            <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.1em' }}>WEEK 1 MATCHUP</div>
                <div style={{ fontSize: 10, color: '#4a5568' }}>{leagues[0]?.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 8, letterSpacing: '0.08em' }}>YOUR TEAM</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: totalPts >= 0 ? '#00ff88' : '#ff4466' }}>
                    {totalPts >= 0 ? '+' : ''}{totalPts.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>pts</div>
                </div>
                <div style={{ fontSize: 20, color: '#2a3555' }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 8, letterSpacing: '0.08em' }}>OPPONENT</div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#c8d0e0' }}>0.0</div>
                  <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>pts</div>
                </div>
              </div>
            </div>

            {/* Roster stocks */}
            <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #0f1530', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>YOUR LINEUP</span>
                <span style={{ fontSize: 10, color: '#4a5568' }}>{roster.length} STOCKS</span>
              </div>
              {roster.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: '#2a3555' }}>
                  No stocks drafted yet — <a href="/draft" style={{ color: '#00ff88', textDecoration: 'none' }}>go to draft room</a>
                </div>
              ) : roster.map(slot => {
                const price = prices[slot.stocks.ticker]
                const score = myScores.find(s => s.stock_id === slot.stock_id)
                const isPos = price?.changePct >= 0
                return (
                  <div key={slot.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #0f1530', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: `${SECTOR_COLORS[slot.stocks.sector]}20`, color: SECTOR_COLORS[slot.stocks.sector], flexShrink: 0 }}>
                      {slot.stocks.ticker.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{slot.stocks.ticker} <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 400 }}>{slot.stocks.name}</span></div>
                      <div style={{ fontSize: 10, color: SECTOR_COLORS[slot.stocks.sector] }}>{slot.stocks.sector}</div>
                    </div>
                    {price && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>${price.close.toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: isPos ? '#00ff88' : '#ff4466' }}>{isPos ? '▲' : '▼'} {Math.abs(price.changePct).toFixed(2)}%</div>
                      </div>
                    )}
                    <div style={{ width: 60, textAlign: 'right' }}>
                      {score ? (
                        <div style={{ fontSize: 18, fontWeight: 800, color: score.pts >= 0 ? '#00ff88' : '#ff4466' }}>
                          {score.pts >= 0 ? '+' : ''}{score.pts.toFixed(1)}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#2a3555' }}>—</div>
                      )}
                      <div style={{ fontSize: 9, color: '#2a3555' }}>pts</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: '16px 20px', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.1em', marginBottom: 4 }}>THIS WEEK'S SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: totalPts >= 0 ? '#00ff88' : '#ff4466' }}>
                {totalPts >= 0 ? '+' : ''}{totalPts.toFixed(1)} <span style={{ fontSize: 12, color: '#4a5568' }}>pts</span>
              </div>
            </div>
            {roster.map(slot => {
              const price = prices[slot.stocks.ticker]
              const score = myScores.find(s => s.stock_id === slot.stock_id)
              const isPos = price?.changePct >= 0
              return (
                <div key={slot.id} style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: `${SECTOR_COLORS[slot.stocks.sector]}20`, color: SECTOR_COLORS[slot.stocks.sector], flexShrink: 0 }}>
                    {slot.stocks.ticker.slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{slot.stocks.ticker}</div>
                    <div style={{ fontSize: 10, color: '#4a5568' }}>{slot.stocks.name}</div>
                  </div>
                  {price && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>${price.close.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: isPos ? '#00ff88' : '#ff4466' }}>{isPos ? '▲' : '▼'}{Math.abs(price.changePct).toFixed(2)}%</div>
                    </div>
                  )}
                  <div style={{ width: 60, textAlign: 'right' }}>
                    {score ? <div style={{ fontSize: 18, fontWeight: 800, color: score.pts >= 0 ? '#00ff88' : '#ff4466' }}>{score.pts >= 0 ? '+' : ''}{score.pts.toFixed(1)}</div> : <div style={{ color: '#2a3555' }}>—</div>}
                    <div style={{ fontSize: 9, color: '#2a3555' }}>pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* STANDINGS TAB */}
        {activeTab === 'standings' && (
          <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #0f1530', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>{leagues[0]?.name?.toUpperCase()} — WEEK 1</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 60px 60px 80px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
              <span>#</span><span>TEAM</span><span style={{ textAlign: 'center' }}>W</span><span style={{ textAlign: 'center' }}>L</span><span style={{ textAlign: 'right' }}>PTS</span>
            </div>
            {standings.map((team, i) => (
              <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 60px 60px 80px', padding: '12px 16px', borderBottom: '1px solid #0f1530', alignItems: 'center', background: team.isMe ? 'rgba(0,255,136,0.03)' : 'transparent' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: i < 3 ? '#00ff88' : '#2a3555' }}>{i + 1}</div>
                <div style={{ fontSize: 12, color: team.isMe ? '#fff' : '#c8d0e0', fontWeight: team.isMe ? 700 : 400 }}>
                  {team.team_name} {team.isMe && <span style={{ fontSize: 9, color: '#00ff88', marginLeft: 6 }}>YOU</span>}
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#00ff88' }}>{team.wins ?? 0}</div>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#ff4466' }}>{team.losses ?? 0}</div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: team.totalPts >= 0 ? '#00ff88' : '#ff4466' }}>
                  {team.totalPts >= 0 ? '+' : ''}{team.totalPts}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LEAGUES TAB */}
        {activeTab === 'leagues' && (
          <div>
            {leagues.map(league => (
              <div key={league.id} style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: '16px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{league.name}</div>
                  <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>Invite: <span style={{ color: '#00ff88', fontWeight: 700 }}>{league.invite_code}</span></div>
                </div>
                <div style={{ fontSize: 10, color: '#4a5568', border: '1px solid #1a2040', borderRadius: 4, padding: '4px 10px' }}>{league.status?.toUpperCase()}</div>
              </div>
            ))}

            {!showCreate && !showJoin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div onClick={() => setShowCreate(true)} style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: 20, cursor: 'pointer' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🏗️</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Create a League</div>
                  <div style={{ fontSize: 11, color: '#4a5568' }}>Set up your own league and invite friends</div>
                </div>
                <div onClick={() => setShowJoin(true)} style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: 20, cursor: 'pointer' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔑</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Join a League</div>
                  <div style={{ fontSize: 11, color: '#4a5568' }}>Have an invite code? Enter it here</div>
                </div>
              </div>
            )}

            {showCreate && (
              <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: 20, marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Create a New League</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.1em', marginBottom: 6 }}>LEAGUE NAME</div>
                  <input value={leagueName} onChange={e => setLeagueName(e.target.value)} placeholder="e.g. Riverbend League" style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: font, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.1em', marginBottom: 6 }}>YOUR TEAM NAME</div>
                  <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. BullRun Bros" style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: font, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={createLeague} disabled={loading} style={{ flex: 1, background: '#0d1f15', border: '1px solid #00ff8840', borderRadius: 4, padding: '10px', color: '#00ff88', fontFamily: font, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>
                    {loading ? 'CREATING...' : 'CREATE LEAGUE'}
                  </button>
                  <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 16px', color: '#4a5568', fontFamily: font, fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
                </div>
              </div>
            )}

            {showJoin && (
              <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: 20, marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Join a League</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.1em', marginBottom: 6 }}>INVITE CODE</div>
                  <input value={inviteInput} onChange={e => { const val = e.target.value.toUpperCase(); setInviteInput(val); setFoundLeague(null); if (val.length === 6) lookupCode(val) }} placeholder="e.g. 4N1MVE" maxLength={6} style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#00ff88', fontFamily: font, fontSize: 14, letterSpacing: '0.2em', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {foundLeague && (
                  <div style={{ background: '#0d1f15', border: '1px solid #00ff8830', borderRadius: 4, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#00ff88', marginBottom: 4 }}>LEAGUE FOUND</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{foundLeague.name}</div>
                  </div>
                )}
                {foundLeague && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.1em', marginBottom: 6 }}>YOUR TEAM NAME</div>
                    <input value={joinTeamName} onChange={e => setJoinTeamName(e.target.value)} placeholder="e.g. Paper Hands" style={{ width: '100%', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 12px', color: '#fff', fontFamily: font, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={joinLeague} disabled={loading || !foundLeague} style={{ flex: 1, background: '#0a1525', border: '1px solid #00bfff40', borderRadius: 4, padding: '10px', color: '#00bfff', fontFamily: font, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', opacity: foundLeague ? 1 : 0.4 }}>
                    {loading ? 'JOINING...' : 'JOIN LEAGUE'}
                  </button>
                  <button onClick={() => { setShowJoin(false); setFoundLeague(null); setInviteInput('') }} style={{ background: 'none', border: '1px solid #1a2040', borderRadius: 4, padding: '10px 16px', color: '#4a5568', fontFamily: font, fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
