import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers')?.split(',') ?? []

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  const apiKey = process.env.POLYGON_API_KEY

  try {
    const results: Record<string, any> = {}

    await Promise.all(
      tickers.map(async (ticker) => {
        const res = await fetch(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`
        )
        const data = await res.json()
        if (data.results?.[0]) {
          const r = data.results[0]
          const change = r.c - r.o
          const changePct = ((r.c - r.o) / r.o) * 100
          results[ticker] = {
            ticker,
            close: r.c,
            open: r.o,
            high: r.h,
            low: r.l,
            volume: r.v,
            change: Math.round(change * 100) / 100,
            changePct: Math.round(changePct * 100) / 100,
          }
        }
      })
    )

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}