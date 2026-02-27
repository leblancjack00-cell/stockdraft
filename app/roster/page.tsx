'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#00bfff', Finance: '#8b5cf6', Automotive: '#f59e0b',
  Energy: '#22c55e', Healthcare: '#ec4899', Retail: '#f97316',
  Consumer: '#14b8a6', Entertainment: '#a855f7',
}

const font = "'JetBrains Mono', 'Fira Code', monospace"

export default function Roster() {
  const [league, setLeague] = useState<any>(null)
  const [roster, setRoster] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }

      const { data: membership } = await supabase
        .from('league_members').select('*, leagues(*)')
        .eq('user_id', session.user.id).limit(1).single()
      if (!membership) { window.location.href = '/dashboard'; return }
      setLeague(membership.leagues)
      setTeamName(membership.team_name)

      const { data: rosterData } = await supabase
        .from('roster_slots').select('*, stocks(*)')
        .eq('league_id', membership.league_id).eq('user_id', session.user.id)
      setRoster(rosterData ?? [])

      const { data: scoreData } = await supabase
        .from('weekly_scores').select('*')
        .eq('league_id', membership.league_id).eq('user_id', session.user.id)
      const scoreMap: Record<string, number> = {}
      ;(scoreData ?? []).forEach((s: any) => { scoreMap[s.stock_id] = s.pts })
      setScores(scoreMap)

      if (rosterData && rosterData.length > 0) {
        const tickers = rosterData.map((s: any) => s.stocks.ticker).join(',')
        const res = await fetch(`/api/prices?tickers=${tickers}`)
        setPrices(await res.json())
      }
    }
    load()
  }, [])

  const totalPts = Object.values(scores).reduce((a, b) => a + b, 0)
  const totalValue = roster.reduce((sum, slot) => sum + (prices[slot.stocks.ticker]?.close ?? 0), 0)

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800;900&display=swap');`}</style>

      {/* Status bar */}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.08em' }}>MY ROSTER</span>
        <span style={{ fontSize: 11, color: '#00ff88' }}>{league?.name}</span>
        <span style={{ fontSize: 11, color: '#4a5568' }}>{teamName}</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'TOTAL PTS', value: `${totalPts >= 0 ? '+' : ''}${totalPts.toFixed(1)}`, color: totalPts >= 0 ? '#00ff88' : '#ff4466' },
            { label: 'STOCKS', value: roster.length, color: '#c8d0e0' },
            { label: 'PORT VALUE', value: `$${totalValue.toFixed(2)}`, color: '#00bfff' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ fontSize: 9, color: '#2a3555', letterSpacing: '0.12em', marginBottom: 8 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: stat.color as string }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Roster table */}
        <div style={{ background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 80px', padding: '8px 16px', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em', borderBottom: '1px solid #0f1530' }}>
            <span>STOCK</span>
            <span style={{ textAlign: 'right' }}>PRICE</span>
            <span style={{ textAlign: 'right' }}>CHG%</span>
            <span style={{ textAlign: 'right' }}>SECTOR</span>
            <span style={{ textAlign: 'right' }}>PTS</span>
          </div>

          {roster.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: '#2a3555' }}>
              No stocks on roster. Go to the draft or waiver wire to add stocks.
            </div>
          ) : roster.map((slot, i) => {
            const price = prices[slot.stocks.ticker]
            const isPos = price?.changePct >= 0
            const pts = scores[slot.stock_id] ?? 0
            return (
              <div key={slot.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 80px', alignItems: 'center', padding: '13px 16px', borderBottom: i < roster.length - 1 ? '1px solid #0f1530' : 'none', background: pts > 5 ? 'rgba(0,255,136,0.02)' : pts < -5 ? 'rgba(255,68,102,0.02)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568', boxShadow: `0 0 6px ${SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568'}60`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{slot.stocks.ticker}</div>
                    <div style={{ fontSize: 10, color: '#4a5568' }}>{slot.stocks.name}</div>
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
                  <span style={{ fontSize: 9, color: SECTOR_COLORS[slot.stocks.sector] ?? '#4a5568' }}>{slot.stocks.sector}</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: pts > 0 ? '#00ff88' : pts < 0 ? '#ff4466' : '#2a3555' }}>
                  {pts !== 0 ? `${pts > 0 ? '+' : ''}${pts.toFixed(1)}` : '—'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sector breakdown */}
        {roster.length > 0 && (
          <div style={{ marginTop: 16, background: '#0b1022', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #0f1530', fontSize: 9, color: '#2a3555', letterSpacing: '0.1em' }}>SECTOR BREAKDOWN</div>
            <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {Array.from(new Set(roster.map(s => s.stocks.sector))).map(sec => {
                const count = roster.filter(s => s.stocks.sector === sec).length
                const color = SECTOR_COLORS[sec as string] ?? '#4a5568'
                return (
                  <div key={sec as string} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#09091a', border: `1px solid ${color}30`, borderRadius: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 10, color }}>{sec as string}</span>
                    <span style={{ fontSize: 10, color: '#4a5568' }}>×{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
