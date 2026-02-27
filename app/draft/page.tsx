'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

const font = "'JetBrains Mono', 'Fira Code', monospace"

export default function DraftRoom() {
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [leagueId, setLeagueId] = useState('')

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
      setLeagueId(membership.league_id)

      const { data: allMembers } = await supabase
        .from('league_members').select('*').eq('league_id', membership.league_id)
      setMembers(allMembers ?? [])

      const { data: allStocks } = await supabase
        .from('stocks').select('*').order('ticker')
      setStocks(allStocks ?? [])

      const { data: existingPicks } = await supabase
        .from('draft_picks').select('*, stocks(*)')
        .eq('league_id', membership.league_id).order('pick_number')
      setPicks(existingPicks ?? [])

      if (allStocks && allStocks.length > 0) {
        const tickers = allStocks.slice(0, 10).map((s: any) => s.ticker).join(',')
        const res = await fetch(`/api/prices?tickers=${tickers}`)
        const priceData = await res.json()
        setPrices(priceData)
      }
    }
    load()
  }, [])

  const draftStock = async (stock: any) => {
    if (!session || !league) return
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const pickNumber = picks.length + 1
    const round = Math.ceil(pickNumber / Math.max(members.length, 1))

    const { error } = await supabase.from('draft_picks').insert({
      league_id: leagueId, user_id: session.user.id,
      stock_id: stock.id, pick_number: pickNumber, round,
    })
    if (error) { setMessage(error.message.includes('unique') ? `${stock.ticker} already drafted.` : error.message); setLoading(false); return }
    await supabase.from('roster_slots').insert({ league_id: leagueId, user_id: session.user.id, stock_id: stock.id })

    const { data: updatedPicks } = await supabase
      .from('draft_picks').select('*, stocks(*)')
      .eq('league_id', leagueId).order('pick_number')
    setPicks(updatedPicks ?? [])
    setMessage(`✓ Drafted ${stock.ticker}!`)
    setLoading(false)
  }

  const draftedIds = new Set(picks.map(p => p.stock_id))
  const myPicks = picks.filter(p => p.user_id === session?.user.id)
  const sectors = ['All', ...Array.from(new Set(stocks.map((s: any) => s.sector))).sort()]
  const filtered = stocks.filter((s: any) => {
    const matchSearch = s.ticker.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase())
    const matchSector = sector === 'All' || s.sector === sector
    return matchSearch && matchSector
  })

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap');`}</style>

      {/* Status bar */}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>DRAFT ROOM</span>
          <span style={{ fontSize: 11, color: '#00ff88' }}>{league?.name}</span>
          <span style={{ fontSize: 11, color: '#4a5568' }}>{picks.length} picks · {stocks.length - draftedIds.size} remaining</span>
        </div>
        {message && <span style={{ fontSize: 11, color: '#00ff88' }}>{message}</span>}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Main: stock list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10, overflow: 'hidden' }}>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d1225', border: '1px solid #1a2040', borderRadius: 4, padding: '6px 10px' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stocks..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#c8d0e0', fontSize: 11, fontFamily: font, width: 160 }} />
            </div>
            {sectors.map(s => (
              <button key={s} onClick={() => setSector(s)} style={{ padding: '4px 10px', fontSize: 9, borderRadius: 3, border: `1px solid ${sector === s ? '#00bfff40' : '#1a2040'}`, background: sector === s ? '#0a1a2a' : '#0d1225', color: sector === s ? '#00bfff' : '#4a5568', cursor: 'pointer', fontFamily: font, letterSpacing: '0.08em' }}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Stock table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 90px', padding: '6px 12px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #1a2040' }}>
            <span>STOCK</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>SECTOR</span><span style={{ textAlign: 'right' }}>ACTION</span>
          </div>

          {/* Stock rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map((stock: any) => {
              const isDrafted = draftedIds.has(stock.id)
              const myPick = picks.find(p => p.stock_id === stock.id && p.user_id === session?.user.id)
              const price = prices[stock.ticker]
              const isPos = price?.changePct >= 0

              return (
                <div key={stock.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 90px', alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid #0f1530', opacity: isDrafted ? 0.35 : 1, background: 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: SECTOR_COLORS[stock.sector] ?? '#4a5568', boxShadow: `0 0 6px ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isDrafted ? '#4a5568' : '#fff' }}>{stock.ticker}</span>
                      <span style={{ fontSize: 10, color: '#4a5568', marginLeft: 8 }}>{stock.name}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#c8d0e0' }}>
                    {price ? `$${price.close.toFixed(2)}` : '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>
                    {price ? `${isPos ? '+' : ''}${price.changePct.toFixed(2)}%` : '—'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 9, color: SECTOR_COLORS[stock.sector] ?? '#4a5568' }}>{stock.sector}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isDrafted ? (
                      <span style={{ fontSize: 9, color: myPick ? '#00ff88' : '#2a3555', letterSpacing: '0.08em' }}>{myPick ? 'YOUR PICK' : 'DRAFTED'}</span>
                    ) : (
                      <button onClick={() => draftStock(stock)} disabled={loading} style={{ padding: '5px 10px', fontSize: 10, fontFamily: font, fontWeight: 700, letterSpacing: '0.1em', borderRadius: 3, border: '1px solid #00ff8860', background: '#091a10', color: '#00ff8890', cursor: 'pointer' }}>
                        DRAFT
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel: my roster + pick log */}
        <div style={{ width: 240, flexShrink: 0, background: '#0a0d1a', borderLeft: '1px solid #14182e', display: 'flex', flexDirection: 'column', padding: 12, overflowY: 'auto', gap: 12 }}>

          {/* My roster */}
          <div>
            <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 8 }}>MY ROSTER · {myPicks.length} PICKS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {myPicks.map(pick => (
                <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 4, border: `1px solid ${SECTOR_COLORS[pick.stocks.sector] ?? '#1a2040'}30`, background: '#0d1225' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: SECTOR_COLORS[pick.stocks.sector] ?? '#4a5568', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{pick.stocks.ticker}</div>
                    <div style={{ fontSize: 9, color: '#4a5568' }}>Rd {pick.round} · #{pick.pick_number}</div>
                  </div>
                </div>
              ))}
              {myPicks.length === 0 && (
                <div style={{ fontSize: 11, color: '#2a3555', textAlign: 'center', padding: 16 }}>No picks yet</div>
              )}
            </div>
          </div>

          {/* Pick log */}
          <div>
            <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 8 }}>PICK LOG</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {picks.length === 0 ? (
                <div style={{ fontSize: 11, color: '#2a3555', textAlign: 'center', padding: 16 }}>Draft hasn't started</div>
              ) : [...picks].reverse().slice(0, 15).map(pick => (
                <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 3, borderBottom: '1px solid #0f1530' }}>
                  <span style={{ fontSize: 9, color: '#2a3555', width: 20 }}>#{pick.pick_number}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pick.user_id === session?.user.id ? '#00ff88' : '#c8d0e0' }}>{pick.stocks.ticker}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
