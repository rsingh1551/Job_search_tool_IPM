#!/usr/bin/env node
// generate-resume.js — Tailors Rishabh Singh's resume per job using Claude Haiku.
// Usage: node generate-resume.js --auto      (score>=7 jobs without resume)
//        node generate-resume.js <job_id>    (specific job)
//
// Design: the full career (all roles + bullets) is FIXED factual data below.
// Claude only (a) rewrites the Summary, (b) picks/lightly rephrases 3 Highlights,
// and (c) reorders each role's REAL bullets so the JD-relevant ones lead.
// Claude never invents experience, metrics, roles, or bullet text.

const fs   = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const jobsPath    = path.join(__dirname, 'jobs.json');
const templatePath= path.join(__dirname, 'resume-template.html');
const resumesDir  = path.join(__dirname, 'resumes');

if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

// ── FIXED factual resume (source of truth — nothing here is ever invented by AI) ──
const CANDIDATE = {
  name:    'Rishabh Singh',
  email:   'rishabhs@icloud.com',
  phone:   '(312) 330-6260',
  website: 'www.rishabhs.me',
  location:'Los Angeles, CA · Open to Remote or Hybrid'
};

// Real highlights the model may choose from / lightly rephrase (metrics must stay intact).
const HIGHLIGHTS = [
  'Drove $15M year-one revenue and a 4.8 app rating for Okyo Garde by translating enterprise cybersecurity into intuitive consumer mobile experiences.',
  'Validated a $450M HP SMB services opportunity by launching an 8-week no-code MVP, securing 45 customers, completing 230 jobs, and proving operational scalability.',
  'Unlocked $22M incremental retail sales and 10K users by pivoting Bunnings from a failed marketplace into a SaaS workflow platform.',
  'Lifted subscription upgrades 25% and retention 32% via personalized in-app journeys and engagement tools at Palo Alto Networks.',
  'Created a $110M+ incremental opportunity at BCBSA by introducing a unified design system across 36 health plans.'
];

