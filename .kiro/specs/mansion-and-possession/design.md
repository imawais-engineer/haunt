# Spec 3 — design: mansion and possession

## Layout (top-down, one screen)

```
        ┌─────────────┐
        │   Bedroom   │  Mirror
        │  (Mirror)   │
┌───────┴──────┬──────┴───────┐
│    Study     │ Entrance Hall│
│   (Piano)    │ (Chandelier) │
├──────────────┴──────┬───────┤
│  Dining room        │       │
│  (Painting)         │       │
└─────────────────────┘       │
                    Front door (flee exit)
```

One mansion, three playable rooms plus entrance hall. A full run lasts
about 5 minutes.

## Controls

| Action | Input |
|---|---|
| Move ghost | Mouse follow, or WASD / arrow keys |
| Possess / leave object | Click object, or E near it |
| Trigger scare | Click possessed object, or Space |
| Pause / restart | Esc / R on end screens |

## Layers

- `src/core/` — pure logic (sanity, ectoplasm, investigator, night, balance).
- `src/game/` — Phaser scenes: Boot, Title, Mansion, End; input + rendering only.
- `src/ui/` — HUD: sanity bars, ectoplasm meter, dawn sky strip.
- `src/assets/` — free-license / generated art and audio, sources recorded.
