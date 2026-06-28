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

  // Split scout output into individual lead blocks
  const splitLeads = (text) => {
    const lines = text.split("
")
    const leads = []
    let current = []
    for (const line of lines) {
      if (/^LEAD d+/.test(line.trim()) && current.length > 0) {
        leads.push(current.join('
'))
        current = []
      }
        current.push(line)
      }
    }
    if (current.length > 0) leads.push(current.join('
'))
    return leads.filter(b => /BUSINESS NAME/.test(b))
  }

  // Agents that should process each lead individually
  const BULK_AGENTS = ['auditor', 'scorer', 'outreach']

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
      // For bulk agents, split into individual leads and process each one
      if (BULK_AGENTS.includes(activeId)) {
        const leads = splitLeads(input)

        if (leads.length > 1) {
          // Process each lead individually and combine results
          let combined = ''
          for (let i = 0; i < leads.length; i++) {
            const lead = leads[i]
            setOutputs(prev => ({ ...prev, [activeId]: prev[activeId] + `\n⏳ Processing lead ${i + 1} of ${leads.length}...\n` }))
            const result = await callClaude(SYSTEM_PROMPTS[activeId], lead)
            combined += result + '\n\n---\n\n'
            setOutputs(prev => ({ ...prev, [activeId]: combined }))
          }
        } else {
          // Single lead — normal call
          const result = await callClaude(SYSTEM_PROMPTS[activeId], input)
          setOutputs(prev => ({ ...prev, [activeId]: result }))
        }
      } else {
        // Scout, Tracker — single API call as normal
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
      const scoutOut    = outputs['scout']    || ''
      const auditorOut  = outputs['auditor']  || ''
      const scorerOut   = outputs['scorer']   || ''
      const outreachOut = outputs['outreach'] || ''

      // ── Generic single-line extractor ──
      const get = (text, key) => {
        try { if(!text) return ''; const m = text.match(new RegExp(key + '[:\\s]+([^\n]+)', 'i')); return (m&&m[1]) ? m[1].replace(/[=#*]+/g,'').trim() : ''} catch(e){return ''}
      }

      // ── Multi-line block extractor ──
      const getBlock = (text, startKey, endKey) => {
        const m = text.match(new RegExp(startKey + '[:\\s\\n]+([\\s\\S]+?)(?=' + endKey + '|$)', 'i'))
        return (m && m[1]) ? m[1].trim() : ''
      }

      // ════════════════════════════════
      // PARSE: Niche Scout
      // Format: LEAD 1 \n============ \n BUSINESS NAME: ...
      // ════════════════════════════════
      const parseScout = (text) => {
        const blocks = text.split(/(?:^|\n)LEAD\s+\d+/i).filter(b => b.trim())
        return blocks.map((block, i) => ({
          num:      i + 1,
          bizName:  get(block, 'BUSINESS NAME'),
          location: get(block, 'LOCATION'),
          website:  get(block, 'ESTIMATED WEBSITE'),
          niche:    get(block, 'NICHE'),
          whyAI:    get(block, 'WHY THEY NEED AI AUTOMATION'),
          priority: get(block, 'PRIORITY'),
        })).filter(r => r.bizName)
      }

      // ════════════════════════════════
      // PARSE: Website Auditor
      // Format: BUSINESS: X \n WEBSITE: X \n OVERALL SCORE: X ...
      // Handles multiple leads if pasted together
      // ════════════════════════════════
      const parseAuditor = (text) => {
        const blocks = text.split(/(?:^|\n)(?:#+\s*)?(?:LEAD\s+\d+|BUSINESS:)/i)
        const results = []
        // re-add the BUSINESS: prefix we split on
        const raw = text.match(/BUSINESS:[^\n]+[\s\S]*?(?=BUSINESS:|$)/gi) || [text]
        raw.filter(b => b && b.trim()).forEach((block, i) => {
          results.push({
            num:          i + 1,
            bizName:      get(block, 'BUSINESS'),
            website:      get(block, 'WEBSITE'),
            overallScore: get(block, 'OVERALL SCORE'),
            seo:          get(block, 'SEO[^:]*'),
            speed:        get(block, 'Speed[^:]*'),
            leadCap:      get(block, 'Lead Capture'),
            aiAuto:       get(block, 'AI[^:]*'),
            socialProof:  get(block, 'Social Proof'),
            content:      get(block, 'Content Quality'),
            weaknesses:   getBlock(block, 'TOP 3 WEAKNESSES', 'OPPORTUNITY|ICM OPPORTUNITY|LEAD TEMP'),
            opportunity:  getBlock(block, 'OPPORTUNITY|ICM OPPORTUNITY', 'LEAD TEMP'),
            leadTemp:     get(block, 'LEAD TEMPERATURE'),
          })
        })
        return results.filter(r => r.bizName)
      }

      // ════════════════════════════════
      // PARSE: Lead Scorer
      // Format: LEAD SCORING REPORT \n BUSINESS: X ...
      // ════════════════════════════════
      const parseScorer = (text) => {
        // Split on multiple reports if present
        const blocks = text.split(/LEAD SCORING REPORT/i).filter(b => b.trim())
        return blocks.map((block, i) => ({
          num:          i + 1,
          bizName:      get(block, 'BUSINESS'),
          auditScore:   get(block, 'OVERALL AUDIT SCORE'),
          priorityScore:get(block, 'PRIORITY SCORE'),
          grade:        get(block, 'LEAD GRADE'),
          painPoints:   getBlock(block, 'PAIN POINTS TO LEAD WITH', 'RECOMMENDED SERVICE'),
          service:      getBlock(block, 'RECOMMENDED SERVICE', 'OUTREACH ANGLE'),
          angle:        get(block, 'OUTREACH ANGLE'),
          value:        get(block, 'ESTIMATED MONTHLY VALUE'),
          notes:        getBlock(block, 'NOTES FOR SALES CALL', '$$$'),
        })).filter(r => r.bizName)
      }

      // ════════════════════════════════
      // PARSE: Outreach Writer
      // Format: OUTREACH PACK \n BUSINESS: X \n --- EMAIL --- ...
      // ════════════════════════════════
      const parseOutreach = (text) => {
        const blocks = text.split(/OUTREACH PACK/i).filter(b => b.trim())
        return blocks.map((block, i) => ({
          num:       i + 1,
          bizName:   get(block, 'BUSINESS'),
          grade:     get(block, 'GRADE'),
          service:   get(block, 'SERVICE'),
          subject:   get(block, 'Subject'),
          email:     getBlock(block, '--- EMAIL ---', '--- LINKEDIN'),
          linkedin:  getBlock(block, '--- LINKEDIN DM ---', '--- INSTAGRAM'),
          instagram: getBlock(block, '--- INSTAGRAM DM ---', '--- FOLLOW UP'),
          followup:  getBlock(block, '--- FOLLOW UP', '$$$'),
        })).filter(r => r.bizName)
      }

      // Run all parsers
      const scoutLeads    = parseScout(scoutOut)
      const auditorLeads  = parseAuditor(auditorOut)
      const scorerLeads   = parseScorer(scorerOut)
      const outreachLeads = parseOutreach(outreachOut)

      // Use scout as base list — fallback to auditor biz names if no scout
      const baseLeads = scoutLeads.length > 0 ? scoutLeads : auditorLeads.map(a => ({
        num: a.num, bizName: a.bizName, location: '', website: a.website,
        niche: '', whyAI: '', priority: a.leadTemp,
      }))

      const date = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

      // ════════════════════════════════
      // SHEET 1 — Niche Scout
      // ════════════════════════════════
      const scoutSheet = [
        ['ICM — Niche Scout Results | AI Lead Discovery'],
        [`Scout Date: ${date} | Powered by Claude AI | Agent: Niche Scout`],
        [],
        ['#', 'Business Name', 'Location', 'Estimated Website', 'Niche', 'Why They Need AI Automation', 'Priority'],
        ...scoutLeads.map(r => [r.num, r.bizName, r.location, r.website, r.niche, r.whyAI, r.priority]),
      ]

      // ════════════════════════════════
      // SHEET 2 — Lead Audit
      // Pull from auditor output; fill remaining from scout
      // ════════════════════════════════
      const auditMap = {}
      auditorLeads.forEach(a => { auditMap[a.bizName.toLowerCase()] = a })

      const auditSheet = [
        ['ICM — AI Automation Lead Audit | Birmingham Dental Practices'],
        [`Batch 1 of ? | Audit Date: ${date} | Services: AI Chatbot · AI Voice Agent · CRM · Workflow Automation`],
        [],
        ['#', 'Business Name', 'Website', 'Overall Score', 'SEO', 'Speed', 'Lead Capture', 'AI & Auto', 'Social Proof', 'Content', 'Top Weaknesses', 'Opportunity', 'Lead Temp'],
        ...baseLeads.map((lead, i) => {
          const a = auditMap[lead.bizName.toLowerCase()] || auditorLeads[i] || {}
          return [
            i + 1,
            lead.bizName,
            a.website || lead.website || '',
            a.overallScore || '',
            a.seo || '',
            a.speed || '',
            a.leadCap || '',
            a.aiAuto || '',
            a.socialProof || '',
            a.content || '',
            a.weaknesses || '',
            a.opportunity || '',
            a.leadTemp || lead.priority || '',
          ]
        }),
      ]

      // ════════════════════════════════
      // SHEET 3 — Lead Scoring
      // ════════════════════════════════
      const scorerMap = {}
      scorerLeads.forEach(s => { scorerMap[s.bizName.toLowerCase()] = s })

      const scoringSheet = [
        ['ICM — Lead Scoring Report | AI Automation Opportunity'],
        [`Scored: ${date} | Powered by Claude AI | Agent: Lead Scorer`],
        [],
        ['#', 'Business Name', 'Audit Score', 'Priority Score', 'Lead Grade', 'Pain Points', 'Recommended Service', 'Outreach Angle', 'Est. Monthly Value', 'Sales Call Notes'],
        ...baseLeads.map((lead, i) => {
          const s = scorerMap[lead.bizName.toLowerCase()] || scorerLeads[i] || {}
          return [
            i + 1,
            lead.bizName,
            s.auditScore || '',
            s.priorityScore || '',
            s.grade || '',
            s.painPoints || '',
            s.service || '',
            s.angle || '',
            s.value || '',
            s.notes || '',
          ]
        }),
      ]

      // ════════════════════════════════
      // SHEET 4 — Email Scripts
      // ════════════════════════════════
      const outreachMap = {}
      outreachLeads.forEach(o => { outreachMap[o.bizName.toLowerCase()] = o })

      const emailSheet = [
        ['ICM — Outreach Email Scripts | HOT Leads | Batch 1'],
        ['Tone: Friendly & Conversational | Personalised per practice | From: Erum @ Insight Crafts Marketing'],
        [],
        ['#', 'Business', 'Grade', 'Subject Line', 'Email Body', 'LinkedIn DM', 'Instagram DM', 'Follow Up'],
        ...baseLeads.map((lead, i) => {
          const o = outreachMap[lead.bizName.toLowerCase()] || outreachLeads[i] || {}
          return [
            i + 1,
            lead.bizName,
            o.grade || '',
            o.subject || '',
            o.email || '',
            o.linkedin || '',
            o.instagram || '',
            o.followup || '',
          ]
        }),
      ]

      // ════════════════════════════════
      // SHEET 5 — Outreach Tracker
      // ════════════════════════════════
      const trackerSheet = [
        ['ICM — Outreach Campaign Tracker | Birmingham Dental Practices'],
        ['Update this tracker after every outreach action. Target: HOT leads first, then WARM leads.'],
        [],
        ['#', 'Business Name', 'Priority', 'Contact Name', 'Email', 'Date Sent', 'Follow Up 1', 'Follow Up 2', 'Response', 'Status', 'Notes'],
        ...baseLeads.map((lead, i) => {
          const a = auditMap[lead.bizName.toLowerCase()] || {}
          const s = scorerMap[lead.bizName.toLowerCase()] || {}
          return [
            i + 1,
            lead.bizName,
            lead.priority || a.leadTemp || '',
            '',
            '',
            '—', '—', '—', '—',
            'Not Started',
            '—',
          ]
        }),
      ]

      // ════════════════════════════════
      // BUILD WORKBOOK
      // ════════════════════════════════
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scoutSheet),   '🔍 Niche Scout')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(auditSheet),   '📋 Lead Audit')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scoringSheet), '🎯 Lead Scoring')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(emailSheet),   '✉ Email Scripts')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trackerSheet), '📊 Outreach Tracker')

      const fileName = `ICM_LeadLens_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, fileName)

    } catch(err) {
      alert('Export error: ' + err.message)
    }
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