// All roles, in resume order. Bullets are verbatim and are NEVER rewritten by AI —
// Claude may only return a reordering (permutation) of each role's bullet indices.
const ROLES = [
  {
    company: 'Lvlon',
    dates:   '2024 – Present',
    title:   'Fractional Product Leader, SaaS & AI',
    desc:    'Advise early-stage SaaS and payments teams on product strategy, workflow design, GTM validation, and pilot readiness.',
    bullets: [
      'Unlocked a $27M incremental revenue opportunity by translating workflows into a self-serve product strategy.',
      'Advanced an AI concept from use-case definition to early UX, supporting customer validation and investor readiness.',
      'Accelerated payments observability pilots with 3 enterprise customers by refining positioning and GTM execution.'
    ]
  },
  {
    company: 'Palo Alto Networks',
    dates:   '2021 – 2024',
    title:   'Senior Principal Product Manager',
    desc:    'Joined as founding PM for the first consumer cybersecurity business, owning the multi-year app, platform, services, and GTM roadmap.',
    bullets: [
      'Generated $15M Y1 revenue and a 4.8 app rating on Okyo Garde, simplifying enterprise cybersecurity for consumers.',
      'Raised activation over 20% via UX-led onboarding redesign, experimentation, and real-time behavioral insights.',
      'Lifted subscription upgrades 25% and retention 32% via personalized in-app journeys and engagement tools.',
      'Created $11M incremental revenue by piloting a white-glove installation service across 3 U.S. cities.',
      'Drove $8M annual productivity gain by launching an AI Security Broker enabling secure GenAI access for 15K employees.',
      'Boosted marketing efficiency 12% and performance 50% by centralizing workflows in a new Campaign Excellence hub.'
    ]
  },
  {
    company: 'Boston Consulting Group – Digital Ventures',
    dates:   '2018 – 2021',
    title:   'Product Lead, Venture Build & Strategy',
    desc:    'Led product strategy for five venture-backed startups, taking ambiguous concepts from discovery through MVP, pilot validation, and commercialization.',
    bullets: [
      "Pivoted Bunnings' failed marketplace to SaaS, acquiring 10K tradie users and $22M incremental retail sales.",
      'Delivered $5M Y1 revenue for HP SMB IT services by validating a $450M market via an 8-week no-code MVP pilot.',
      'Secured 45 paying SMB clients and completed 230+ jobs with NPS above 80 by proving operational scalability.',
      'Increased ADP PEO conversions 22% and reduced cycle time 60% through a digital self-serve onboarding experience.',
      'Launched 5 corporate ventures delivering $250M+ in cumulative client impact through design-led product incubation.'
    ]
  },
  {
    company: 'Blue Cross Blue Shield Association',
    dates:   '2016 – 2017',
    title:   'Director of Product & Design, Consumer Experience',
    desc:    'Built and led a 5-person CX product organization spanning product, UX, and research to modernize consumer digital engagement.',
    bullets: [
      'Drove a 35% engagement lift by integrating behavioral design, gamification, and personalized content pathways.',
      'Reduced support costs 20% and raised satisfaction 15% by launching a redesigned plan-selection mobile product.',
      "Created $110M+ incremental opportunity by introducing a unified 'Signature Experience' design system across 36 plans."
    ]
  },
  {
    company: 'PepsiCo',
    dates:   '2015 – 2016',
    title:   'Senior Product Marketing Manager, New Ventures',
    desc:    "Incubated and launched new D2C brands and innovation pilots under PepsiCo's emerging business group.",
    bullets: [
      "Delivered $900K in the first 4 months through Popworks, PepsiCo's first D2C e-commerce launch.",
      'Accelerated go-to-market 25% by coaching 40+ cross-functional executives in lean and design thinking.',
      'Generated $65M pilot revenue by launching Imagine Snacks®, a health-focused kids brand under the Frito-Lay portfolio.'
    ]
  },
  {
    company: 'SC Johnson & Son',
    dates:   '2009 – 2015',
    title:   'Global Product Manager',
    desc:    'Led 0-1 product innovation across the U.S. and China, managing a cross-functional team of 15 for global B2C launches.',
    bullets: [
      "Redefined Ziploc's market positioning from 'food protection efficacy' to 'enabling life organization'.",
      'Delivered $130M Y1 revenue by developing three consumer products from concept to commercialization.',
      'Drove $65M in revenue and earned a CEO award by integrating Ziploc products with a companion app ecosystem.'
    ]
  },
  {
    company: 'Altitude by Accenture',
    dates:   '2007 – 2009',
    title:   'Senior Product Designer',
    desc:    'Led product design and user research for global consumer brands across physical and digital platforms.',
    bullets: [
      "Generated $5M category revenue with the Kryptonite Modulus lock, named to Popular Mechanics' Best List.",
      'Identified a $270M market gap in garment-care innovation via user research and competitive analysis for Sunbeam.',
      'Secured a $23M program extension and GE partnership through smart grid product strategy and roadmap development.'
    ]
  }
];

const SKILLS = [
  { label: 'Product & Strategy', items: '0-1 Product Strategy, Discovery & Validation, Product Vision, Roadmaps, Experimentation, Monetization, GTM Validation, Marketplace Design' },
  { label: 'Technology & Industry', items: 'AI-Enabled Products, B2B SaaS, SMB Products, Consumer Tech, Cybersecurity, Payments, Mobile Apps, Workflow Automation' },
  { label: 'Leadership', items: 'Cross-Functional Leadership, Stakeholder Alignment, Executive Storytelling, Team Building, Mentorship, Customer Research, Behavioral Design' }
];

const EDUCATION = [
  { school: 'Illinois Institute of Technology', degree: 'Master of Design, Institute of Design' },
  { school: 'University of Pune', degree: 'Bachelor of Engineering' }
];

// ── Serialize the fixed resume for Claude's context (with bullet indices) ──
function serializeResume() {
  const roleText = ROLES.map(r => {
    const bl = r.bullets.map((b, i) => `    [${i}] ${b}`).join('\n');
    return `${r.company} — ${r.title} (${r.dates})\n  ${r.desc}\n${bl}`;
  }).join('\n\n');
  const hi = HIGHLIGHTS.map((h, i) => `  [${i}] ${h}`).join('\n');
  return `CANDIDATE: ${CANDIDATE.name}\n\nSUMMARY BASIS: Principal Product Manager with 13 years building 0-1 products across consumer, SMB, SaaS, and marketplace models; design-trained and commercially grounded.\n\nHIGHLIGHT OPTIONS:\n${hi}\n\nEXPERIENCE:\n${roleText}`;
}

