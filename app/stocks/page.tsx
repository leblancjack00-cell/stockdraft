'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

const font = "'JetBrains Mono', 'Fira Code', monospace"

export default function Stocks() {
  const [stocks, setStocks] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [sortBy, setSortBy] = useState('ticker')
  const [loadingPrices, setLoadingPrices] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('stocks').select('*').order('ticker')
      const stockList = data ?? []
      setStocks(stockList)
      setLoadingPrices(true)
      const tickers = stockList.map((s: any) => s.ticker).join(',')
      const res = await fetch(`/api/prices?tickers=${tickers}`)
      const priceData = await res.json()
      setPrices(priceData)
      setLoadingPrices(false)
    }
    load()
  }, [])

  const sectors = ['All', ...Array.from(new Set(stocks.map((s: any) => s.sector))).sort()]

  const filtered = stocks
    .filter((s: any) => {
      const matchSearch = s.ticker.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase())
      const matchSector = sector === 'All' || s.sector === sector
      return matchSearch && matchSector
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker)
      if (sortBy === 'price') return (prices[b.ticker]?.close ?? 0) - (prices[a.ticker]?.close ?? 0)
      if (sortBy === 'change') return (prices[b.ticker]?.changePct ?? 0) - (prices[a.ticker]?.changePct ?? 0)
      return 0
    })

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap');`}</style>

      {/* Sub-header */}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>STOCK BROWSER</span>
          <span style={{ fontSize: 11, color: '#4a5568' }}>{stocks.length} stocks · {loadingPrices ? 'Loading prices...' : 'Live prices'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['ticker', 'price', 'change'].map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{ padding: '4px 10px', fontSize: 9, borderRadius: 3, border: `1px solid ${sortBy === s ? '#4a5568' : 'transparent'}`, background: 'transparent', color: sortBy === s ? '#c8d0e0' : '#2a3555', cursor: 'pointer', fontFamily: font, letterSpacing: '0.08em' }}>
              SORT: {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d1225', border: '1px solid #1a2040', borderRadius: 4, padding: '7px 12px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ticker or name..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#c8d0e0', fontSize: 11, fontFamily: font, width: 200 }} />
          </div>
          {sectors.map(s => (
            <button key={s} onClick={() => setSector(s)} style={{ padding: '5px 10px', fontSize: 9, borderRadius: 3, border: `1px solid ${sector === s ? `${SECTOR_COLORS[s] ?? '#00bfff'}40` : '#1a2040'}`, background: sector === s ? '#0a1a2a' : '#0d1225', color: sector === s ? (SECTOR_COLORS[s] ?? '#00bfff') : '#4a5568', cursor: 'pointer', fontFamily: font, letterSpacing: '0.08em' }}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 80px', padding: '6px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #1a2040', marginBottom: 4 }}>
          <span>STOCK</span>
          <span style={{ textAlign: 'right' }}>PRICE</span>
          <span style={{ textAlign: 'right' }}>CHANGE</span>
          <span style={{ textAlign: 'right' }}>SECTOR</span>
          <span style={{ textAlign: 'right' }}>CAP</span>
        </div>

        {/* Stock rows */}
        <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
          {filtered.map((stock: any, i: number) => {
            const price = prices[stock.ticker]
            const isPos = price?.changePct >= 0
            return (
              <div key={stock.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 80px', alignItems: 'center', padding: '11px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #0f1530' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: SECTOR_COLORS[stock.sector] ?? '#4a5568', boxShadow: `0 0 6px ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{stock.ticker}</span>
                    <span style={{ fontSize: 10, color: '#4a5568', marginLeft: 10 }}>{stock.name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#c8d0e0' }}>
                  {price ? `$${price.close.toFixed(2)}` : <span style={{ color: '#2a3555' }}>—</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {price ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: isPos ? '#00ff88' : '#ff4466' }}>
                      {isPos ? '▲' : '▼'} {Math.abs(price.changePct).toFixed(2)}%
                    </span>
                  ) : <span style={{ color: '#2a3555' }}>—</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 9, color: SECTOR_COLORS[stock.sector] ?? '#4a5568' }}>{stock.sector}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 9, color: '#4a5568', border: '1px solid #1a2040', borderRadius: 2, padding: '2px 6px' }}>{stock.cap_size}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
