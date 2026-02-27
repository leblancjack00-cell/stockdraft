'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

const font = "'JetBrains Mono', 'Fira Code', monospace"

export default function LeagueSettings({ params }: { params: { id: string } }) {
  const [league, setLeague] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [activeSection, setActiveSection] = useState('basic')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Editable fields
  const [leagueName, setLeagueName] = useState('')
  const [season, setSeason] = useState('')
  const [status, setStatus] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      setSession(session)

      const { data: lg } = await supabase.from('leagues').select('*').eq('id', params.id).single()
      if (!lg) { window.location.href = '/dashboard'; return }
      setLeague(lg)
      setLeagueName(lg.name)
      setSeason(lg.season ?? '')
      setStatus(lg.status ?? 'active')
      setIsPublic(lg.is_public ?? false)
      setIsCommissioner(lg.commissioner_id === session.user.id)

      const { data: allMembers } = await supabase
        .from('league_members').select('*').eq('league_id', params.id)
      setMembers(allMembers ?? [])
    }
    load()
  }, [params.id])

  const save = async () => {
    setSaving(true); setMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('leagues').update({
      name: leagueName, season, status, is_public: isPublic
    }).eq('id', params.id)
    if (error) { setMsg(error.message); setSaving(false); return }
    setLeague((prev: any) => ({ ...prev, name: leagueName, season, status, is_public: isPublic }))
    setEditing(false); setMsg('✓ Settings saved!')
    setTimeout(() => setMsg(''), 3000)
    setSaving(false)
  }

  const sections = [
    { id: 'basic', label: 'Basic Settings', icon: '⚙️' },
    { id: 'scoring', label: 'Scoring', icon: '📈' },
    { id: 'draft', label: 'Draft', icon: '🐍' },
    { id: 'roster', label: 'Roster', icon: '📋' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'members', label: 'Members', icon: '👥' },
  ]

  if (!league) return (
    <div style={{ fontFamily: font, background: '#080b14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a3555' }}>
      Loading...
    </div>
  )

  const Row = ({ label, value }: { label: string, value: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 20px', borderBottom: '1px solid #0f1530' }}>
      <div style={{ fontSize: 12, color: '#4a5568' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#c8d0e0' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ fontFamily: font, background: '#080b14', color: '#c8d0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #080b14; }
        ::-webkit-scrollbar-thumb { background: #1a2040; border-radius: 2px; }
        input, select { font-family: ${font}; }
        input::placeholder { color: #2a3555; }
        .section-btn:hover { background: #0d1225 !important; color: #c8d0e0 !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg, #0d1225, #0a0f1e)', borderBottom: '1px solid #1a2040', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #00ff88, #00bfff)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#000' }}>$</div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', color: '#fff' }}>STOCKDRAFT</span>
          </a>
          <span style={{ color: '#1a2040' }}>|</span>
          <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: '0.1em' }}>{league.name} · SETTINGS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isCommissioner && (
            <span style={{ fontSize: 10, padding: '3px 8px', border: '1px solid #00ff8840', borderRadius: 3, color: '#00ff88', letterSpacing: '0.08em' }}>⭐ COMMISSIONER</span>
          )}
          <a href="/dashboard" style={{ padding: '5px 12px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', textDecoration: 'none', letterSpacing: '0.08em' }}>← DASHBOARD</a>
        </div>
      </div>

      {/* League title bar */}
      <div style={{ background: '#0a0d1a', borderBottom: '1px solid #14182e', padding: '20px 24px' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{league.name}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#4a5568' }}>
          <span>Season: <span style={{ color: '#c8d0e0' }}>{league.season ?? '—'}</span></span>
          <span>·</span>
          <span>Status: <span style={{ color: league.status === 'active' ? '#00ff88' : '#f59e0b' }}>{league.status?.toUpperCase() ?? 'ACTIVE'}</span></span>
          <span>·</span>
          <span>Members: <span style={{ color: '#c8d0e0' }}>{members.length}</span></span>
          <span>·</span>
          <span>Invite Code: <span style={{ color: '#00ff88', fontWeight: 700, letterSpacing: '0.15em' }}>{league.invite_code}</span></span>
          <span>·</span>
          <span>Visibility: <span style={{ color: '#c8d0e0' }}>{league.is_public ? 'Public' : 'Private'}</span></span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: '#0a0d1a', borderRight: '1px solid #14182e', padding: '16px 0', flexShrink: 0 }}>
          {sections.map(s => (
            <div key={s.id} className="section-btn"
              onClick={() => setActiveSection(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', fontSize: 12, cursor: 'pointer', color: activeSection === s.id ? '#fff' : '#4a5568', background: activeSection === s.id ? '#0d1225' : 'transparent', borderLeft: `2px solid ${activeSection === s.id ? '#00ff88' : 'transparent'}`, letterSpacing: '0.06em', transition: 'all 0.15s' }}>
              <span>{s.icon}</span>{s.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          {msg && (
            <div style={{ marginBottom: 16, padding: '8px 14px', background: msg.startsWith('✓') ? '#081a10' : '#1a0810', border: `1px solid ${msg.startsWith('✓') ? '#00ff8840' : '#ff446640'}`, borderRadius: 6, fontSize: 11, color: msg.startsWith('✓') ? '#00ff88' : '#ff4466' }}>{msg}</div>
          )}

          {/* ── BASIC SETTINGS ── */}
          {activeSection === 'basic' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Basic Settings</div>
                  <div style={{ fontSize: 11, color: '#4a5568' }}>Core league configuration</div>
                </div>
                {isCommissioner && !editing && (
                  <div onClick={() => setEditing(true)} style={{ padding: '7px 16px', fontSize: 10, border: '1px solid #00bfff40', borderRadius: 4, color: '#00bfff', cursor: 'pointer', letterSpacing: '0.08em' }}>EDIT</div>
                )}
              </div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>LEAGUE INFO</div>
                {editing ? (
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 6 }}>LEAGUE NAME</div>
                      <input value={leagueName} onChange={e => setLeagueName(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, color: '#fff', fontSize: 13, outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 6 }}>SEASON</div>
                      <input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. Q1 2025" style={{ width: '100%', padding: '10px 12px', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, color: '#fff', fontSize: 13, outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.12em', marginBottom: 6 }}>STATUS</div>
                      <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, color: '#fff', fontSize: 13, outline: 'none' }}>
                        <option value="active">Active</option>
                        <option value="drafting">Drafting</option>
                        <option value="complete">Complete</option>
                        <option value="offseason">Offseason</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div onClick={() => setIsPublic(p => !p)} style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? '#00ff88' : '#1a2040', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 2, left: isPublic ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#c8d0e0' }}>Make league public</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <div onClick={() => !saving && save()} style={{ flex: 1, padding: '10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center', background: '#0d1f15', border: '1px solid #00ff8840', borderRadius: 4, color: '#00ff88', cursor: 'pointer' }}>{saving ? 'SAVING...' : 'SAVE CHANGES'}</div>
                      <div onClick={() => setEditing(false)} style={{ padding: '10px 16px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', cursor: 'pointer' }}>CANCEL</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Row label="League Name" value={league.name} />
                    <Row label="Season" value={league.season ?? '—'} />
                    <Row label="Status" value={league.status?.toUpperCase() ?? 'ACTIVE'} />
                    <Row label="Visibility" value={league.is_public ? 'Public' : 'Private'} />
                    <Row label="Invite Code" value={league.invite_code} />
                    <Row label="Current Week" value={`Week ${league.week ?? 1}`} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── SCORING ── */}
          {activeSection === 'scoring' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Scoring Rules</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 20 }}>How points are calculated each week</div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>BASE SCORING</div>
                <Row label="Format" value="Head-to-Head Weekly" />
                <Row label="Scoring Type" value="Price % Change" />
                <Row label="Points Per 1% Gain" value="+5 pts" />
                <Row label="Points Per 1% Loss" value="-5 pts" />
                <Row label="Score Update Frequency" value="Daily after market close" />
              </div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>BONUS POINTS</div>
                <Row label="52-Week High Hit" value="+10 pts" />
                <Row label="Beat Earnings Estimate" value="+15 pts" />
                <Row label="Gain Over 10% in a Week" value="+20 pts" />
                <Row label="Stock Halted / Delisted" value="-25 pts" />
              </div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>MATCHUP SCORING</div>
                <Row label="Matchup Format" value="Head-to-Head" />
                <Row label="Regular Season Length" value="10 Weeks" />
                <Row label="Playoff Weeks" value="Weeks 11–13" />
                <Row label="Playoff Teams" value="Top 4" />
              </div>
            </div>
          )}

          {/* ── DRAFT ── */}
          {activeSection === 'draft' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Draft Settings</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 20 }}>How the draft is structured</div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>DRAFT FORMAT</div>
                <Row label="Draft Type" value="Snake Draft" />
                <Row label="Seconds Per Pick" value="60 seconds" />
                <Row label="Number of Rounds" value="Based on roster size" />
                <Row label="Draft Order" value="Randomized" />
              </div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>ELIGIBLE STOCKS</div>
                <Row label="Stock Universe" value="S&P 500 + NASDAQ 100" />
                <Row label="Max Teams" value="12" />
                <Row label="Stocks Per Team" value="Unlimited" />
                <Row label="Waiver Wire" value="Enabled" />
              </div>
            </div>
          )}

          {/* ── ROSTER ── */}
          {activeSection === 'roster' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Roster Settings</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 20 }}>How rosters are managed</div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>ROSTER RULES</div>
                <Row label="Roster Size" value="No limit" />
                <Row label="Active Slots" value="All drafted stocks" />
                <Row label="Waiver Claims" value="Free agent adds/drops" />
                <Row label="Trade Deadline" value="End of Week 8" />
              </div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>TRANSACTIONS</div>
                <Row label="Waiver Type" value="Free Agent (First Come)" />
                <Row label="Waiver Period" value="Instant" />
                <Row label="Max Adds Per Week" value="Unlimited" />
                <Row label="Max Drops Per Week" value="Unlimited" />
              </div>
            </div>
          )}

          {/* ── SCHEDULE ── */}
          {activeSection === 'schedule' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Schedule</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 20 }}>Season schedule and matchup weeks</div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 10, color: '#4a6080', letterSpacing: '0.12em' }}>SEASON SCHEDULE</div>
                {Array.from({ length: 13 }, (_, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 20px', borderBottom: '1px solid #0f1530', background: i + 1 === (league.week ?? 1) ? '#0d1f15' : 'transparent' }}>
                    <div style={{ fontSize: 12, color: i + 1 === (league.week ?? 1) ? '#00ff88' : '#4a5568' }}>
                      Week {i + 1} {i + 1 === (league.week ?? 1) && <span style={{ fontSize: 9, marginLeft: 6 }}>← CURRENT</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#c8d0e0' }}>
                      {i < 10 ? 'Regular Season' : 'Playoffs'}
                    </div>
                    <div style={{ fontSize: 12, color: i + 1 < (league.week ?? 1) ? '#2a3555' : '#4a5568' }}>
                      {i + 1 < (league.week ?? 1) ? 'Complete' : i + 1 === (league.week ?? 1) ? 'In Progress' : 'Upcoming'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MEMBERS ── */}
          {activeSection === 'members' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Members</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 20 }}>{members.length} teams in this league</div>

              <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', padding: '10px 20px', background: '#0a0f1e', borderBottom: '1px solid #1a2040', fontSize: 9, color: '#4a6080', letterSpacing: '0.12em' }}>
                  <span>TEAM NAME</span><span>ROLE</span><span style={{ textAlign: 'right' }}>JOINED</span>
                </div>
                {members.map((m: any) => (
                  <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #0f1530', background: m.user_id === session?.user?.id ? '#0d1f15' : 'transparent' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: m.user_id === session?.user?.id ? '#fff' : '#c8d0e0' }}>
                      {m.team_name}
                      {m.user_id === session?.user?.id && <span style={{ fontSize: 9, color: '#00ff88', marginLeft: 8 }}>YOU</span>}
                    </div>
                    <div style={{ fontSize: 11, color: m.user_id === league.commissioner_id ? '#00ff88' : '#4a5568' }}>
                      {m.user_id === league.commissioner_id ? '⭐ Commissioner' : 'Member'}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 10, color: '#2a3555' }}>
                      {new Date(m.joined_at ?? m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              {isCommissioner && (
                <div style={{ background: '#0d1225', border: '1px solid #1a2040', borderRadius: 8, padding: 20 }}>
                  <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 12, letterSpacing: '0.08em' }}>INVITE LINK</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, padding: '10px 14px', background: '#070a12', border: '1px solid #1a2040', borderRadius: 4, fontSize: 12, color: '#c8d0e0', letterSpacing: '0.08em' }}>
                      Invite code: <span style={{ color: '#00ff88', fontWeight: 700 }}>{league.invite_code}</span>
                    </div>
                    <div onClick={() => navigator.clipboard.writeText(league.invite_code)} style={{ padding: '10px 16px', fontSize: 10, border: '1px solid #1a2040', borderRadius: 4, color: '#4a5568', cursor: 'pointer', letterSpacing: '0.08em' }}>COPY</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}