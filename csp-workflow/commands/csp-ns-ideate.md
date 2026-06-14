---
name: csp-ideate
description: "exploration capture | explore sketch spike spec capture"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [capture, explore, sketch, spike, spec-phase]
---

Route to the appropriate exploration / capture skill based on the user's intent.
`csp-note`, `csp-add-todo`, `csp-add-backlog`, and `csp-plant-seed` were folded
into `csp-capture` (with `--note`, default, `--backlog`, `--seed` modes) by
#2790. The capture target lists pending todos via `--list`.

| User wants | Invoke |
|---|---|
| Explore an idea or opportunity | csp-explore |
| Sketch out a rough design or plan | csp-sketch |
| Time-boxed technical spike | csp-spike |
| Write a spec for a phase | csp-spec-phase |
| Capture a thought (todo / note / backlog / seed) | csp-capture |

Invoke the matched skill directly using the Skill tool.
