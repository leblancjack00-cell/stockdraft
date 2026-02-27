'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff',
  Finance: '#8b5cf6',
  Automotive: '#f59e0b',
  Energy: '#22c55e',
  Healthcare: '#ec4899',
  Retail: '#f97316',
  Consumer: '#14b8a6',
  Entertainment: '#a855f7',
}

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
  const [leagueId, setLeagueId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)
      setUserId(session.user.id)

      const { data: membership } = await supabase
        .from('league_members')
        .select('*, leagues(*)')
        .eq('user_id', session.user.id)
        .limit(1)
        .single()

      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)
      setLeagueId(membership.league_id)

      // Get my roster
      const { data: roster } = await supabase
        .from('roster_slots')
        .select('*, stocks(*)')
        .eq('league_id', membership.league_id)
        .eq('user_id', session.user.id)
      setMyRoster(roster ?? [])

      // Get all drafted stock ids
      const { data: allSlots } = await supabase
        .from('roster_slots')
        .select('stock_id')
        .eq('league_id', membership.league_id)

      const draftedIds = new Set((allSlots ?? []).map((s: any) => s.stock_id))

      // Get all stocks
      const { data: allStocks } = await supabase
        .from('stocks')
        .select('*')
        .order('ticker')

      const free = (allStocks ?? []).filter(s => !draftedIds.has(s.id))
      setFreeAgents(free)

      // Fetch prices for all stocks
      const allTickers = (allStocks ?? []).map((s: any) => s.ticker).join(',')
      const res = await fetch(`/api/prices?tickers=${allTickers}`)
      const priceData = await res.json()
      setPrices(priceData)
    }
    load()
  }, [])

  const dropStock = async (slot: any) => {
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase
      .from('roster_slots')
      .delete()
      .eq('id', slot.id)

    if (error) { setMessage(error.message); setLoading(false); return }

    setMyRoster(prev => prev.filter(s => s.id !== slot.id))
    setFreeAgents(prev => [...prev, slot.stocks].sort((a, b) => a.ticker.localeCompare(b.ticker)))
    setDropping(null)
    setMessage(`Dropped ${slot.stocks.ticker}`)
    setLoading(false)
  }

  const addStock = async (stock: any) => {
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase
      .from('roster_slots')
      .insert({ league_id: leagueId, user_id: userId, stock_id: stock.id })

    if (error) { setMessage(error.message); setLoading(false); return }

    const { data: newSlot } = await supabase
      .from('roster_slots')
      .select('*, stocks(*)')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .eq('stock_id', stock.id)
      .single()

    setMyRoster(prev => [...prev, newSlot])
    setFreeAgents(prev => prev.filter(s => s.id !== stock.id))
    setAdding(null)
    setMessage(`Added ${stock.ticker} to your roster`)
    setLoading(false)
  }

  const filteredFreeAgents = freeAgents.filter(s =>
    s.ticker.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <div className="text-2xl font-black tracking-wide">Waiver Wire</div>
          <div className="text-sm text-zinc-400 mt-1">{league?.name} · Add or drop stocks</div>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">

          {/* My Roster */}
          <div>
            <div className="text-xs tracking-widest text-zinc-400 mb-3">MY ROSTER · {myRoster.length} stocks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myRoster.map(slot => {
                const price = prices[slot.stocks.ticker]
                const isPos = price?.changePct >= 0
                const isDroppingThis = dropping === slot.id

                return (
                  <div key={slot.id} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{ background: `${SECTOR_COLORS[slot.stocks.sector]}20`, color: SECTOR_COLORS[slot.stocks.sector] }}>
                        {slot.stocks.ticker.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white">{slot.stocks.ticker}</div>
                        <div className="text-xs text-zinc-400 truncate">{slot.stocks.name}</div>
                      </div>
                      {price && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-white">${price.close.toFixed(2)}</div>
                          <div className={`text-xs ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPos ? '▲' : '▼'}{Math.abs(price.changePct).toFixed(2)}%
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setDropping(isDroppingThis ? null : slot.id)}
                        className="text-xs px-2 py-1 rounded border border-red-400/25 text-red-400 flex-shrink-0">
                        DROP
                      </button>
                    </div>
                    {isDroppingThis && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2">
                        <span className="text-xs text-zinc-400 flex-1">Drop {slot.stocks.ticker}?</span>
                        <button onClick={() => dropStock(slot)} disabled={loading}
                          className="text-xs px-3 py-1.5 rounded border border-red-400/40 bg-red-500/10 text-red-400 font-bold">
                          CONFIRM DROP
                        </button>
                        <button onClick={() => setDropping(null)}
                          className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400">
                          CANCEL
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Free Agents */}
          <div>
            <div className="text-xs tracking-widest text-zinc-400 mb-3">FREE AGENTS · {freeAgents.length} available</div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search free agents..."
              className="w-full rounded-lg border border-[#1a2040] bg-[#0b1022] px-3 py-2 text-sm outline-none text-white mb-3"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredFreeAgents.map(stock => {
                const price = prices[stock.ticker]
                const isPos = price?.changePct >= 0
                const isAddingThis = adding === stock.id

                return (
                  <div key={stock.id} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{ background: `${SECTOR_COLORS[stock.sector]}20`, color: SECTOR_COLORS[stock.sector] }}>
                        {stock.ticker.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white">{stock.ticker}</div>
                        <div className="text-xs text-zinc-400 truncate">{stock.name}</div>
                      </div>
                      {price && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-white">${price.close.toFixed(2)}</div>
                          <div className={`text-xs ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPos ? '▲' : '▼'}{Math.abs(price.changePct).toFixed(2)}%
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setAdding(isAddingThis ? null : stock.id)}
                        className="text-xs px-2 py-1 rounded border border-emerald-400/25 text-emerald-400 flex-shrink-0">
                        ADD
                      </button>
                    </div>
                    {isAddingThis && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2">
                        <span className="text-xs text-zinc-400 flex-1">Add {stock.ticker}?</span>
                        <button onClick={() => addStock(stock)} disabled={loading}
                          className="text-xs px-3 py-1.5 rounded border border-emerald-400/40 bg-emerald-500/10 text-emerald-400 font-bold">
                          CONFIRM ADD
                        </button>
                        <button onClick={() => setAdding(null)}
                          className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400">
                          CANCEL
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
