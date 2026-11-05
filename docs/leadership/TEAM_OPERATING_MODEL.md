# Team Operating Model

## My model: player-coach

I lead engineers directly — largest team **10 QA engineers/SDETs (3 hired
by me)**, in a 10–15-person org including offshore engineers. I do not
manage other managers; my leverage is technical credibility plus people
management: I set architecture and review standards, I run hiring and
performance, and I still read the failing tests myself.

## Hiring bar

- **Hire for judgment, teach the stack.** A strong engineer learns
  Playwright in weeks; risk thinking and honest reporting are the scarce
  skills. My interviews weight a real defect discussion and a test-design
  exercise over tool trivia.
- Candidates walk through code — theirs or a sample — and explain one
  production bug they owned end-to-end. How someone talks about an escape
  tells me more than any certification.
- Every hire gets a 30/60/90: framework fluency and a first owned module
  (30), first release sign-off contribution and on-call/flaky rotation
  (60), ownership of a quality area with metrics (90).

## Performance and growth

- I own performance reviews and hiring decisions for my team — feedback is
  continuous, documented, and specific (a review should never be the first
  time someone hears something).
- Growth paths are explicit: depth (automation architecture, data
  validation, performance) or breadth (release leadership, strategy).
  Senior engineers mentor on code reviews, not just in meetings.
- Underperformance is handled early and plainly: expectations in writing,
  support and examples, a dated plan, honest follow-through.

## Working rhythm

- **Code review is the culture.** Test code is production code: reviewed,
  held to the framework's layering and hard pass/fail standards (this repo
  shows both), no merged "temporary" skips.
- **Flaky-test ownership.** Whoever's area flakes, fixes or quarantines it
  openly that week. Flakiness is a team-trust problem, not background noise.
- **Offshore coordination that actually works:** overlap hours reserved for
  design reviews and defect triage (not status), written charters and
  sign-off criteria so async work doesn't stall on ambiguity, and shared
  ownership of modules — no "throw it over the wall" split of manual here /
  automation there.

## What I expect, stated plainly

Own your area's evidence. Report bad news early and precisely. A test that
hasn't verified anything must never be reported as passing. Everything
else is teachable; those three are the job.
