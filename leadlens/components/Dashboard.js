'use client'
import { useState } from 'react'
import { AGENTS, SYSTEM_PROMPTS } from '../lib/agents'
import styles from './Dashboard.module.css'
import * as XLSX from 'xlsx'

const NAV_MAIN = [
  { icon: '⌂', label: 'Dashboard' },
  { icon: '⟆', label: 'Pipeline' },
  { icon: '◎', label: 'Leads' },
  { icon: '↗', label: 'Reports' },
]

const NAV_BOTTOM = [
  { icon: '⚙', label: 'Settings' },
  { icon: '☰', label: 'Billing' },
  { icon: '?', label: 'Help & Support' },
]

const AGENT_ICONS = {
  scout: '◎',
  auditor: '⊕',
  scorer: '◎',
  outreach: '✎',
  tracker: '▤',
}

const EMPTY_STATES = {
  scout: { title: 'Ready to find leads', desc: 'Enter a niche and location to discover B2B leads instantly.', checks: ['Business name & location', 'Estimated website', 'Priority rating', 'Why they need AI'] },
  auditor: { title: 'Ready to audit a website', desc: 'Paste any website URL to get a full AI-powered audit report.', checks: ['SEO & Visibility score', 'AI & Automation gaps', 'Lead capture rating', 'Opportunity brief'] },
  scorer: { title: 'Ready to score a lead', desc: 'Paste your Website Auditor report and Claude AI will analyse it.', checks: ['Lead Grade (A / B / C)', 'Opportunity Score', 'Revenue Potential', 'Recommended Action'] },
  outreach: { title: 'Ready to write outreach', desc: 'Paste your Lead Scorer report to generate personalised copy.', checks: ['Cold email + subject line', 'LinkedIn DM', 'Instagram DM', 'Day 3 follow-up'] },
  tracker: { title: 'Ready to format data', desc: 'Paste any agent output to format it for Google Sheets.', checks: ['Formatted header row', 'Data row ready to paste', 'Colour-coding guide', 'Copy-paste instructions'] },
}

