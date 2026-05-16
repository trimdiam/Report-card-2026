# St. Francis School — Claude Code Instructions

## Project Context
St. Francis De Sales Secondary School Student Management Application.
Tech Stack: HTML, CSS (Bento Grid, Glassmorphic UI), Vanilla JavaScript, Firebase v9+ (Auth & Firestore).

## Established Coding Rules & Constraints
1. **Modular Architecture:** Do not alter or interfere with the existing application routing logic.
2. **UI/UX Preservation:** Maintain the existing Bento Grid layout and glassmorphic CSS styling.

---

## Mobile Timeout Prevention

These rules are mandatory to prevent 'Stream idle timeout' errors on mobile environments.

1. **Chunk Your Code:** Never write or rewrite large files in a single response. Break implementations of over 100 lines into smaller chunks and ask for confirmation before continuing.

2. **Restrict Git Commands:** NEVER run `git diff` on the entire repository. Strictly use `git status`. If a diff is absolutely necessary, target a single file only (e.g., `git diff path/to/file`).

3. **Step-by-Step Execution:** For complex tasks, provide a brief numbered plan, execute ONLY step one, then wait for the user to say "continue" before proceeding.

4. **Concise Explanations:** Keep explanations brief and get straight to the tool use or code output.

---

## Task Delegation

When spawning subagents, use the cheapest model that can handle the task:
- Haiku: bulk mechanical tasks - no judgment needed
- Sonnet: scoped research, code exploration, synthesis
- Opus: only for real planning or tradeoff decisions

Spawn rules:
- Haiku cannot spawn subagents. If it needs to, return to parent.
- Max spawn depth: 2
- Subagents escalate to parent, never self-escalate model tier

## Preferred Tools
- Public pages → WebFetch (free, text-only)
- Dynamic pages / auth walls → agent-browser CLI
- PDFs → pdftotext (not Read tool)
- Repeated fetch patterns → wrap as reusable tool

---

## Remark Engine — Intelligence Rules (`generateRemark` in render.js)

These rules are permanent. Every future change to the remark engine must respect them.

### Performance Bands (based on term percentage)
| Band | Range |
|------|-------|
| Excellent | ≥ 90% |
| Very Good | 80 – 90% |
| Good | 70 – 80% |
| Average | 40 – 70% |
| Needs Improvement | < 40% |

### Mandatory Remark Structure
Every generated remark MUST include:
- ✔ **1 Strength** — best subject named with appreciative language
- ✔ **1 Improvement area** — weakest subject as focus area (or general growth suggestion if all subjects are within 10 pts of each other)

### Subject Analysis Rules
- Best/worst determined from `countInTotal: true` subjects only
- A subject is only named as a weakness if gap from best is **≥ 10 points**
- If gap < 10 pts → use a band-appropriate general growth statement instead

### All-Fail / Most-Fail Rule (< 40% band)
- If **all** `countInTotal` subjects are below passmark → remark must say "needs considerable attention to **all subjects**" (not just the weakest)
- If **≥ 75%** of subjects are below passmark → "needs focused effort across **most subjects**"
- In both cases: name the best subject as a starting foundation
- Attendance note appended if attendance < 75%

### UT vs TE Pattern Detection (standard scheme classes III–VIII only)
- Detect per-subject and overall UT (out of 30) vs exam (out of 60) gap
- High UT + low TE → "exam preparation needs strengthening"
- Low UT + high TE → "improvement in term examination is commendable"
- Consistent → no note added

### Trend Detection (Final Term only)
- FT remark should compare grandTotal vs HY grandTotal
- Improvement → acknowledge positively
- Decline → note gently without harsh language

### Class-Tier Output
| Class | Max sentences |
|-------|--------------|
| III – V | 3 – 4 |
| VI – VIII | 2 – 3 |
| IX – X | Max 2 (strict) |

### Hard Limits
- **Target ~300 characters** — aim to use the full budget, not stop short. Trim only if exceeded; hard-truncate only as last resort
- No promotion / detention / pass / fail language
- Professional, respectful tone at all times
- Sentence pools: minimum 4 variants per band to avoid identical remarks across a class
