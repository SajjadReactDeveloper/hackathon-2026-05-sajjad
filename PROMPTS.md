# Prompt Log — Sajjad — FlowChat (WhatsApp Business Assistant)

> Live record of prompts I sent to Claude Code while building this. Updated continuously, not reconstructed at the end.
>
> **Why this exists** — hackathon scoring rubric §9 (Effective use of Claude Code, 25%) requires "top 5 worked + bottom 3 failed" prompts as a graded deliverable. Missing this = **−25 percentage-point penalty**.
>
> **Format** is the Workshop Pack §4 template. Append-only — don't edit prior entries; the failure-progression is part of what's being graded.

---

## Top 5 prompts that worked

> Filled continuously during the build. By EOD Sat May 9 this section MUST have ≥5 entries with real content.

### 1. _<one-line description of what this prompt accomplished>_

**Context:** _What I was trying to do. What I'd already tried._

**Prompt:**

```
<paste the prompt verbatim — including @file pins, CONSTRAINTS block, pattern invocation, etc.>
```

**Why it worked:** _1–2 sentences. Reference the specific Prompting Patterns doc pattern when applicable (Pattern 1 multi-loop / Pattern 2 design QA / Pattern 3 take-it-home / Interview-Me-First / Pin the Files / CONSTRAINTS block / Failing-Test-First / Plan-Annotate-Reject)._

**Output quality:** _<1–5>_
**Model used:** _Sonnet / Opus_
**Approx tokens / cost:** _$X.XX_

---

### 2. _<one-line description>_

**Context:**

**Prompt:**

```
```

**Why it worked:**

**Output quality:** _/5_
**Model used:**
**Approx tokens / cost:**

---

### 3. _<one-line description>_

**Context:**

**Prompt:**

```
```

**Why it worked:**

**Output quality:** _/5_
**Model used:**
**Approx tokens / cost:**

---

### 4. _<one-line description>_

**Context:**

**Prompt:**

```
```

**Why it worked:**

**Output quality:** _/5_
**Model used:**
**Approx tokens / cost:**

---

### 5. _<one-line description>_

**Context:**

**Prompt:**

```
```

**Why it worked:**

**Output quality:** _/5_
**Model used:**
**Approx tokens / cost:**

---

## Bottom 3 prompts that wasted time

> Honest failures. By EOD Sat May 9 this section MUST have ≥3 entries with real content. Don't prettify — judges read these for the lessons.

### 1. _<one-line description>_

**What I asked:**

```
<paste the prompt verbatim>
```

**What went wrong:** _Hallucination / context drift / wrong file edited / over-engineered / missing constraint / endless audit loop / etc._

**What I should have done:** _Specific revised prompt or workflow change. Reference the pattern that would have prevented it (e.g., "should have used Pin the Files + CONSTRAINTS block")._

---

### 2. _<one-line description>_

**What I asked:**

```
```

**What went wrong:**

**What I should have done:**

---

### 3. _<one-line description>_

**What I asked:**

```
```

**What went wrong:**

**What I should have done:**

---

## Workflow patterns I'll keep using

_<e.g., "Always plan mode for any task touching >3 files">_

_<e.g., "@file pins on every non-trivial prompt — auto-discovery is unreliable on this monorepo">_

_<e.g., "Pattern 1 multi-loop for the WhatsApp pipeline service — caught a cross-tenant leak in the audit loop that tests would have missed">_

_<e.g., "Sub-agent Explore for any 3+ file reads — keeps main context under 50k tokens even on Day 2">_

_<e.g., "Failing-Test-First on anything touching auth, money flow, or webhook signatures">_

---

## Workflow patterns I'll stop

_<e.g., "Stopped letting Opus run as default — set /config set model sonnet at every session start">_

_<e.g., "Stopped saying 'no, do it differently' — switched to /rewind so the bad attempt isn't in context">_

_<e.g., "Stopped writing long Slack-style prompts — switched to CONSTRAINTS block + acceptance criteria + workflow numbered steps">_

_<e.g., "Stopped trusting tests-pass without running them against deliberately-broken code">_

---

## Full append-only log (raw material for the top-5 / bottom-3)

> Every non-trivial prompt during the build. Used Day 3 polish to pick the top-5 / bottom-3 above. Newest at the bottom.

### Template entry

```
### YYYY-MM-DD HH:MM — <short title>
- Phase: Day 0 / 1 / 2 / 3
- Task: <SPEC.md / docs/PLAN.md reference>
- Model: Sonnet / Opus
- Plan mode? yes / no
- Sub-agent used? Explore / Plan / none
- Pattern invoked? Pattern 1 / Pattern 2 / Pattern 3 / Interview-Me-First / Pin Files / Failing-Test-First / Plan-Annotate-Reject / none
- Prompt (verbatim or summary):
- Outcome: succeeded / partial / failed
- Approx tokens / cost: $X.XX
- Notes / what I'd do differently:
```

### Entries

_<append-only — newest at the bottom>_

---

_Last updated: not yet started_
