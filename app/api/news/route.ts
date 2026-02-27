import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  if (!ticker) return NextResponse.json([])

  const key = process.env.POLYGON_API_KEY
  const res = await fetch(
    `https://api.polygon.io/v2/reference/news?ticker=${ticker}&limit=8&order=desc&apiKey=${key}`
  )
  const data = await res.json()

  const articles = (data.results ?? []).map((a: any) => ({
    headline: a.title,
    source: a.publisher?.name ?? 'Unknown',
    url: a.article_url,
    time: a.published_utc,
    sentiment: a.insights?.[0]?.sentiment ?? 'neutral',
  }))

  return NextResponse.json(articles)
}