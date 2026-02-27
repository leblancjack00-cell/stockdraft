'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const font = "'JetBrains Mono', 'Fira Code', monospace"
const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

function MiniChart({ positive }: { positive: boolean }) {
  const points = Array.from({ length: 20 }, (_, i) => {
    const trend = positive ? i * 1.2 : -i * 1.0
    return 20 + trend + (Math.random() * 8 - 4)
  })
  const min = Math.min(...points), max = Math.max(...points)
  const range = max - min || 1
  const w = 120, h = 40
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const color = positive ? '#00ff88' : '#ff4466'
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
    </svg>
  )
}

function BigChart({ positive, ticker, timeframe, basePrice }: { positive: boolean, ticker: string, timeframe: string, basePrice: number }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const days = timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 365
  const points = Array.from({ length: days }, (_, i) => {
    const trend = positive ? (i / days) * 20 : -(i / days) * 15
    const noise = Math.sin(i * 0.4) * 3 + Math.sin(i * 0.15) * 5
    return (basePrice || 100) * (1 + (trend + noise + (Math.random() * 4 - 2)) / 100)
  })

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const w = 600, h = 140
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const fillPts = `0,${h} ${pts} ${w},${h}`
  const color = positive ? '#00ff88' : '#ff4466'
  const yLabels = [0, 0.33, 0.66, 1].map(pct => ({
    pct, value: min + pct * range, y: h - pct * h,
  }))

  const periodChange = ((points[points.length - 1] - points[0]) / points[0]) * 100
  const periodPos = periodChange >= 0

  const hoverPrice = hoverIdx !== null ? points[hoverIdx] : null
  const hoverX = hoverIdx !== null ? (hoverIdx / (points.length - 1)) * w : null
  const hoverY = hoverIdx !== null ? h - ((points[hoverIdx] - min) / range) * h : null

  const getDaysAgo = (idx: number) => {
    const daysAgo = days - 1 - Math.round((idx / (points.length - 1)) * (days - 1))
    if (daysAgo === 0) return 'today'
    if (daysAgo === 1) return '1d ago'
    if (daysAgo < 30) return `${daysAgo}d ago`
    if (daysAgo < 365) return `${Math.round(daysAgo / 30)}mo ago`
    return `${Math.round(daysAgo / 365)}yr ago`
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * w
    const idx = Math.round((x / w) * (points.length - 1))
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)))
  }

  return (
    <div>
      {/* Period change badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: periodPos ? '#00ff88' : '#ff4466' }}>
          {periodPos ? '▲' : '▼'} {Math.abs(periodChange).toFixed(2)}%
        </span>
        <span style={{ fontSize: 10, color: '#2a3555' }}>over {timeframe}</span>
        {hoverPrice && (
          <span style={{ fontSize: 12, color: '#c8d0e0', marginLeft: 12 }}>
            ${hoverPrice.toFixed(2)} · <span style={{ color: '#4a5568' }}>{getDaysAgo(hoverIdx!)}</span>
          </span>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        {/* Y axis */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 20, width: 52, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 4 }}>
          {[...yLabels].reverse().map((l, i) => (
            <div key={i} style={{ fontSize: 9, color: '#2a3555', textAlign: 'right', paddingRight: 8 }}>${l.value.toFixed(2)}</div>
          ))}
        </div>

        <div style={{ marginLeft: 56 }}>
          <svg
            ref={svgRef}
            width="100%" viewBox={`0 0 ${w} ${h}`}
            style={{ overflow: 'visible', display: 'block', cursor: 'crosshair' }}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {yLabels.map((l, i) => (
              <line key={i} x1="0" y1={l.y} x2={w} y2={l.y} stroke="#14182e" strokeWidth="1" />
            ))}
            <polygon points={fillPts} fill={`url(#grad-${ticker})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

            {/* Hover crosshair */}
            {hoverIdx !== null && hoverX !== null && hoverY !== null && (
              <>
                <line x1={hoverX} y1={0} x2={hoverX} y2={h} stroke="#ffffff20" strokeWidth="1" strokeDasharray="3,3" />
                <line x1={0} y1={hoverY} x2={w} y2={hoverY} stroke="#ffffff10" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx={hoverX} cy={hoverY} r="4" fill={color} stroke="#080b14" strokeWidth="2" />
              </>
            )}

            {/* Last point dot when not hovering */}
            {hoverIdx === null && (() => {
              const lastPt = pts.split(' ').pop()!.split(',')
              return <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color} />
            })()}
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: '#2a3555' }}>
            <span>{timeframe === '1W' ? '7d ago' : timeframe === '1M' ? '30d ago' : timeframe === '3M' ? '3mo ago' : timeframe === '6M' ? '6mo ago' : '1yr ago'}</span>
            <span>{timeframe === '1W' ? '4d ago' : timeframe === '1M' ? '15d ago' : timeframe === '3M' ? '6wk ago' : timeframe === '6M' ? '3mo ago' : '6mo ago'}</span>
            <span style={{ color: '#4a5568' }}>today</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [selected, setSelected] = useState<any>(null)
  const [timeframe, setTimeframe] = useState('1M')
  const [myRoster, setMyRoster] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const { data: allStocks } = await supabase.from('stocks').select('*').order('ticker')
      setStocks(allStocks ?? [])

      if (session) {
        const { data: membership } = await supabase
          .from('league_members').select('league_id')
          .eq('user_id', session.user.id).limit(1).single()
        if (membership) {
          const { data: slots } = await supabase
            .from('roster_slots').select('stock_id')
            .eq('league_id', membership.league_id).eq('user_id', session.user.id)
          setMyRoster(new Set((slots ?? []).map((s: any) => s.stock_id)))
        }
      }

      if (allStocks && allStocks.length > 0) {
        const tickers = allStocks.map((s: any) => s.ticker).join(',')
        try {
          const res = await fetch(`/api/prices?tickers=${tickers}`)
          const priceData = await res.json()
          setPrices(priceData)
        } catch {}
      }
      setLoading(false)
    }
    load()
  }, [])

  const sectors = ['All', ...Array.from(new Set(stocks.map((s: any) => s.sector))).sort()]
  const filtered = stocks
    .filter((s: any) => sector === 'All' || s.sector === sector)
    .filter((s: any) => !search || s.ticker.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()))

  const selectedPrice = selected ? prices[selected.ticker] : null
  const isPos = selectedPrice?.changePct >= 0

  const [news, setNews] = useState<any[]>([])
  const [newsLoading, setNewsLoading] = useState(false)

  useEffect(() => {
    if (!selected) return
    setNews([])
    setNewsLoading(true)
    fetch(`/api/news?ticker=${selected.ticker}`)
      .then(r => r.json())
      .then(d => { setNews(d); setNewsLoading(false) })
      .catch(() => setNewsLoading(false))
  }, [selected])

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080b14; }
        ::-webkit-scrollbar-thumb { background: #1a2040; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        .stock-row:hover { background: #0d1530 !important; cursor: pointer; }
        input::placeholder { color: #2a3555; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg, #0d1225, #0a0f1e)', borderBottom: '1px solid #1a2040', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #00ff88, #00bfff)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#000' }}>$</div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', color: '#fff' }}>STOCKDRAFT</span>
          </a>
          <span style={{ color: '#1a2040' }}>|</span>
          <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.1em' }}>STOCK BROWSER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#4a5568' }}>{stocks.length} STOCKS</span>
          <a href="/dashboard" style={{ padding: '5px 12px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', textDecoration: 'none', letterSpacing: '0.08em' }}>← DASHBOARD</a>
          <a href="/draft" style={{ padding: '5px 12px', fontSize: 10, border: '1px solid #00ff8840', borderRadius: 4, color: '#00ff88', textDecoration: 'none', letterSpacing: '0.08em' }}>DRAFT ROOM →</a>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left: stock list */}
        <div style={{ width: selected ? 420 : '100%', display: 'flex', flexDirection: 'column', borderRight: selected ? '1px solid #14182e' : 'none', transition: 'width 0.2s ease' }}>

          {/* Filters */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #14182e', background: '#0a0d1a', flexShrink: 0 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickers or company names..."
              style={{ width: '100%', padding: '9px 12px', background: '#070a12', border: '1px solid #1a2040', borderRadius: 5, color: '#c8d0e0', fontFamily: font, fontSize: 12, outline: 'none', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {sectors.map(s => (
                <div key={s} onClick={() => setSector(s)} style={{ padding: '4px 10px', fontSize: 10, borderRadius: 3, background: sector === s ? '#1a3050' : '#0d1225', border: `1px solid ${sector === s ? '#00bfff40' : '#1a2040'}`, color: sector === s ? '#00bfff' : '#4a5568', cursor: 'pointer', letterSpacing: '0.07em' }}>{s}</div>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '55px 1fr 75px 75px' : '70px 1fr 90px 90px 100px 90px', padding: '8px 20px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530', background: '#09091a', flexShrink: 0 }}>
            <span>TICKER</span>
            <span>NAME</span>
            <span style={{ textAlign: 'right' }}>PRICE</span>
            <span style={{ textAlign: 'right' }}>CHG%</span>
            {!selected && <><span style={{ textAlign: 'center' }}>TREND</span><span style={{ textAlign: 'right' }}>SECTOR</span></>}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>Loading stocks...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>No stocks match</div>
            ) : filtered.map((stock: any) => {
              const price = prices[stock.ticker]
              const pos = price?.changePct >= 0
              const isSelected = selected?.id === stock.id
              const onRoster = myRoster.has(stock.id)
              return (
                <div key={stock.id} className="stock-row"
                  onClick={() => setSelected(isSelected ? null : stock)}
                  style={{ display: 'grid', gridTemplateColumns: selected ? '55px 1fr 75px 75px' : '70px 1fr 90px 90px 100px 90px', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #0a0d18', background: isSelected ? '#0d1530' : 'transparent', borderLeft: `2px solid ${isSelected ? '#00bfff' : 'transparent'}`, transition: 'all 0.1s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: SECTOR_COLORS[stock.sector] ?? '#4a5568', boxShadow: `0 0 5px ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}50`, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#00bfff' : '#a0b4d0', letterSpacing: '0.06em' }}>{stock.ticker}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#c8d0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</div>
                    {onRoster && <div style={{ fontSize: 8, color: '#00ff88', marginTop: 1 }}>✓ ON ROSTER</div>}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#c8d0e0' }}>{price ? `$${price.close.toFixed(2)}` : '—'}</div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: price ? (pos ? '#00ff88' : '#ff4466') : '#2a3555' }}>
                    {price ? `${pos ? '▲' : '▼'} ${Math.abs(price.changePct).toFixed(2)}%` : '—'}
                  </div>
                  {!selected && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <MiniChart positive={pos} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: `${SECTOR_COLORS[stock.sector] ?? '#4a5568'}20`, color: SECTOR_COLORS[stock.sector] ?? '#4a5568', border: `1px solid ${SECTOR_COLORS[stock.sector] ?? '#4a5568'}30` }}>{stock.sector?.substring(0, 8)}</span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: stock detail panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', animation: 'fadeIn 0.2s ease' }}>
            {/* Detail header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #14182e', background: '#0a0d1a' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: SECTOR_COLORS[selected.sector] ?? '#4a5568', boxShadow: `0 0 8px ${SECTOR_COLORS[selected.sector] ?? '#4a5568'}` }} />
                    <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>{selected.ticker}</span>
                    <span style={{ fontSize: 12, color: '#4a5568', padding: '3px 8px', border: '1px solid #1a2040', borderRadius: 3 }}>{selected.sector}</span>
                    {myRoster.has(selected.id) && <span style={{ fontSize: 10, color: '#00ff88', padding: '3px 8px', border: '1px solid #00ff8840', borderRadius: 3 }}>✓ ON YOUR ROSTER</span>}
                  </div>
                  <div style={{ fontSize: 14, color: '#6a8090' }}>{selected.name}</div>
                  <div style={{ fontSize: 10, color: '#2a3555', marginTop: 4 }}>{selected.exchange} · {selected.sector}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                    {selectedPrice ? `$${selectedPrice.close.toFixed(2)}` : '—'}
                  </div>
                  <div style={{ fontSize: 14, color: isPos ? '#00ff88' : '#ff4466', marginTop: 2 }}>
                    {selectedPrice ? `${isPos ? '▲' : '▼'} ${Math.abs(selectedPrice.changePct).toFixed(2)}%` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#2a3555', marginTop: 4 }}>today</div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'OPEN', value: selectedPrice ? `$${(selectedPrice.close * 0.998).toFixed(2)}` : '—' },
                  { label: 'HIGH', value: selectedPrice ? `$${(selectedPrice.close * 1.012).toFixed(2)}` : '—' },
                  { label: 'LOW', value: selectedPrice ? `$${(selectedPrice.close * 0.985).toFixed(2)}` : '—' },
                  { label: 'PREV CLOSE', value: selectedPrice ? `$${(selectedPrice.close / (1 + selectedPrice.changePct / 100)).toFixed(2)}` : '—' },
                  { label: 'EXCHANGE', value: selected.exchange ?? '—' },
                ].map(stat => (
                  <div key={stat.label} style={{ padding: '8px 14px', background: '#0d1225', border: '1px solid #1a2040', borderRadius: 5 }}>
                    <div style={{ fontSize: 8, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: 12, color: '#c8d0e0', fontWeight: 600 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #14182e' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: '#2a3555', letterSpacing: '0.12em' }}>PRICE CHART</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['1W', '1M', '3M', '6M', '1Y'].map(tf => (
                    <div key={tf} onClick={() => setTimeframe(tf)} style={{ padding: '4px 10px', fontSize: 10, borderRadius: 3, background: timeframe === tf ? '#1a3050' : '#0d1225', border: `1px solid ${timeframe === tf ? '#00bfff60' : '#1a2040'}`, color: timeframe === tf ? '#00bfff' : '#4a5568', cursor: 'pointer', letterSpacing: '0.06em' }}>{tf}</div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#0a0d1a', border: '1px solid #14182e', borderRadius: 8, padding: '16px 12px 8px', position: 'relative' }}>
                <BigChart positive={isPos} ticker={selected.ticker} timeframe={timeframe} basePrice={selectedPrice?.close ?? 100} />
              </div>
            </div>

            {/* News */}
            <div style={{ padding: '20px 28px' }}>
              <div style={{ fontSize: 10, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 12 }}>RECENT NEWSFLOW</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {newsLoading && <div style={{ fontSize: 11, color: '#2a3555', padding: '20px 0' }}>Loading news...</div>}
                {!newsLoading && news.length === 0 && <div style={{ fontSize: 11, color: '#2a3555', padding: '20px 0' }}>No recent news found.</div>}
                {news.map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '12px 16px', background: '#0a0d1a', border: '1px solid #14182e', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a3555')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#14182e')}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: item.sentiment === 'positive' ? '#00ff88' : item.sentiment === 'negative' ? '#ff4466' : '#4a5568' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#c8d0e0', lineHeight: 1.5, marginBottom: 4 }}>{item.headline}</div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 9, color: '#2a3555' }}>
                          <span style={{ color: '#4a5568' }}>{item.source}</span>
                          <span>{new Date(item.time).toLocaleDateString()}</span>
                          <span style={{ color: '#00bfff' }}>↗ READ →</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}