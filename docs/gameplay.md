# TactLex gameplay model

TactLex is a mobile-first language-learning PWA with an open recommended path. Educational nodes are never locked: learners may start any published lesson, quiz, fact, or checkpoint in any order. Reward and patch nodes remain visible but can only be claimed after their server-side conditions are met.

## Content release 2.0 beta

- 556 term records in 57 lessons across five categories.
- 57 lesson nodes and 57 text-only quiz nodes.
- 27 optional sourced fact nodes.
- 12 reward chests, five category checkpoints, and five category patch nodes.
- 163 learning-path nodes in total.
- Beta facts and AI-assisted terminology remain explicitly labelled pending subject-matter review.

Quiz sessions use one question per lesson term, exactly four snapshotted text choices, alternating EN→UK and UK→EN directions, and one assessed answer per question. The correct answer is returned only after assessment. Quiz and checkpoint sessions do not expose audio, TTS controls, or typed-answer inputs.

## Rewards and privacy

Coins are an internal, non-transferable reward. Patch definitions are cosmetic and cannot modify XP. Coin grants and reward claims use unique ledger keys. A learner may feature up to three owned patches.

League participation requires the existing leaderboard opt-in. League responses expose only nickname, avatar, featured cosmetic state, and XP; email is never part of league output.

## Main API surfaces

- `GET /api/v1/game-status`
- `GET /api/v1/categories/{slug}/path`
- `POST /api/v1/study-sessions` with `nodeId`
- `POST /api/v1/path-nodes/{id}/complete`
- `POST /api/v1/path-nodes/{id}/claim`
- `GET /api/v1/quests`
- `POST /api/v1/quests/{id}/claim`
- `GET /api/v1/patches`
- `PATCH /api/v1/profile/featured-patches`
- `GET /api/v1/leagues/current`

The PWA is network-dependent for study sessions and progress writes. Offline UI is honest: it reports connectivity loss and never fabricates local progress.