// ── Call Claude Haiku ──
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

// ── Validate a returned index array is a true permutation of [0..n-1] ──
function isPermutation(arr, n) {
  if (!Array.isArray(arr) || arr.length !== n) return false;
  const sorted = [...arr].map(Number).sort((a, b) => a - b);
  return sorted.every((v, i) => v === i);
}

// ── Build final HTML: fixed roles (bullets reordered per emphasis), tailored top ──
function buildHtml(tailored) {
  let html = fs.readFileSync(templatePath, 'utf8');

  const esc = s => String(s);
  const li  = arr => arr.map(b => `          <li>${esc(b)}</li>`).join('\n');

  // Highlights: use Claude's 3 (already plain strings), fall back to first 3 real ones.
  const highlights = Array.isArray(tailored.highlights_items) && tailored.highlights_items.length
    ? tailored.highlights_items.slice(0, 3)
    : HIGHLIGHTS.slice(0, 3);

  // Experience blocks: real roles; reorder each role's bullets if Claude gave a valid permutation.
  const emphasis = tailored.emphasis_order || {};
  const expBlocks = ROLES.map(r => {
    const order = emphasis[r.company];
    const bullets = isPermutation(order, r.bullets.length)
      ? order.map(i => r.bullets[Number(i)])
      : r.bullets;
    return `      <div class="job">
        <div class="job-header">
          <span class="job-company">${esc(r.company)}</span>
          <span class="job-dates">${esc(r.dates)}</span>
        </div>
        <div class="job-title">${esc(r.title)}</div>
        <p class="job-desc">${esc(r.desc)}</p>
        <div class="bullet-group">
          <ul>
${li(bullets)}
          </ul>
        </div>
      </div>`;
  }).join('\n');

  const eduRows = EDUCATION.map(e =>
    `    <div class="edu-row">
      <span><span class="edu-school">${esc(e.school)}</span><span> · </span><span class="edu-degree">${esc(e.degree)}</span></span>
    </div>`
  ).join('\n');

  const skillRows = SKILLS.map(s =>
    `    <div class="skill-row"><strong>${esc(s.label)}:</strong> ${esc(s.items)}</div>`
  ).join('\n');

  // Replace ALL occurrences (EMAIL/WEBSITE appear twice: in href and as visible text).
  const put = (key, val) => { html = html.split(key).join(val); };
  put('{{NAME}}',              esc(CANDIDATE.name));
  put('{{EMAIL}}',             esc(CANDIDATE.email));
  put('{{PHONE}}',             esc(CANDIDATE.phone));
  put('{{WEBSITE}}',           esc(CANDIDATE.website));
  put('{{SUMMARY_TEXT}}',      esc(tailored.summary_text));
  put('{{HIGHLIGHTS_ITEMS}}',  li(highlights));
  put('{{EXPERIENCE_BLOCKS}}', expBlocks);
  put('{{EDUCATION_ROWS}}',    eduRows);
  put('{{SKILLS_ROWS}}',       skillRows);

  return html;
}

