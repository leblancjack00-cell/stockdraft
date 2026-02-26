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

export default function Roster() {
  const [session, setSession] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [roster, setRoster] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [loadingPrices, setLoadingPrices] = useState(false)

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

      // Get roster slots with stock info
      const { data: slots } = await supabase
        .from('roster_slots')
        .select('*, stocks(*)')
        .eq('league_id', membership.league_id)
        .eq('user_id', session.user.id)

      const rosterData = slots ?? []
      setRoster(rosterData)

      // Fetch prices for roster stocks
      if (rosterData.length > 0) {
        setLoadingPrices(true)
        const tickers = rosterData.map((s: any) => s.stocks.ticker).join(',')
        const res = await fetch(`/api/prices?tickers=${tickers}`)
        const priceData = await res.json()
        setPrices(priceData)
        setLoadingPrices(false)
      }
    }
    load()
  }, [])

  const totalPts = roster.reduce((sum, slot) => {
    const price = prices[slot.stocks.ticker]
    if (!price) return sum
    return sum + (price.changePct * 5)
  }, 0)

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <a href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 block">← Dashboard</a>
          <div className="text-2xl font-black tracking-wide">My Roster</div>
          <div className="text-sm text-zinc-400 mt-1">
            {league?.name} · {roster.length} stocks · {loadingPrices ? 'Loading prices...' : 'Live prices'}
          </div>
        </div>

        {/* Score summary */}
        <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-6 mb-6">
          <div className="text-xs tracking-widest text-zinc-400 mb-1">THIS WEEK'S SCORE</div>
          <div className={`text-4xl font-black ${totalPts >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPts >= 0 ? '+' : ''}{totalPts.toFixed(1)} pts
          </div>
          <div className="text-xs text-zinc-500 mt-1">Based on daily % change × 5 pts</div>
        </div>

        {/* Roster list */}
        {roster.length === 0 ? (
          <div className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-8 text-center">
            <div className="text-2xl mb-3">📋</div>
            <div className="font-bold text-white mb-1">No stocks drafted yet</div>
            <div className="text-sm text-zinc-400 mb-4">Head to the draft room to pick your team</div>
            <a href="/draft" className="px-4 py-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-xs font-bold tracking-widest text-emerald-300">
              GO TO DRAFT
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roster.map(slot => {
              const price = prices[slot.stocks.ticker]
              const isPos = price?.changePct >= 0
              const pts = price ? price.changePct * 5 : null

              return (
                <div key={slot.id} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: `${SECTOR_COLORS[slot.stocks.sector]}20`, color: SECTOR_COLORS[slot.stocks.sector] }}>
                    {slot.stocks.ticker.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white">{slot.stocks.ticker} <span className="font-normal text-zinc-400 text-xs">{slot.stocks.name}</span></div>
                    <div className="text-xs mt-0.5" style={{ color: SECTOR_COLORS[slot.stocks.sector] }}>{slot.stocks.sector}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {price ? (
                      <>
                        <div className="font-bold text-white">${price.close.toFixed(2)}</div>
                        <div className={`text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPos ? '▲' : '▼'} {Math.abs(price.changePct).toFixed(2)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-zinc-600">Loading...</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 w-20">
                    {pts !== null ? (
                      <div className={`text-lg font-black ${pts >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pts >= 0 ? '+' : ''}{pts.toFixed(1)}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-600">—</div>
                    )}
                    <div className="text-[10px] text-zinc-500">pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}