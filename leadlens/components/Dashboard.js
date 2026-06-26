'use client'
import { useState } from 'react'
import { AGENTS, SYSTEM_PROMPTS } from '../lib/agents'
import styles from './Dashboard.module.css'

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
                      <button className={styles.outBtn}>📊 Save to Sheets</button>
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
