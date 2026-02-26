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

export default function Stocks() {
  const [stocks, setStocks] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [loadingPrices, setLoadingPrices] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('stocks').select('*').order('ticker')
      const stockList = data ?? []
      setStocks(stockList)

      // Fetch real prices
      setLoadingPrices(true)
      const tickers = stockList.map((s: any) => s.ticker).join(',')
      const res = await fetch(`/api/prices?tickers=${tickers}`)
      const priceData = await res.json()
      setPrices(priceData)
      setLoadingPrices(false)
    }
    load()
  }, [])

  const sectors = ['All', ...Array.from(new Set(stocks.map(s => s.sector))).sort()]

  const filtered = stocks.filter(s => {
    const matchSearch = s.ticker.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase())
    const matchSector = sector === 'All' || s.sector === sector
    return matchSearch && matchSector
  })

  return (
    <div className="min-h-screen bg-[#070a12] text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 block">← Dashboard</a>
            <div className="text-2xl font-black tracking-wide">Stock Browser</div>
            <div className="text-sm text-zinc-400 mt-1">
              {stocks.length} stocks · {loadingPrices ? 'Loading prices...' : 'Live prices'}
            </div>
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by ticker or name..."
          className="w-full rounded-xl border border-[#1a2040] bg-[#0b1022] px-4 py-3 text-sm outline-none text-white mb-4"
        />

        <div className="flex gap-2 flex-wrap mb-6">
          {sectors.map(s => (
            <div key={s} onClick={() => setSector(s)}
              style={{ borderColor: sector === s && s !== 'All' ? SECTOR_COLORS[s] : undefined, color: sector === s && s !== 'All' ? SECTOR_COLORS[s] : undefined }}
              className={`px-3 py-1 rounded-full text-xs cursor-pointer border ${sector === s ? 'border-current bg-white/5' : 'border-zinc-700 text-zinc-400'}`}>
              {s}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(stock => {
            const price = prices[stock.ticker]
            const isPos = price?.changePct >= 0
            return (
              <div key={stock.id} className="rounded-xl border border-[#1a2040] bg-[#0b1022] p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: `${SECTOR_COLORS[stock.sector]}20`, color: SECTOR_COLORS[stock.sector] }}>
                  {stock.ticker.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white">{stock.ticker} <span className="font-normal text-zinc-400 text-xs">{stock.name}</span></div>
                  <div className="text-xs mt-0.5" style={{ color: SECTOR_COLORS[stock.sector] }}>{stock.sector} · {stock.cap_size} cap</div>
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
                    <div className="text-xs text-zinc-600">—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}