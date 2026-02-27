'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

const font = "'JetBrains Mono', 'Fira Code', monospace"

export default function Waivers() {
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [myRoster, setMyRoster] = useState<any[]>([])
  const [freeAgents, setFreeAgents] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [dropping, setDropping] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [leagueId, setLeagueId] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)
      setUserId(session.user.id)

      const { data: membership } = await supabase
        .from('league_members').select('*, leagues(*)')
        .eq('user_id', session.user.id).limit(1).single()
      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)
      setLeagueId(membership.league_id)

      const { data: roster } = await supabase
        .from('roster_slots').select('*, stocks(*)')
        .eq('league_id', membership.league_id).eq('user_id', session.user.id)
      setMyRoster(roster ?? [])

      const { data: allSlots } = await supabase
        .from('roster_slots').select('stock_id').eq('league_id', membership.league_id)
      const draftedIds = new Set((allSlots ?? []).map((s: any) => s.stock_id))

      const { data: allStocks } = await supabase.from('stocks').select('*').order('ticker')
      const free = (allStocks ?? []).filter((s: any) => !draftedIds.has(s.id))
      setFreeAgents(free)

      const allTickers = (allStocks ?? []).map((s: any) => s.ticker).join(',')
      const res = await fetch(`/api/prices?tickers=${allTickers}`)
      const priceData = await res.json()
      setPrices(priceData)
    }
    load()
  }, [])

  const dropStock = async (slot: any) => {
    setLoading(true); setMessage('')
    const supabase = createClient()
    const { error } = await supabase.from('roster_slots').delete().eq('id', slot.id)
    if (error) { setMessage(error.message); setLoading(false); return }
    setMyRoster(prev => prev.filter(s => s.id !== slot.id))
    setFreeAgents(prev => [...prev, slot.stocks].sort((a: any, b: any) => a.ticker.localeCompare(b.ticker)))
    setDropping(null)
    setMessage(`Dropped ${slot.stocks.ticker}`)
    setLoading(false)
  }

  const addStock = async (stock: any) => {
    setLoading(true); setMessage('')
    const supabase = createClient()
    const { error } = await supabase.from('roster_slots').insert({ league_id: leagueId, user_id: userId, stock_id: stock.id })
    if (error) { setMessage(error.message); setLoading(false); return }
    const { data: newSlot } = await supabase.from('roster_slots').select('*, stocks(*)').eq('league_id', leagueId).eq('user_id', userId).eq('stock_id', stock.id).single()
    setMyRoster(prev => [...prev, newSlot])
    setFreeAgents(prev => prev.filter((s: any) => s.id !== stock.id))
    setAdding(null)
    setMessage(`Added ${stock.ticker}`)
    setLoading(false)
  }

  const filteredFreeAgents = freeAgents.filter((s: any) =>
    s.ticker.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap');`}</style>

      {/* Status bar */}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>WAIVER WIRE</span>
          <span style={{ fontSize: 11, color: '#00ff88' }}>{league?.name}</span>
        </div>
        {message && <span style={{ fontSize: 11, color: message.includes('Drop') || message.includes('error') ? '#ff4466' : '#00ff88' }}>{message}</span>}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* My Roster */}
        <div>
          <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 12 }}>MY ROSTER · {myRoster.length} STOCKS</div>
          <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
              <span>STOCK</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>ACTION</span>
            </div>
            {myRoster.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No stocks on roster</div>
            ) : myRoster.map(slot => {
              const price = prices[slot.stocks.ticker]
              const isPos = price?.changePct >= 0
              const isDroppingThis = dropping === slot.id
              return (
                <div key={slot.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0f1530' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568', boxShadow: `0 0 6px ${SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{slot.stocks.ticker}</div>
                        <div style={{ fontSize: 9, color: '#4a5568' }}>{slot.stocks.name}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>
                      {price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(2)}%` : '—'}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button onClick={() => setDropping(isDroppingThis ? null : slot.id)} style={{ padding: '4px 8px', fontSize: 9, fontFamily: font, letterSpacing: '0.08em', borderRadius: 3, border: '1px solid #ff446640', background: '#1a0d10', color: '#ff4466', cursor: 'pointer' }}>DROP</button>
                    </div>
                  </div>
                  {isDroppingThis && (
                    <div style={{ padding: '10px 16px', background: '#110810', borderBottom: '1px solid #0f1530', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#4a5568', flex: 1 }}>Drop {slot.stocks.ticker}?</span>
                      <button onClick={() => dropStock(slot)} disabled={loading} style={{ padding: '5px 12px', fontSize: 10, fontFamily: font, letterSpacing: '0.08em', borderRadius: 3, border: '1px solid #ff446640', background: '#1a0d10', color: '#ff4466', cursor: 'pointer', fontWeight: 700 }}>CONFIRM</button>
                      <button onClick={() => setDropping(null)} style={{ padding: '5px 12px', fontSize: 10, fontFamily: font, letterSpacing: '0.08em', borderRadius: 3, border: '1px solid #1a2040', background: 'transparent', color: '#4a5568', cursor: 'pointer' }}>CANCEL</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Free Agents */}
        <div>
          <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 12 }}>FREE AGENTS · {freeAgents.length} AVAILABLE</div>
          <div style={{ marginBottom: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search free agents..." style={{ width: '100%', background: '#0d1225', border: '1px solid #1a2040', borderRadius: 4, padding: '8px 12px', color: '#c8d0e0', fontFamily: font, fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
              <span>STOCK</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>CHG%</span><span style={{ textAlign: 'right' }}>ACTION</span>
            </div>
            {filteredFreeAgents.map((stock: any) => {
              const price = prices[stock.ticker]
              const isPos = price?.changePct >= 0
              const isAddingThis = adding === stock.id
              return (
                <div key={stock.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0f1530' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: SECTOR_COLORS[stock.sector] ?? '#4a5568', boxShadow: `0 0 6px ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{stock.ticker}</div>
                        <div style={{ fontSize: 9, color: '#4a5568' }}>{stock.name}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: price ? (isPos ? '#00ff88' : '#ff4466') : '#2a3555' }}>
                      {price ? `${isPos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(2)}%` : '—'}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button onClick={() => setAdding(isAddingThis ? null : stock.id)} style={{ padding: '4px 8px', fontSize: 9, fontFamily: font, letterSpacing: '0.08em', borderRadius: 3, border: '1px solid #00ff8840', background: '#091a10', color: '#00ff88', cursor: 'pointer' }}>ADD</button>
                    </div>
                  </div>
                  {isAddingThis && (
                    <div style={{ padding: '10px 16px', background: '#080f08', borderBottom: '1px solid #0f1530', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#4a5568', flex: 1 }}>Add {stock.ticker}?</span>
                      <button onClick={() => addStock(stock)} disabled={loading} style={{ padding: '5px 12px', fontSize: 10, fontFamily: font, letterSpacing: '0.08em', borderRadius: 3, border: '1px solid #00ff8840', background: '#091a10', color: '#00ff88', cursor: 'pointer', fontWeight: 700 }}>CONFIRM</button>
                      <button onClick={() => setAdding(null)} style={{ padding: '5px 12px', fontSize: 10, fontFamily: font, letterSpacing: '0.08em', borderRadius: 3, border: '1px solid #1a2040', background: 'transparent', color: '#4a5568', cursor: 'pointer' }}>CANCEL</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
