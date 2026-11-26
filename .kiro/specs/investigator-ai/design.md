# Spec 2 — design: investigator state machine

## States

```
Investigate ──sanity ≤ 70──▶ Rattled ──sanity ≤ 35──▶ Panicked
    ▲                          │                         │
    │ (recovers, calm+alone)   │                         ▼
    └──────────────────────────┘                    Fleeing ──▶ Gone
                                              (sanity = 0)   (at the door)
```

One shared machine for all three investigators. Thresholds: 70 / 35 / 0.

## Personalities (three numbers each, not three codebases)

| Investigator | Speed | Recovery | Investigate tendency |
|---|---|---|---|
| The Skeptic | fast | fastest | high — walks toward scares |
| The Medium | slow | slowest | low — senses possession, pauses |
| The Photographer | medium | medium | medium — pauses often to photograph |

Photographer flash briefly reveals the ghost's position in the room.

## Module

`src/core/investigator.ts` — pure logic, no Phaser imports.
Scenes render state; they never decide it.
