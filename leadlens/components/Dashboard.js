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

    const callClaude = async (system, message) => {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, message }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.result || ''
  }

  const runAgent = async () => {
    const input = inputs[activeId]
    if (!input.trim() || loading[activeId]) return
    setLoading(prev => ({ ...prev, [activeId]: true }))
    setOutputs(prev => ({ ...prev, [activeId]: '' }))
    try {
      // For outreach writer, split table into batches of 3 rows to avoid token limits
      if (activeId === 'outreach') {
        const nl = String.fromCharCode(10)
        const lines = input.split(nl)
        const headerLines = lines.filter(l => l.trim().startsWith('|') && (lines.indexOf(l) <= 1 || /^[|\s\-:]+$/.test(l.trim())))
        const dataLines = lines.filter(l => l.trim().startsWith('|') && !/^[|\s\-:]+$/.test(l.trim()))
        const headerRow = dataLines[0] || ''
        const dataRows = dataLines.slice(1)

        if (dataRows.length > 3) {
          // Process in batches of 3
          let allResults = ''
          let firstHeader = true
          for (let i = 0; i < dataRows.length; i += 3) {
            const batch = dataRows.slice(i, i + 3)
            const batchInput = headerRow + nl + batch.join(nl)
            setOutputs(prev => ({ ...prev, [activeId]: prev[activeId] + nl + '⏳ Processing leads ' + (i+1) + '-' + Math.min(i+3, dataRows.length) + '...' + nl }))
            const result = await callClaude(SYSTEM_PROMPTS[activeId], batchInput)
            // For first batch keep header, for subsequent batches skip header row
            const resultLines = result.split(nl)
            if (firstHeader) {
              allResults += result + nl
              firstHeader = false
            } else {
              const dataOnly = resultLines.filter(l => l.trim().startsWith('|') && !/^[|\s\-:]+$/.test(l.trim())).slice(1)
              allResults += dataOnly.join(nl) + nl
            }
            setOutputs(prev => ({ ...prev, [activeId]: allResults }))
          }
        } else {
          const result = await callClaude(SYSTEM_PROMPTS[activeId], input)
          setOutputs(prev => ({ ...prev, [activeId]: result }))
        }
      } else {
        const result = await callClaude(SYSTEM_PROMPTS[activeId], input)
        setOutputs(prev => ({ ...prev, [activeId]: result }))
      }
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
    try {
      // ── Parse markdown table helper ──
      const parseTable = (text) => {
        if (!text) return []
        const lines = text.split(String.fromCharCode(10))
        const rows = []
        let headerCols = 0
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line.startsWith('|')) continue
          if (/^[|\s\-:]+$/.test(line)) continue
          const cells = line.split('|').map(function(c) { return c.trim() }).filter(function(c, idx, arr) { return idx > 0 && idx < arr.length - 1 })
          if (cells.length < 2) continue
          // First valid row sets expected column count
          if (headerCols === 0) {
            headerCols = cells.length
            rows.push(cells)
          } else if (cells.length >= headerCols) {
            // If too many cells (pipe in content), merge extra cells into last column
            if (cells.length > headerCols) {
              const merged = cells.slice(0, headerCols - 1)
              merged.push(cells.slice(headerCols - 1).join(' '))
              rows.push(merged)
            } else {
              rows.push(cells)
            }
          }
        }
        return rows
      }

      const scoutRows    = parseTable(outputs['scout']    || '')
      const auditorRows  = parseTable(outputs['auditor']  || '')
      const scorerRows   = parseTable(outputs['scorer']   || '')
      const outreachRows = parseTable(outputs['outreach'] || '')

      // Skip header row (first row is headers)
      const scoutData    = scoutRows.length   > 1 ? scoutRows.slice(1)    : []
      const auditorData  = auditorRows.length > 1 ? auditorRows.slice(1)  : []
      const scorerData   = scorerRows.length  > 1 ? scorerRows.slice(1)   : []
      const outreachData = outreachRows.length > 1 ? outreachRows.slice(1) : []

      const date = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

      // ── SHEET 1: Niche Scout ──
      const scoutSheet = [
        ['ICM — Niche Scout Results | AI Lead Discovery'],
        ['Scout Date: ' + date + ' | Powered by Claude AI | Agent: Niche Scout'],
        [],
        ['#', 'Business Name', 'Location', 'Estimated Website', 'Niche', 'Why They Need AI Automation', 'Priority'],
        ...scoutData,
      ]

      // ── SHEET 2: Lead Audit ──
      const auditSheet = [
        ['ICM — AI Automation Lead Audit | Birmingham Dental Practices'],
        ['Batch 1 of ? | Audit Date: ' + date + ' | Services: AI Chatbot · AI Voice Agent · CRM · Workflow Automation'],
        [],
        ['#', 'Business Name', 'Website', 'Overall Score', 'SEO', 'Speed', 'Lead Capture', 'AI & Auto', 'Social Proof', 'Content', 'Top Weakness', 'Lead Temp'],
        ...auditorData,
      ]

      // ── SHEET 3: Lead Scoring ──
      const scoringSheet = [
        ['ICM — Lead Scoring Report | AI Automation Opportunity'],
        ['Scored: ' + date + ' | Powered by Claude AI | Agent: Lead Scorer'],
        [],
        ['#', 'Business Name', 'Audit Score', 'Priority Score', 'Lead Grade', 'Pain Point', 'Recommended Service', 'Outreach Angle', 'Est. Monthly Value', 'Sales Note'],
        ...scorerData,
      ]

      // ── SHEET 4: Email Scripts ──
      const emailSheet = [
        ['ICM — Outreach Email Scripts | HOT Leads | Batch 1'],
        ['Tone: Friendly & Conversational | Personalised per practice | From: Erum @ Insight Crafts Marketing'],
        [],
        ['#', 'Business Name', 'Grade', 'Subject Line', 'Email Body', 'LinkedIn DM', 'Instagram DM', 'Follow Up Day 3'],
        ...outreachData,
      ]

      // ── SHEET 5: Outreach Tracker ──
      // Build from best available data
      const baseData = scoutData.length > 0 ? scoutData : auditorData
      const trackerRows = baseData.map(function(row, i) {
        return [i + 1, row[1] || '', row[6] || row[11] || '', '', '', '—', '—', '—', '—', 'Not Started', '—']
      })
      const trackerSheet = [
        ['ICM — Outreach Campaign Tracker | Birmingham Dental Practices'],
        ['Update this tracker after every outreach action. Target: HOT leads first, then WARM leads.'],
        [],
        ['#', 'Business Name', 'Priority', 'Contact Name', 'Email', 'Date Sent', 'Follow Up 1', 'Follow Up 2', 'Response', 'Status', 'Notes'],
        ...trackerRows,
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scoutSheet),   'Niche Scout')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(auditSheet),   'Lead Audit')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scoringSheet), 'Lead Scoring')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(emailSheet),   'Email Scripts')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trackerSheet), 'Outreach Tracker')

      const fileName = 'ICM_LeadLens_' + new Date().toISOString().slice(0, 10) + '.xlsx'
      XLSX.writeFile(wb, fileName)

    } catch(err) {
      alert('Export error: ' + err.message)
    }
  }

      // Render markdown table as HTML table
  const renderOutput = (text) => {
    if (!text) return null
    const lines = text.split(String.fromCharCode(10))
    const tableLines = lines.filter(l => l.trim().startsWith('|'))
    
    if (tableLines.length < 2) {
      return <pre className={styles.outputText}>{text}</pre>
    }

    const rows = tableLines
      .filter(l => !/^\|[\s\-:|]+\|/.test(l.trim()))
      .map(l => l.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1))

    if (rows.length === 0) return <pre className={styles.outputText}>{text}</pre>

    const headers = rows[0]
    const dataRows = rows.slice(1)

    return (
      <div style={{overflowX: 'auto', width: '100%'}}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: '12px',
          color: 'var(--text-primary, #e2e8f0)'
        }}>
          <thead>
            <tr style={{backgroundColor: 'var(--teal, #2AABB8)'}}>
              {headers.map((h, i) => (
                <th key={i} style={{
                  padding: '8px 10px', textAlign: 'left', fontWeight: 'bold',
                  color: '#fff', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.2)'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} style={{
                backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                {row.map((cell, ci) => {
                  const isPriority = headers[ci] === 'Priority' || headers[ci] === 'Lead Temp' || headers[ci] === 'Lead Grade'
                  const color = cell === 'HIGH' || cell === 'HOT' || cell === 'A' ? '#4ade80'
                    : cell === 'MEDIUM' || cell === 'WARM' || cell === 'B' ? '#fbbf24'
                    : cell === 'LOW' || cell === 'COLD' || cell === 'C' ? '#f87171' : null
                  return (
                    <td key={ci} style={{
                      padding: '7px 10px',
                      borderRight: '1px solid rgba(255,255,255,0.05)',
                      maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis',
                      color: (isPriority && color) ? color : 'inherit',
                      fontWeight: (isPriority && color) ? 'bold' : 'normal'
                    }} title={cell}>{cell}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
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
                    <div>{renderOutput(outputs[activeId])}</div>
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