export default function Dashboard({ onLogout }) {
  const [activeId, setActiveId] = useState('scout')
  const [inputs, setInputs] = useState({ scout: '', auditor: '', scorer: '', outreach: '', tracker: '' })
  const [outputs, setOutputs] = useState({ scout: '', auditor: '', scorer: '', outreach: '', tracker: '' })
  const [loading, setLoading] = useState({})
  const [copied, setCopied] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const active = AGENTS.find(a => a.id === activeId)
  const activeIdx = AGENTS.findIndex(a => a.id === activeId)
  const empty = EMPTY_STATES[activeId]

  const runAgent = async () => {
    const input = inputs[activeId]
    if (!input.trim() || loading[activeId]) return
    setLoading(prev => ({ ...prev, [activeId]: true }))
    setOutputs(prev => ({ ...prev, [activeId]: '' }))
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: SYSTEM_PROMPTS[activeId], message: input }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOutputs(prev => ({ ...prev, [activeId]: data.result || '' }))
    } catch (err) {
      setOutputs(prev => ({ ...prev, [activeId]: 'Error: ' + err.message }))
    }
    setLoading(prev => ({ ...prev, [activeId]: false }))
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(outputs[activeId])
    setCopied(activeId)
    setTimeout(() => setCopied(''), 2000)
  }

  const exportToExcel = () => {
    const scoutOut    = outputs['scout']    || ''
    const auditorOut  = outputs['auditor']  || ''
    const scorerOut   = outputs['scorer']   || ''
    const outreachOut = outputs['outreach'] || ''

    // ── helpers to extract values from agent outputs ──
    const extract = (text, regex) => { const m = text.match(regex); return m ? m[1].trim() : '' }

    const bizName   = extract(auditorOut, /BUSINESS[:\s]+(.+)/i)
    const website   = extract(auditorOut, /WEBSITE[:\s]+(.+)/i)
    const priority  = extract(auditorOut, /LEAD TEMPERATURE[:\s]+(HOT|WARM|COLD)/i) ||
                      extract(scorerOut,  /LEAD TEMPERATURE[:\s]+(HOT|WARM|COLD)/i)
    const phone     = extract(auditorOut, /PHONE[:\s]+(.+)/i)
    const email     = extract(auditorOut, /EMAIL[:\s]+(.+)/i)

    // Score fields
    const seoScore      = extract(auditorOut, /SEO[^:]*:\s*(\d+\/10)/)
    const speedScore    = extract(auditorOut, /Speed[^:]*:\s*(\d+\/10)/i)
    const aiScore       = extract(auditorOut, /AI[^:]*:\s*(\d+\/10)/i)
    const chatbot       = /chatbot/i.test(auditorOut) ? (aiScore < 4 ? '✗' : '?') : '?'
    const booking       = /booking/i.test(auditorOut) ? '✓' : '✗'
    const pitch         = extract(auditorOut, /ICM OPPORTUNITY[:\s\n]+(.+?)(?:\n|$)/i)
    const subjectLine   = extract(outreachOut, /Subject[:\s]+(.+)/i)
    const emailBody     = outreachOut || ''

    // ── TEAL header style (xlsx format) ──
    const tealFill  = { patternType: 'solid', fgColor: { rgb: '2AABB8' } }
    const colHeader = {
      fill: { patternType: 'solid', fgColor: { rgb: '2AABB8' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      alignment: { horizontal: 'center', wrapText: true },
      border: {
        bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
        right:  { style: 'thin', color: { rgb: 'FFFFFF' } },
      }
    }
    const titleStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: '2AABB8' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
    const subtitleStyle = {
      font: { italic: true, color: { rgb: '555555' }, sz: 10 },
      alignment: { horizontal: 'center' }
    }
    const priorityHot  = {
      fill: { patternType: 'solid', fgColor: { rgb: 'D4EDDA' } },
      font: { bold: true, color: { rgb: '155724' }, sz: 11 },
      alignment: { horizontal: 'center' }
    }
    const priorityWarm = {
      fill: { patternType: 'solid', fgColor: { rgb: 'FFF3CD' } },
      font: { bold: true, color: { rgb: '856404' }, sz: 11 },
      alignment: { horizontal: 'center' }
    }
    const prioritySkip = {
      fill: { patternType: 'solid', fgColor: { rgb: 'F8D7DA' } },
      font: { bold: true, color: { rgb: '721C24' }, sz: 11 },
      alignment: { horizontal: 'center' }
    }
    const dataCell = {
      font: { sz: 11 },
      alignment: { wrapText: true, vertical: 'top' },
      border: {
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }

    const getPriorityStyle = (p = '') => {
      const u = p.toUpperCase()
      if (u === 'HOT' || u === 'HIGH')    return priorityHot
      if (u === 'WARM' || u === 'MEDIUM') return priorityWarm
      return prioritySkip
    }

    const styleSheet = (ws, headerCols, numDataRows, titleCell, subtitleCell) => {
      if (ws[titleCell])    ws[titleCell].s    = titleStyle
      if (ws[subtitleCell]) ws[subtitleCell].s = subtitleStyle
      headerCols.forEach(col => { if (ws[`${col}4`]) ws[`${col}4`].s = colHeader })
      for (let r = 5; r < 5 + numDataRows; r++) {
        headerCols.forEach(col => { if (ws[`${col}${r}`]) ws[`${col}${r}`].s = dataCell })
      }
    }

    // ════════════════════════════════════════
    // SHEET 1 — Lead Audit (all scout leads)
    // ════════════════════════════════════════
    const auditRows = scoutRows.map((row, i) => {
      const biz  = row[1]
      const site = row[2]
      const pri  = row[6]
      return [i + 1, biz, '', site ? 'Active' : '', '', 'None', '?', '?', pri, '', '', '', site]
    })

    const auditData = [
      ['ICM — AI Automation Lead Audit | Birmingham Dental Practices'],
      [`Batch 1 of ? | Audit Date: ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} | Services: AI Chatbot · AI Voice Agent · CRM · Workflow Automation`],
      [],
      ['#', 'Business Name', 'Rating', 'Website Status', 'Tech Stack', 'AI/Automation', 'Chatbot', 'Online Booking', 'Priority', 'Best Service Pitch', 'Email', 'Phone', 'Domain'],
      ...auditRows,
    ]

    const wsAudit = XLSX.utils.aoa_to_sheet(auditData)
    wsAudit['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    ]
    styleSheet(wsAudit, ['A','B','C','D','E','F','G','H','I','J','K','L','M'], auditRows.length, 'A1', 'A2')
    auditRows.forEach((row, i) => {
      const cell = wsAudit[`I${5 + i}`]
      if (cell) cell.s = getPriorityStyle(row[8])
    })
    wsAudit['!cols'] = [
      { wch: 4 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 22 },
      { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 10 },
      { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 22 },
    ]
    wsAudit['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 6 }, { hpt: 22 }]

    // ════════════════════════════════════════
    // SHEET 2 — Email Scripts (all scout leads)
    // ════════════════════════════════════════
    const emailRows = scoutRows.map((row, i) => [i + 1, row[1], row[6], '', '', ''])

    const emailData = [
      ['ICM — Outreach Email Scripts | HOT Leads | Batch 1'],
      ['Tone: Friendly & Conversational | Personalised per practice | From: Erum @ Insight Crafts Marketing'],
      [],
      ['#', 'Business', 'Priority', 'Subject Line', 'Email Body', 'Notes'],
      ...emailRows,
    ]

    const wsEmail = XLSX.utils.aoa_to_sheet(emailData)
    wsEmail['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    ]
    styleSheet(wsEmail, ['A','B','C','D','E','F'], emailRows.length, 'A1', 'A2')
    emailRows.forEach((row, i) => {
      const cell = wsEmail[`C${5 + i}`]
      if (cell) cell.s = getPriorityStyle(row[2])
    })
    wsEmail['!cols'] = [{ wch: 4 }, { wch: 22 }, { wch: 10 }, { wch: 35 }, { wch: 70 }, { wch: 30 }]
    wsEmail['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 6 }, { hpt: 22 }]

    // ════════════════════════════════════════
    // SHEET 3 — Outreach Tracker (all scout leads)
    // ════════════════════════════════════════
    const trackerRows = scoutRows.map((row, i) => [i + 1, row[1], row[6], '', '', '—', '—', '—', '—', 'Not Started', '—'])

    const trackerData = [
      ['ICM — Outreach Campaign Tracker | Birmingham Dental Practices'],
      ['Update this tracker after every outreach action. Target: HOT leads first, then WARM leads.'],
      [],
      ['#', 'Business Name', 'Priority', 'Contact Name', 'Email', 'Date Sent', 'Follow Up 1', 'Follow Up 2', 'Response', 'Status', 'Notes'],
      ...trackerRows,
    ]

    const wsTracker = XLSX.utils.aoa_to_sheet(trackerData)
    wsTracker['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    ]
    styleSheet(wsTracker, ['A','B','C','D','E','F','G','H','I','J','K'], trackerRows.length, 'A1', 'A2')
    trackerRows.forEach((row, i) => {
      const cell = wsTracker[`C${5 + i}`]
      if (cell) cell.s = getPriorityStyle(row[2])
    })
    wsTracker['!cols'] = [
      { wch: 4 }, { wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 28 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 20 },
    ]
    wsTracker['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 6 }, { hpt: 22 }]

    // ════════════════════════════════════════
    // SHEET 0 — Niche Scout
    // ════════════════════════════════════════
    const parseScoutLeads = (text) => {
      const blocks = text.split(/LEAD\s+\d+/i).filter(b => b.trim())
      return blocks.map((block, i) => {
        const get = (key) => {
          const m = block.match(new RegExp(key + '[:\\s]+([^\\n]+)', 'i'))
          return m ? m[1].replace(/={3,}/g, '').trim() : ''
        }
        return [
          i + 1,
          get('BUSINESS NAME'),
          get('LOCATION'),
          get('ESTIMATED WEBSITE'),
          get('NICHE'),
          get('WHY THEY NEED AI AUTOMATION'),
          get('PRIORITY'),
        ]
      })
    }

    const scoutRows = parseScoutLeads(scoutOut)

    const scoutData = [
      ['ICM — Niche Scout Results | AI Lead Discovery'],
      [`Scout Date: ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} | Powered by Claude AI | Agent: Niche Scout`],
      [],
      ['#', 'Business Name', 'Location', 'Estimated Website', 'Niche', 'Why They Need AI Automation', 'Priority'],
      ...scoutRows,
    ]

    const wsScout = XLSX.utils.aoa_to_sheet(scoutData)
    wsScout['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ]
    styleSheet(wsScout, ['A','B','C','D','E','F','G'], scoutRows.length, 'A1', 'A2')
    scoutRows.forEach((row, i) => {
      if (wsScout[`G${5 + i}`]) wsScout[`G${5 + i}`].s = getPriorityStyle(row[6])
    })
    wsScout['!cols'] = [
      { wch: 4 }, { wch: 25 }, { wch: 22 }, { wch: 28 },
      { wch: 22 }, { wch: 55 }, { wch: 10 },
    ]
    wsScout['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 6 }, { hpt: 22 }]

    // ════════════════════════════════════════
    // SHEET — Lead Scoring
    // ════════════════════════════════════════
    const scorerBiz       = extract(scorerOut, /BUSINESS[:\s]+(.+)/i)
    const auditScore      = extract(scorerOut, /OVERALL AUDIT SCORE[:\s]+(.+)/i)
    const priorityScore   = extract(scorerOut, /PRIORITY SCORE[:\s]+(.+)/i)
    const leadGrade       = extract(scorerOut, /LEAD GRADE[:\s]+(.+)/i)
    const painPoints      = (() => {
      const m = scorerOut.match(/PAIN POINTS TO LEAD WITH[:\s\n]+([\s\S]+?)(?=RECOMMENDED SERVICE:|$)/i)
      return m ? m[1].trim() : ''
    })()
    const recService      = (() => {
      const m = scorerOut.match(/RECOMMENDED SERVICE[:\s\n]+([\s\S]+?)(?=OUTREACH ANGLE:|$)/i)
      return m ? m[1].trim() : ''
    })()
    const outreachAngle   = extract(scorerOut, /OUTREACH ANGLE[:\s\n]+"?([\s\S]+?)"?(?=\n[A-Z]|$)/i)
    const monthlyValue    = extract(scorerOut, /ESTIMATED MONTHLY VALUE[:\s]+(.+)/i)
    const salesNotes      = (() => {
      const m = scorerOut.match(/NOTES FOR SALES CALL[:\s\n]+([\s\S]+?)$/i)
      return m ? m[1].trim() : ''
    })()

    const gradeStyle = (g = '') => {
      if (g.startsWith('A')) return { fill: { patternType: 'solid', fgColor: { rgb: 'D4EDDA' } }, font: { bold: true, color: { rgb: '155724' }, sz: 11 }, alignment: { horizontal: 'center' } }
      if (g.startsWith('B')) return { fill: { patternType: 'solid', fgColor: { rgb: 'FFF3CD' } }, font: { bold: true, color: { rgb: '856404' }, sz: 11 }, alignment: { horizontal: 'center' } }
      return { fill: { patternType: 'solid', fgColor: { rgb: 'F8D7DA' } }, font: { bold: true, color: { rgb: '721C24' }, sz: 11 }, alignment: { horizontal: 'center' } }
    }

    // Build scorer rows: first row from actual scorer output, rest from scout leads
    const scorerRows = scoutRows.map((row, i) => {
      if (i === 0) {
        return [i + 1, scorerBiz || row[1], auditScore, priorityScore, leadGrade, painPoints, recService, outreachAngle, monthlyValue, salesNotes]
      }
      return [i + 1, row[1], '', '', '', '', '', '', '', '']
    })

    const scoringData = [
      ['ICM — Lead Scoring Report | AI Automation Opportunity'],
      [`Scored: ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} | Powered by Claude AI | Agent: Lead Scorer`],
      [],
      ['#', 'Business Name', 'Audit Score', 'Priority Score', 'Lead Grade', 'Pain Points', 'Recommended Service', 'Outreach Angle', 'Est. Monthly Value', 'Sales Call Notes'],
      ...scorerRows,
    ]

    const wsScorer = XLSX.utils.aoa_to_sheet(scoringData)
    wsScorer['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ]
    styleSheet(wsScorer, ['A','B','C','D','E','F','G','H','I','J'], scorerRows.length, 'A1', 'A2')
    if (wsScorer['E5']) wsScorer['E5'].s = gradeStyle(leadGrade)
    wsScorer['!cols'] = [
      { wch: 4 },  // #
      { wch: 25 }, // Business Name
      { wch: 14 }, // Audit Score
      { wch: 14 }, // Priority Score
      { wch: 12 }, // Lead Grade
      { wch: 50 }, // Pain Points
      { wch: 30 }, // Recommended Service
      { wch: 50 }, // Outreach Angle
      { wch: 22 }, // Monthly Value
      { wch: 55 }, // Sales Notes
    ]
    wsScorer['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 6 }, { hpt: 22 }, { hpt: 100 }]

    // ════════════════════════════════════════
    // BUILD WORKBOOK
    // ════════════════════════════════════════
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsScout,   '🔍 Niche Scout')
    XLSX.utils.book_append_sheet(wb, wsAudit,   '📋 Lead Audit')
    XLSX.utils.book_append_sheet(wb, wsScorer,  '🎯 Lead Scoring')
    XLSX.utils.book_append_sheet(wb, wsEmail,   '✉ Email Scripts')
    XLSX.utils.book_append_sheet(wb, wsTracker, '📊 Outreach Tracker')

    const fileName = `ICM_Dental_Outreach_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const importFromPrev = () => {
    const prevAgent = AGENTS[activeIdx - 1]
    if (prevAgent && outputs[prevAgent.id]) {
      setInputs(prev => ({ ...prev, [activeId]: outputs[prevAgent.id] }))
    }
  }

  const prevAgent = activeIdx > 0 ? AGENTS[activeIdx - 1] : null
  const canImport = prevAgent && outputs[prevAgent.id]
  const hasOutput = !!outputs[activeId]
  const isLoading = !!loading[activeId]
  const doneCount = AGENTS.filter(a => outputs[a.id]).length

  return (
    <div className={styles.shell}>

      {/* ── SIDEBAR ── */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}>⬡</div>
          {!collapsed && (
            <div>
              <div className={styles.logoName}>LeadLens</div>
              <div className={styles.logoTagline}>AI-Powered Lead Intelligence</div>
            </div>
          )}
        </div>

        {!collapsed && <div className={styles.navSection}>MAIN</div>}
        <nav className={styles.navGroup}>
          {NAV_MAIN.map(n => (
            <button key={n.label} className={styles.navItem}>
              <span className={styles.navIcon}>{n.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{n.label}</span>}
            </button>
          ))}
        </nav>

        {!collapsed && <div className={styles.navSection}>AI AGENTS</div>}
        <nav className={styles.navGroup}>
          {AGENTS.map((a) => (
            <button
              key={a.id}
              className={`${styles.agentItem} ${activeId === a.id ? styles.agentItemActive : ''}`}
              onClick={() => setActiveId(a.id)}
            >
              <span className={styles.agentItemIcon}>{AGENT_ICONS[a.id]}</span>
              {!collapsed && (
                <>
                  <span className={styles.agentItemLabel}>{a.label}</span>
                  {outputs[a.id] && <span className={styles.agentDone}>✓</span>}
                </>
              )}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <>
            <div className={styles.navSection}>PIPELINE</div>
            <div className={styles.pipelineList}>
              {AGENTS.map(a => (
                <div key={a.id} className={styles.pipelineRow}>
                  <div className={`${styles.pipelineDot} ${outputs[a.id] ? styles.pipelineDotDone : ''}`} />
                  <span className={`${styles.pipelineLabel} ${activeId === a.id ? styles.pipelineLabelActive : ''}`}>{a.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={styles.sidebarBottom}>
          {!collapsed && (
            <nav className={styles.navGroup}>
              {NAV_BOTTOM.map(n => (
                <button key={n.label} className={styles.navItem}>
                  <span className={styles.navIcon}>{n.icon}</span>
                  <span className={styles.navLabel}>{n.label}</span>
                </button>
              ))}
            </nav>
          )}
          {!collapsed && (
            <button className={styles.upgradeBtn}>
              <span>✦</span> Upgrade Plan
            </button>
          )}
          <button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '›' : '‹'} {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className={styles.main}>

        {/* Top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.agentPill}>
              <span>{AGENT_ICONS[activeId]}</span>
              <span>Agent: {active.label}</span>
              <span className={styles.pillChevron}>▾</span>
            </div>
            <div className={styles.stepPill}>Step {activeIdx + 1} of {AGENTS.length}</div>
          </div>
          <div className={styles.topbarCenter}>
            <div className={styles.searchBar}>
              <span className={styles.searchIcon}>⌕</span>
              <span className={styles.searchPlaceholder}>Search anything...</span>
              <span className={styles.searchKbd}>Ctrl K</span>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.creditsBadge}>
              <span>⚡</span>
              <span>12,450 Credits</span>
            </div>
            <button className={styles.iconBtn}>☀</button>
            <button className={styles.iconBtn}>🔔</button>
            <div className={styles.userChip}>
              <div className={styles.userAvatar}>EN</div>
              <div>
                <div className={styles.userName}>Erum Naz</div>
                <div className={styles.userRole}>AI Automation</div>
              </div>
              <span className={styles.pillChevron}>▾</span>
            </div>
          </div>
        </header>

        {/* Pipeline stepper */}
        <div className={styles.stepper}>
          {AGENTS.map((a, i) => (
            <div key={a.id} className={styles.stepperItem} onClick={() => setActiveId(a.id)}>
              <div className={`${styles.stepperDot} ${i === activeIdx ? styles.stepperDotActive : ''} ${outputs[a.id] ? styles.stepperDotDone : ''}`}>
                {outputs[a.id] ? '✓' : i + 1}
              </div>
              {i < AGENTS.length - 1 && <div className={`${styles.stepperLine} ${outputs[a.id] ? styles.stepperLineDone : ''}`} />}
              <span className={`${styles.stepperLabel} ${i === activeIdx ? styles.stepperLabelActive : ''}`}>{a.label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>

          {/* Agent header */}
          <div className={styles.agentHeader}>
            <div className={styles.agentIconWrap}>
              <span className={styles.agentIconLarge}>{AGENT_ICONS[activeId]}</span>
            </div>
            <div>
              <h1 className={styles.agentTitle}>{active.label} <span className={styles.agentSpark}>✦</span></h1>
              <p className={styles.agentDesc}>{active.desc} · Claude AI</p>
            </div>
          </div>

          {/* Two column layout */}
          <div className={styles.columns}>

            {/* INPUT */}
            <div className={styles.inputCol}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardIcon}>▤</span>
                  <span className={styles.cardTitle}>INPUT</span>
                </div>
                <textarea
                  className={styles.textarea}
                  value={inputs[activeId]}
                  onChange={e => setInputs(prev => ({ ...prev, [activeId]: e.target.value }))}
                  placeholder={active.placeholder}
                />
                <div className={styles.charCount}>{inputs[activeId].length.toLocaleString()} / 25,000 characters</div>
                <button
                  className={styles.runBtn}
                  onClick={runAgent}
                  disabled={isLoading || !inputs[activeId].trim()}
                >
                  {isLoading ? (
                    <><span className={styles.spinner} /> Analysing...</>
                  ) : (
                    <><span>⚡</span> {active.btnLabel}<br /><span className={styles.runSub}>Analyse with Claude AI</span></>
                  )}
                </button>
                <div className={styles.tipBox}>
                  <span className={styles.tipIcon}>💡</span>
                  <div>
                    <div className={styles.tipLabel}>TIP</div>
                    <div className={styles.tipText}>{active.tip}</div>
                  </div>
                </div>
                {canImport && (
                  <div className={styles.importBox}>
                    <div className={styles.importLeft}>
                      <div className={styles.importTitle}>IMPORT FROM PREVIOUS AGENT:</div>
                      <div className={styles.importDesc}>Use the {prevAgent.label} results.</div>
                    </div>
                    <button className={styles.importBtn} onClick={importFromPrev}>
                      ↓ Import
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* OUTPUT */}
            <div className={styles.outputCol}>

              {/* ── Pass to next — NOW AT TOP ── */}
              {hasOutput && (
                <div className={styles.passToRow}>
                  <span className={styles.passToLabel}>Pass to →</span>
                  {AGENTS.filter(a => a.id !== activeId).map(a => (
                    <button key={a.id} className={styles.passToBtn}
                      onClick={() => { setActiveId(a.id); setInputs(prev => ({ ...prev, [a.id]: outputs[activeId] })) }}>
                      {AGENT_ICONS[a.id]} {a.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Output card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardIcon}>↗</span>
                  <span className={styles.cardTitle}>OUTPUT</span>
                  {hasOutput && (
                    <div className={styles.outputActions}>
                      <button className={styles.outBtn} onClick={copyOutput}>
                        {copied === activeId ? '✓ Copied' : '⎘ Copy'}
                      </button>
                      <button className={styles.outBtn} onClick={exportToExcel}>📥 Export to Excel</button>
                    </div>
                  )}
                </div>

                <div className={styles.outputBody}>
                  {isLoading ? (
                    <div className={styles.loadingState}>
                      <div className={styles.loadRing} />
                      <div className={styles.loadText}>Claude is analysing...</div>
                      <div className={styles.loadSub}>This usually takes 5–15 seconds</div>
                    </div>
                  ) : hasOutput ? (
                    <pre className={styles.outputText}>{outputs[activeId]}</pre>
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIconWrap}>
                        <span className={styles.emptyIconLarge}>{AGENT_ICONS[activeId]}</span>
                      </div>
                      <div className={styles.emptyTitle}>{empty.title}</div>
                      <div className={styles.emptyDesc}>{empty.desc}</div>
                      <div className={styles.emptyChecks}>
                        <div className={styles.emptyChecksLabel}>You'll get:</div>
                        {empty.checks.map(c => (
                          <div key={c} className={styles.emptyCheck}>
                            <span className={styles.checkIcon}>✓</span> {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.outputFooter}>
                  <div className={styles.outputFooterLeft}>
                    <span className={styles.aiBadge}>AI</span>
                    Powered by Claude Sonnet
                  </div>
                  <div className={styles.outputFooterRight}>
                    <span>🔒</span> Secure & Private
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Suggestions row */}
          <div className={styles.suggestionsRow}>
            <div className={styles.suggestionsCard}>
              <div className={styles.suggestionsTitle}>✦ AI SUGGESTIONS</div>
              <div className={styles.suggestions}>
                {['Focus on high DR sites', 'Check traffic growth', 'Look for contact pages', 'Analyse backlink quality'].map(s => (
                  <button key={s} className={styles.suggestionChip}
                    onClick={() => setInputs(prev => ({ ...prev, [activeId]: s }))}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.recentCard}>
              <div className={styles.suggestionsTitle}>⏱ RECENT SCORES</div>
              {doneCount === 0 ? (
                <div className={styles.recentEmpty}>
                  <div className={styles.recentEmptyTitle}>No recent scores yet</div>
                  <div className={styles.recentEmptyDesc}>Your scored leads will appear here</div>
                </div>
              ) : (
                <div className={styles.recentEmpty}>
                  <div className={styles.recentEmptyTitle}>{doneCount} agent{doneCount > 1 ? 's' : ''} completed</div>
                  <div className={styles.recentEmptyDesc}>Pipeline is {Math.round((doneCount / 5) * 100)}% complete</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
