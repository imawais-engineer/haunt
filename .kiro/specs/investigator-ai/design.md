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
Thresholds are inclusive: sanity ≤ 70 is Rattled, ≤ 35 is Panicked, 0 is Fleeing.

Recovery: Spec 1 R3 wins. Rattled, Panicked and Fleeing investigators never
recover. The Rattled → Investigate edge in `nextState` stays only as a
defensive fallback that cannot trigger under R3.

## Personalities (three numbers each, not three codebases)

| Investigator | Speed | Recovery | Investigate tendency |
|---|---|---|---|
| The Skeptic | fast | fastest | high — walks toward scares |
| The Medium | slow | slowest | low — senses possession, pauses |
| The Photographer | medium | medium | medium — pauses often to photograph |

Photographer flash briefly reveals the ghost's position in the room.
A scare takes 50% damage while she is moving and 100% while paused taking a
photo. The 50% (`PHOTOGRAPHER.movingDamageMultiplier`) is a placeholder for
the Day 5 balance pass.

## Module

`src/core/investigator.ts` — pure logic, no Phaser imports.
Scenes render state; they never decide it.