// ── Generate resume for one job ──
async function generateResume(job) {
  console.log(`  Generating: ${job.role} @ ${job.company}`);

  const jd = job.description_snippet || '(no description available)';

  const prompt = `You are tailoring MY resume for a specific job application. Adjust emphasis so it matches the job description, while keeping everything factual and written in a natural, first-person voice (not AI-sounding).

STRICT RULES:
- Do NOT invent any achievement, skill, role, company, date, or metric. Use ONLY what is in the resume below.
- Do NOT rewrite the experience bullets. You may only REORDER each role's bullets by returning a permutation of that role's bullet indices, so the bullets most relevant to this JD appear first.
- summary_text: 2-3 sentences, first person, based only on my real background; shift emphasis toward what this JD cares about.
- highlights_items: pick the 3 most JD-relevant highlights from the HIGHLIGHT OPTIONS. You may lightly rephrase wording but MUST keep every metric exactly (dollar figures, %, ratings, counts).
- emphasis_order: for each company, return an array that is a permutation of that role's bullet indices (e.g. [2,0,1]). Put JD-relevant bullets first. Include every index for that role exactly once. If a role has no clear relevance, return its indices in original order.

RESUME (source of truth):
${serializeResume()}

TARGET JOB TITLE: ${job.role}
TARGET COMPANY: ${job.company}
TARGET JOB DESCRIPTION EXCERPT:
${jd}

Return ONLY valid JSON, no markdown, no explanation:
{
  "match_percentage": <integer 0-100>,
  "summary_text": "<2-3 sentence first-person summary>",
  "highlights_items": ["highlight 1", "highlight 2", "highlight 3"],
  "emphasis_order": {
    "Lvlon": [0,1,2],
    "Palo Alto Networks": [0,1,2,3,4,5],
    "Boston Consulting Group – Digital Ventures": [0,1,2,3,4],
    "Blue Cross Blue Shield Association": [0,1,2],
    "PepsiCo": [0,1,2],
    "SC Johnson & Son": [0,1,2],
    "Altitude by Accenture": [0,1,2]
  }
}`;

  const raw = await callClaude(prompt);

  let tailored;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    tailored = JSON.parse(jsonMatch[0]);
    if (!tailored.summary_text) throw new Error('Missing field: summary_text');
  } catch (e) {
    throw new Error(`Parse error: ${e.message}\nRaw: ${raw.substring(0, 300)}`);
  }

  const filename = `resume_${job.id}.html`;
  fs.writeFileSync(path.join(resumesDir, filename), buildHtml(tailored));

  const pct = Number.isInteger(tailored.match_percentage) ? tailored.match_percentage : 0;
  console.log(`  Saved: resumes/${filename} (Match: ${pct}%)`);
  return { resume_link: `resumes/${filename}`, resume_match_score: pct };
}

// ── Main ──
async function main() {
  const args   = process.argv.slice(2);
  const isAuto = args.includes('--auto');
  const jobId  = args.find(a => !a.startsWith('--'));

  console.log('=== Resume Generator ===');

  const data = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
  const jobs = data.jobs || [];
  let generated = 0;

  if (isAuto) {
    const targets = jobs.filter(j => (j.match_score || 0) >= 7 && !j.resume_link);
    console.log(`Auto mode: ${targets.length} job(s) queued (score >= 7, no resume yet)`);

    for (const job of targets) {
      try {
        const result = await generateResume(job);
        const idx = jobs.findIndex(j => j.id === job.id);
        if (idx !== -1) {
          jobs[idx].resume_link        = result.resume_link;
          jobs[idx].resume_match_score = result.resume_match_score;
        }
        generated++;
        await new Promise(r => setTimeout(r, 1200));
      } catch (err) {
        console.error(`  SKIP ${job.role}: ${err.message}`);
      }
    }

  } else if (jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) { console.error(`Job not found: ${jobId}`); process.exit(1); }

    try {
      const result = await generateResume(job);
      const idx = jobs.findIndex(j => j.id === jobId);
      jobs[idx].resume_link        = result.resume_link;
      jobs[idx].resume_match_score = result.resume_match_score;
      generated++;
    } catch (err) {
      console.error(`Error: ${err.message}`); process.exit(1);
    }

  } else {
    console.error('Usage: node generate-resume.js --auto  OR  node generate-resume.js <job_id>');
    process.exit(1);
  }

  if (generated > 0) {
    fs.writeFileSync(jobsPath, JSON.stringify(data, null, 2));
    console.log(`\nUpdated jobs.json — ${generated} resume(s) generated`);
  }
  console.log('=== Done ===');
}

if (require.main === module) {
  main().catch(err => { console.error('Fatal:', err); process.exit(1); });
}

module.exports = { buildHtml, isPermutation, ROLES, HIGHLIGHTS, CANDIDATE };
