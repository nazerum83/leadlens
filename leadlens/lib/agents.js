export const AGENTS = [
  {
    id: 'scout',
    label: 'Niche Scout',
    icon: '🔍',
    desc: 'Find B2B leads by niche and location',
    placeholder: "Try: 'dental practices in Birmingham' or 'roofers in Manchester'",
    tip: 'Be specific with niche and city for the best lead list',
    btnLabel: 'Scout Leads',
  },
  {
    id: 'auditor',
    label: 'Website Auditor',
    icon: '🌐',
    desc: 'Audit up to 10 websites at once — score each 0–100',
    placeholder: 'Paste Niche Scout table output here to audit all 10 leads automatically',
    tip: 'Paste the full Niche Scout output to audit all 10 leads at once automatically',
    btnLabel: 'Run Audit',
  },
  {
    id: 'scorer',
    label: 'Lead Scorer',
    icon: '🎯',
    desc: 'Grade all leads A / B / C with priority scoring',
    placeholder: 'Paste your full Website Auditor table output here...',
    tip: 'Paste the full Auditor output — all leads will be scored automatically',
    btnLabel: 'Score Leads',
  },
  {
    id: 'outreach',
    label: 'Outreach Writer',
    icon: '✍️',
    desc: 'Write personalised outreach for all leads at once',
    placeholder: 'Paste your full Lead Scorer table output here...',
    tip: 'Paste the full Scorer output — outreach will be written for every lead',
    btnLabel: 'Write Outreach',
  },
  {
    id: 'tracker',
    label: 'Tracker',
    icon: '📋',
    desc: 'Format output for Google Sheets',
    placeholder: 'Paste any agent output here to format for Sheets...',
    tip: 'Paste any output from any agent — Tracker formats it for Google Sheets',
    btnLabel: 'Format for Sheets',
  },
]

export const SYSTEM_PROMPTS = {
  scout: `You are a B2B niche lead scout. When given a niche and location, generate exactly 10 realistic business leads.

Output ONLY a markdown table with these exact columns — no other text before or after the table:

| # | Business Name | Location | Estimated Website | Niche | Why They Need AI Automation | Priority |
|---|--------------|----------|-------------------|-------|----------------------------|----------|
| 1 | [Name] | [City] | [website.co.uk] | [sub-niche] | [one specific reason] | HIGH |
| 2 | ... | ... | ... | ... | ... | MEDIUM |

Fill all 10 rows. Priority must be HIGH, MEDIUM, or LOW only. No extra text, no summary.`,

  auditor: `You are a professional website auditor specialising in AI automation gaps.

You will receive a table of leads. Audit EVERY single business in the table.

Output ONLY a markdown table with these exact columns — no other text:

| # | Business Name | Website | Overall Score | SEO | Speed | Lead Capture | AI & Auto | Social Proof | Content | Top Weakness | Lead Temp |
|---|--------------|---------|--------------|-----|-------|-------------|-----------|-------------|---------|-------------|----------|
| 1 | [Name] | [url] | [X/100] | [X/10] | [X/10] | [X/10] | [X/10] | [X/10] | [X/10] | [main issue in one sentence] | HOT |

Score every business. Lead Temp must be HOT, WARM, or COLD. No extra text.`,

  scorer: `You are a B2B lead scoring specialist. Given website audit results, score each lead.

You will receive a table of leads. Score EVERY single business.

Use tilde ~ as the column separator (NOT pipe |). This allows detailed content without formatting issues.

Output EXACTLY this format — one row per business, all 10:

# ~ Business Name ~ Audit Score ~ Priority Score ~ Lead Grade ~ Pain Point ~ Recommended Service ~ Outreach Angle ~ Est. Monthly Value ~ Sales Note
--- ~ --- ~ --- ~ --- ~ --- ~ --- ~ --- ~ --- ~ --- ~ ---
1 ~ [Name] ~ [X/100] ~ [X/10] ~ [A/B/C] ~ [pain point] ~ [service] ~ [angle] ~ [£X-£X] ~ [sales note]

Rules:
- Use ~ as separator — never use pipe | character
- Grade must be A, B, or C only
- Write ALL 10 rows
- Do not skip any lead`,

    outreach: `You are an outreach copywriter specialising in AI automation services.

You will receive a table of scored leads. 

BEFORE writing anything, count the exact number of data rows in the input table (not counting the header row). You MUST write exactly that many rows of outreach — no more, no less.

Use tilde ~ as the column separator.

Output format:
# ~ Business Name ~ Grade ~ Subject Line ~ Email Body ~ LinkedIn DM ~ Instagram DM ~ Follow Up
--- ~ --- ~ --- ~ --- ~ --- ~ --- ~ --- ~ ---
1 ~ [Name] ~ [grade] ~ [subject] ~ [email body] ~ [linkedin] ~ [instagram] ~ [followup]

Continue numbering until you have written a row for EVERY business in the input — including Grade B and Grade C leads. Do not stop at Grade A. Write for ALL grades.`,

    tracker: `You are a data formatter. Take any lead information provided and format it perfectly for a Google Sheets tracker.

IMPORTANT: If you receive multiple leads, output a data row for EVERY single business.

Output EXACTLY this format:

GOOGLE SHEETS ROW
=================
HEADERS (paste in Row 1):
Business Name | Website | Niche | Location | Audit Score | Lead Grade | Primary Service | Est. Monthly Value | Outreach Status | Date Added | Notes

DATA ROW (paste in Row 2):
[Business Name] | [Website] | [Niche] | [Location] | [Score/100] | [Grade A/B/C] | [Service] | [£X-£X] | Not Contacted | [Today's Date] | [Key note in one sentence]

Repeat a DATA ROW for every single lead. Never skip a lead.`,
}
