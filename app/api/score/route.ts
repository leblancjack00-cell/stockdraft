import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all active roster slots with stock and league info
  const { data: slots, error } = await supabase
    .from('roster_slots')
    .select('*, stocks(*), leagues(*)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!slots || slots.length === 0) return NextResponse.json({ message: 'No roster slots found' })

  const apiKey = process.env.POLYGON_API_KEY
  const week = 1 // hardcoded for now, will be dynamic later

  // Get unique tickers
  const tickers = [...new Set(slots.map((s: any) => s.stocks.ticker))]

  // Fetch prices for all tickers
  const prices: Record<string, any> = {}
  for (const ticker of tickers) {
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`
    )
    const data = await res.json()
    if (data.results?.[0]) {
      const r = data.results[0]
      prices[ticker] = {
        open: r.o,
        close: r.c,
        pctChange: ((r.c - r.o) / r.o) * 100,
      }
    }
    await new Promise(r => setTimeout(r, 200))
  }

  // Calculate and save scores
  const scoreRows = slots
    .filter((slot: any) => prices[slot.stocks.ticker])
    .map((slot: any) => {
      const price = prices[slot.stocks.ticker]
      const pts = Math.round(price.pctChange * 5 * 100) / 100
      return {
        league_id: slot.league_id,
        user_id: slot.user_id,
        stock_id: slot.stock_id,
        week,
        price_open: price.open,
        price_close: price.close,
        pct_change: Math.round(price.pctChange * 100) / 100,
        pts,
      }
    })

  const { error: insertError } = await supabase
    .from('weekly_scores')
    .upsert(scoreRows, { onConflict: 'league_id,user_id,stock_id,week' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({
    message: `Scored ${scoreRows.length} stocks`,
    scores: scoreRows,
  })
}
