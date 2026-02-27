'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '../lib/supabase'

const font = "'JetBrains Mono', 'Fira Code', monospace"
const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7', Tech: '#00bfff',
}

export default function DraftRoom() {
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [sortBy, setSortBy] = useState('ticker')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'ok'|'err'>('ok')
  const [leagueId, setLeagueId] = useState('')
  const [myId, setMyId] = useState('')
  const [myTeamName, setMyTeamName] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)
      setMyId(session.user.id)

      const { data: membership } = await supabase
        .from('league_members').select('*, leagues(*)')
        .eq('user_id', session.user.id).limit(1).single()
      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)
      setLeagueId(membership.league_id)
      setMyTeamName(membership.team_name)

      const { data: allMembers } = await supabase
        .from('league_members').select('*').eq('league_id', membership.league_id)
      setMembers(allMembers ?? [])

      const { data: allStocks } = await supabase.from('stocks').select('*').order('ticker')
      setStocks(allStocks ?? [])

      const { data: existingPicks } = await supabase
        .from('draft_picks').select('*, stocks(*), league_members(team_name)')
        .eq('league_id', membership.league_id).order('pick_number')
      setPicks(existingPicks ?? [])

      if (allStocks && allStocks.length > 0) {
        const tickers = allStocks.map((s: any) => s.ticker).join(',')
        try {
          const res = await fetch(`/api/prices?tickers=${tickers}`)
          const priceData = await res.json()
          setPrices(priceData)
        } catch {}
      }
    }
    load()
  }, [])

  const draftStock = async (stock: any) => {
    if (!session || !league || loading) return
    setLoading(true); setMessage('')
    const supabase = createClient()
    const pickNumber = picks.length + 1
    const round = Math.ceil(pickNumber / Math.max(members.length, 1))

    const { error: pickErr } = await supabase.from('draft_picks').insert({
      league_id: leagueId, user_id: session.user.id,
      stock_id: stock.id, pick_number: pickNumber, round,
    })
    if (pickErr) {
      setMessage(pickErr.message.includes('unique') ? `${stock.ticker} already drafted.` : pickErr.message)
      setMessageType('err'); setLoading(false); return
    }
    await supabase.from('roster_slots').insert({ league_id: leagueId, user_id: session.user.id, stock_id: stock.id })
    const { data: updatedPicks } = await supabase
      .from('draft_picks').select('*, stocks(*), league_members(team_name)')
      .eq('league_id', leagueId).order('pick_number')
    setPicks(updatedPicks ?? [])
    setMessage(`✓ Drafted ${stock.ticker}!`)
    setMessageType('ok')
    setTimeout(() => setMessage(''), 3000)
    if (logRef.current) logRef.current.scrollTop = 0
    setLoading(false)
  }

  const draftedIds = new Set(picks.map((p: any) => p.stock_id))
  const myPicks = picks.filter((p: any) => p.user_id === myId)

  const sectors = ['All', ...Array.from(new Set(stocks.map((s: any) => s.sector))).sort()]
  const available = stocks
    .filter((s: any) => !draftedIds.has(s.id))
    .filter((s: any) => sector === 'All' || s.sector === sector)
    .filter((s: any) => !search || s.ticker.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => sortBy === 'ticker' ? a.ticker.localeCompare(b.ticker) : (b.name ?? '').localeCompare(a.name ?? ''))

  // Build rounds for draft board (snake)
  const numTeams = Math.max(members.length, 1)
  const rounds = picks.length > 0 ? Math.ceil(picks.length / numTeams) + 1 : 3
  const snakeOrder: any[] = []
  for (let r = 0; r < Math.max(rounds, 3); r++) {
    const row = r % 2 === 0 ? [...members] : [...members].reverse()
    row.forEach(m => snakeOrder.push({ member: m, round: r + 1 }))
  }

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: #080b14; }
        ::-webkit-scrollbar-thumb { background: #1a2040; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes pickFlash { 0%{background:#00ff8825} 100%{background:transparent} }
        .stock-row:hover { background: #0f1830 !important; }
        .draft-btn:hover { background: #0d2a1a !important; border-color: #00ff8880 !important; color: #00ff88 !important; }
        input::placeholder { color: #2a3555; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: 'linear-gradient(90deg, #0d1225, #0a0f1e)', borderBottom: '1px solid #1a2040', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #00ff88, #00bfff)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#000' }}>$</div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', color: '#fff' }}>STOCKDRAFT</span>
          </a>
          <span style={{ color: '#1a2040' }}>|</span>
          <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.1em' }}>{league?.name ?? '—'} · DRAFT ROOM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 11 }}>
          <span style={{ color: '#4a5568' }}>PICK {picks.length + 1}</span>
          <span style={{ color: '#2a3555' }}>·</span>
          <span style={{ color: '#4a5568' }}>{available.length} AVAILABLE</span>
          <span style={{ color: '#2a3555' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#00ff88' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', animation: 'pulse 1.5s infinite' }} />
            LIVE
          </div>
          <a href="/dashboard" style={{ padding: '4px 10px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', textDecoration: 'none', letterSpacing: '0.08em' }}>← DASHBOARD</a>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left panel: draft board + log */}
        <div style={{ width: 280, background: '#0a0d1a', borderRight: '1px solid #14182e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Draft board */}
          <div style={{ padding: '14px 14px 0' }}>
            <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>DRAFT BOARD</div>
            <div style={{ overflowX: 'auto' }}>
              {/* Header row */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 3, paddingLeft: 24 }}>
                {members.map((m: any) => (
                  <div key={m.id} title={m.team_name} style={{ flex: 1, minWidth: 28, textAlign: 'center', fontSize: 8, color: m.user_id === myId ? '#00ff88' : '#2a3555', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.team_name?.substring(0, 3).toUpperCase()}
                  </div>
                ))}
              </div>
              {/* Rounds */}
              {Array.from({ length: Math.max(Math.ceil(picks.length / numTeams) + 2, 4) }, (_, r) => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                  <div style={{ width: 20, fontSize: 8, color: '#1a2535', flexShrink: 0 }}>R{r + 1}</div>
                  {(r % 2 === 0 ? members : [...members].reverse()).map((m: any, col: number) => {
                    const pickIdx = r * numTeams + col
                    const pick = picks[pickIdx]
                    const isMe = m.user_id === myId
                    return (
                      <div key={m.id} style={{ flex: 1, minWidth: 28, height: 28, borderRadius: 3, background: pick ? (isMe ? '#0d2015' : '#0d1225') : '#0a0d1a', border: `1px solid ${pick ? (isMe ? '#00ff8830' : '#1a2040') : '#0f1225'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: pick ? 'pickFlash 1.2s ease' : 'none' }}>
                        {pick ? (
                          <span style={{ fontSize: 7, fontWeight: 700, color: isMe ? '#00ff88' : '#4a6080', letterSpacing: '0.04em' }}>{pick.stocks?.ticker}</span>
                        ) : (
                          <span style={{ fontSize: 7, color: '#1a2035' }}>—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ margin: '14px 14px 0', borderTop: '1px solid #14182e' }} />

          {/* Pick log */}
          <div style={{ padding: '10px 14px 4px' }}>
            <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>PICK LOG</div>
          </div>
          <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
            {picks.length === 0 ? (
              <div style={{ fontSize: 11, color: '#1a2535', textAlign: 'center', padding: '20px 0' }}>No picks yet</div>
            ) : [...picks].reverse().map((pick: any, i: number) => {
              const isMe = pick.user_id === myId
              return (
                <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #0a0d1a', animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ fontSize: 9, color: '#1a2535', width: 20, flexShrink: 0 }}>#{picks.length - i}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: SECTOR_COLORS[pick.stocks?.sector] ?? '#4a5568', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? '#00ff88' : '#a0b4d0' }}>{pick.stocks?.ticker}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#2a3555', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.league_members?.team_name}</div>
                  </div>
                  {isMe && <div style={{ fontSize: 8, padding: '2px 5px', background: '#0d1f15', border: '1px solid #00ff8830', borderRadius: 2, color: '#00ff88' }}>YOU</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Center: available stocks */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Controls */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #14182e', background: '#0a0d1a', flexShrink: 0 }}>
            {message && (
              <div style={{ marginBottom: 10, padding: '7px 12px', background: messageType === 'ok' ? '#081a10' : '#1a0810', border: `1px solid ${messageType === 'ok' ? '#00ff8840' : '#ff446640'}`, borderRadius: 5, fontSize: 11, color: messageType === 'ok' ? '#00ff88' : '#ff4466', animation: 'fadeIn 0.3s ease' }}>{message}</div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tickers or names..."
                style={{ flex: 1, padding: '8px 12px', background: '#070a12', border: '1px solid #1a2040', borderRadius: 5, color: '#c8d0e0', fontFamily: font, fontSize: 12, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#4a5568' }}>
                <span style={{ letterSpacing: '0.08em' }}>SORT:</span>
                {['ticker', 'name'].map(s => (
                  <div key={s} onClick={() => setSortBy(s)} style={{ padding: '5px 10px', borderRadius: 3, background: sortBy === s ? '#1a2040' : 'transparent', border: `1px solid ${sortBy === s ? '#2a3555' : 'transparent'}`, color: sortBy === s ? '#c8d0e0' : '#4a5568', cursor: 'pointer', letterSpacing: '0.08em' }}>{s.toUpperCase()}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {sectors.map(s => (
                <div key={s} onClick={() => setSector(s)} style={{ padding: '4px 10px', fontSize: 10, borderRadius: 3, background: sector === s ? '#1a3050' : '#0d1225', border: `1px solid ${sector === s ? '#00bfff40' : '#1a2040'}`, color: sector === s ? '#00bfff' : '#4a5568', cursor: 'pointer', letterSpacing: '0.07em' }}>{s}</div>
              ))}
            </div>
          </div>

          {/* Stock list header */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px 70px 100px', padding: '8px 20px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530', background: '#09091a', flexShrink: 0 }}>
            <span>TICKER</span><span>NAME</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>SECTOR</span><span style={{ textAlign: 'right' }}>ACTION</span>
          </div>

          {/* Stock rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {available.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>
                {stocks.length === 0 ? 'Loading stocks...' : 'No stocks match your filter'}
              </div>
            ) : available.map((stock: any) => {
              const price = prices[stock.ticker]
              const isPos = price?.changePct >= 0
              const alreadyMine = picks.some((p: any) => p.stock_id === stock.id && p.user_id === myId)
              return (
                <div key={stock.id} className="stock-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px 70px 100px', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #0a0d18', transition: 'background 0.1s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: SECTOR_COLORS[stock.sector] ?? '#4a5568', boxShadow: `0 0 5px ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#a0b4d0', letterSpacing: '0.06em' }}>{stock.ticker}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#c8d0e0' }}>{stock.name}</div>
                    <div style={{ fontSize: 9, color: '#2a3555', marginTop: 1 }}>{stock.exchange ?? ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>
                    {price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(2)}%` : '—'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 2, background: `${SECTOR_COLORS[stock.sector] ?? '#4a5568'}20`, color: SECTOR_COLORS[stock.sector] ?? '#4a5568', border: `1px solid ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}30` }}>{stock.sector?.substring(0, 6)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {alreadyMine ? (
                      <span style={{ fontSize: 9, color: '#00ff88', letterSpacing: '0.08em' }}>✓ ON ROSTER</span>
                    ) : (
                      <div className="draft-btn" onClick={() => draftStock(stock)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', fontSize: 10, background: '#0d1f15', border: '1px solid #00ff8840', borderRadius: 4, color: '#4a8060', cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.08em', transition: 'all 0.15s', fontFamily: font, fontWeight: 700 }}>
                        {loading ? '...' : '+ DRAFT'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel: my roster */}
        <div style={{ width: 220, background: '#0a0d1a', borderLeft: '1px solid #14182e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #0f1530' }}>
            <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR ROSTER</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#c8d0e0' }}>{myTeamName || '—'}</div>
            <div style={{ fontSize: 10, color: '#4a5568', marginTop: 2 }}>{myPicks.length} stocks drafted</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {myPicks.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 11, color: '#1a2535' }}>Draft your first stock →</div>
            ) : myPicks.map((pick: any, i: number) => {
              const price = prices[pick.stocks?.ticker]
              const isPos = price?.changePct >= 0
              return (
                <div key={pick.id} style={{ padding: '9px 14px', borderBottom: '1px solid #0a0d18' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: SECTOR_COLORS[pick.stocks?.sector] ?? '#4a5568', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#00ff88' }}>{pick.stocks?.ticker}</span>
                    <span style={{ fontSize: 8, color: '#1a2535', marginLeft: 'auto' }}>#{i + 1}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#4a5a70', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick.stocks?.name}</div>
                  <div style={{ fontSize: 10, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>
                    {price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(2)}%` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '12px 14px', borderTop: '1px solid #14182e' }}>
            <a href="/dashboard" style={{ display: 'block', padding: '9px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center', background: myPicks.length > 0 ? '#0d1f15' : '#0a0d1a', border: `1px solid ${myPicks.length > 0 ? '#00ff8840' : '#1a2040'}`, borderRadius: 5, color: myPicks.length > 0 ? '#00ff88' : '#2a3555', textDecoration: 'none' }}>
              {myPicks.length > 0 ? '→ GO TO DASHBOARD' : 'DRAFT STOCKS FIRST'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}