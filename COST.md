# Cost Log — Sajjad — FlowChat (WhatsApp Business Assistant)

> Daily Claude Code spend. Updated end of each build day. **Public number** at standup per Workshop Pack §6.
>
> **Soft cap:** $75/day. **Hard cap:** $100/day. Crossing $100 → 15-min review with Adnan next morning.

| Day | Spend (USD) | Sessions | Hours coding | $/hour | Notes |
| --- | ----------- | -------- | ------------ | ------ | ----- |
| Wed May 6 (Day 0 setup) |  |  |  |  |  |
| Thu May 7 (Day 1) |  |  |  |  |  |
| Fri May 8 (Day 2) |  |  |  |  |  |
| Sat May 9 (Day 3) |  |  |  |  |  |
| **Total** |  |  |  |  |  |

## Notes per day

### Day 0 (Wed May 6) — setup

_<populate at EOD: model split (Sonnet vs Opus), biggest spend driver, any escalations and why>_

### Day 1 (Thu May 7) — foundation

_<populate at EOD>_

### Day 2 (Fri May 8) — magic (the brutal day)

_<populate at EOD — expect highest spend; tool-calling AI loop + voice/image pipelines burn tokens>_

### Day 3 (Sat May 9) — polish

_<populate at EOD; Pattern 3 take-it-home loops are token-hungry, cap at $15 per run>_

## Discipline checklist (run end of every day)

- [ ] Default model set to Sonnet at every session start (`/config set model sonnet`)
- [ ] Plan mode used for any task ≥30 min
- [ ] Extended thinking capped at 5,000 tokens (prefix prompts when needed)
- [ ] Sub-agents used for read-heavy work (>3 file reads); main context kept under 50k
- [ ] `/compact` at natural breakpoints, `/clear` between unrelated tasks
- [ ] Builds and long tests run by hand (Claude doesn't wait on `pnpm install` / Playwright)
- [ ] No Opus-by-default sessions

## Surprises (for the demo §10 cost segment, 4:30–5:00)

_<noteworthy moments to mention in the demo: cheapest output that worked, most expensive prompt and why, $/feature math after the fact, what I'd do differently with the budget>_
