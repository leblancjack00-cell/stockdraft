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

export default function DraftRoom() {
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)

      // Get first league the user belongs to
      const { data: membership } = await supabase
        .from('league_members')
        .select('*, leagues(*)')
        .eq('user_id', session.user.id)
        .limit(1)
        .single()

      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)

      // Get all members of the league
      const { data: allMembers } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', membership.league_id)
      setMembers(allMembers ?? [])

      // Get all stocks
      const { data: allStocks } = await supabase
        .from('stocks')
        .select('*')
        .order('ticker')
      setStocks(allStocks ?? [])

      // Get existing picks
      const { data: existingPicks } = await supabase
        .from('draft_picks')
        .select('*, stocks(*)')
        .eq('league_id', membership.league_id)
        .order('pick_number')
      setPicks(existingPicks ?? [])
    }
    load()
  }, [])

  const draftStock = async (stock: any) => {
    if (!session || !league) return
    setLoading(true)
    setMessage('')
    const supabase = createClient()

    const pickNumber = picks.length + 1
    const round = Math.ceil(pickNumber / members.length)

    // Insert draft pick
    const { error: pickError } = await supabase
      .from('draft_picks')
      .insert({
        league_id: league.id,
        user_id: session.user.id,
        stock_id: stock.id,
        pick_number: pickNumber,
        round,
      })

    if (pickError) {
      setMessage(pickError.message.includes('unique') ? `${stock.ticker} already drafted.` : pickError.message)
      setLoading(false)
      return
    }

    // Add to roster
    await supabase.from('roster_slots').insert({
      league_id: league.id,
      user_id: session.user.id,
      stock_id: stock.id,
    })

    // Refresh picks
    const { data: updatedPicks, error: picksError } = await supabase
      .from('draft_picks')
      .select('*, stocks(*)')
      .eq('league_id', league.id)
      .order('pick_number')
    console.log('updated picks:', updatedPicks, picksError)
    setPicks(updatedPicks ?? [])
    setMessage(`✓ Drafted ${stock.ticker}!`)
    setLoading(false)
  }

  const draftedIds = new Set(picks.map(p => p.stock_id))
  const myPicks = picks.filter(p => p.user_id === session?.user.id)

  const sectors = ['All', ...Array.from(new Set(stocks.map(s => s.sector))).sort()]
  const filtered = stocks.filter(s => {
    const matchSearch = s.ticker.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase())
    const matchSector = sector === 'All' || s.sector === sector
    return matchSearch && matchSector
  })

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <a href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 mb-1 block">← Dashboard</a>
            <div className="text-2xl font-black tracking-wide">Draft Room</div>
            <div className="text-sm text-zinc-400 mt-1">{league?.name} · {picks.length} picks made</div>
          </div>
          {message && (
            <div className="px-4 py-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-sm text-emerald-300">
              {message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left: Available stocks */}
          <div className="col-span-2">
            <div className="text-xs tracking-widest text-zinc-400 mb-3">
              AVAILABLE STOCKS · {stocks.length - draftedIds.size} remaining
            </div>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stocks..."
              className="w-full rounded-lg border border-[#1a2040] bg-[#0b1022] px-4 py-2 text-sm outline-none text-white mb-3"
            />

            <div className="flex gap-2 flex-wrap mb-4">
              {sectors.map(s => (
                <div key={s} onClick={() => setSector(s)}
                  style={{ borderColor: sector === s && s !== 'All' ? SECTOR_COLORS[s] : undefined, color: sector === s && s !== 'All' ? SECTOR_COLORS[s] : undefined }}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer border ${sector === s ? 'border-current bg-white/5' : 'border-zinc-700 text-zinc-400'}`}>
                  {s}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {filtered.map(stock => {
                const isDrafted = draftedIds.has(stock.id)
                const myPick = picks.find(p => p.stock_id === stock.id && p.user_id === session?.user.id)
                return (
                  <div key={stock.id} className={`rounded-lg border p-3 flex items-center gap-3 transition-all ${isDrafted ? 'border-zinc-800 opacity-40' : 'border-[#1a2040] bg-[#0b1022] hover:border-zinc-600'}`}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: `${SECTOR_COLORS[stock.sector]}20`, color: SECTOR_COLORS[stock.sector] }}>
                      {stock.ticker.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{stock.ticker} <span className="font-normal text-zinc-400 text-xs">{stock.name}</span></div>
                      <div className="text-xs" style={{ color: SECTOR_COLORS[stock.sector] }}>{stock.sector} · {stock.cap_size} cap</div>
                    </div>
                    {isDrafted ? (
                      <div className="text-xs text-zinc-500 px-3 py-1 border border-zinc-700 rounded">
                        {myPick ? 'YOUR PICK' : 'DRAFTED'}
                      </div>
                    ) : (
                      <button
                        onClick={() => draftStock(stock)}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-xs font-bold tracking-widest text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        DRAFT
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: My roster + pick log */}
          <div>
            {/* My Roster */}
            <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-4 mb-4">
              <div className="text-xs tracking-widest text-zinc-400 mb-3">MY ROSTER · {myPicks.length} picks</div>
              {myPicks.length === 0 ? (
                <div className="text-xs text-zinc-500 py-4 text-center">No picks yet</div>
              ) : (
                myPicks.map(pick => (
                  <div key={pick.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                    <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0"
                      style={{ background: `${SECTOR_COLORS[pick.stocks.sector]}20`, color: SECTOR_COLORS[pick.stocks.sector] }}>
                      {pick.stocks.ticker.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{pick.stocks.ticker}</div>
                      <div className="text-[10px] text-zinc-500">Round {pick.round} · Pick {pick.pick_number}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pick log */}
            <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-4">
              <div className="text-xs tracking-widest text-zinc-400 mb-3">PICK LOG</div>
              {picks.length === 0 ? (
                <div className="text-xs text-zinc-500 py-4 text-center">Draft hasn't started</div>
              ) : (
                [...picks].reverse().slice(0, 10).map(pick => (
                  <div key={pick.id} className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0">
                    <div className="text-xs text-zinc-500 w-6">#{pick.pick_number}</div>
                    <div className="text-sm font-bold text-white">{pick.stocks.ticker}</div>
                    <div className="text-xs text-zinc-400 flex-1 truncate">{pick.league_members?.team_name}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}