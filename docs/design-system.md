# Lumen Design System

Date: 2026-01-28
Status: Draft

## Essence

Lumen should feel like a grounding presence — a wise friend who's fully present. The UI is a clearing: quiet, unhurried, focused on the user. An AI assisting humans in being human.

## Design Principles

- **Warm**: Soft, natural tones — never stark or cold
- **Grounded**: Earthy palette, generous whitespace, nothing flashy
- **Clear**: Clean typography, no clutter, distraction-free
- **Human**: Rounded shapes, friendly type, subtle warmth

## References

- Claude.ai — clean, modern, minimal
- OmmWriter — distraction-free, focused, native macOS feel

## Typography

**Font family**: Lato (humanist, warm, readable)
- Friendly but not overly playful
- Balances approachability with "pillar of strength and clarity"

**Scale** (mobile-first):
- Body: 16px / 1.5 line-height
- Heading 1: 28px / 1.2
- Heading 2: 22px / 1.3
- Small: 14px / 1.5

## Color System

Three time-based palettes that shift with the rhythm of the day. Same structure, different mood.

### Shared Tokens

```
--radius: 0.5rem (soft, rounded corners)
--font-sans: 'Lato', sans-serif
```

### Morning Palette
*Fresh, clear, beginning — opening your eyes to a new day*

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#F9FCFB` cool white | `#181D1C` cool black |
| `--foreground` | `#252D2B` cool charcoal | `#EEF2F1` soft cool cream |
| `--muted` | `#EDF2F0` soft cool cream | `#242928` muted cool |
| `--muted-foreground` | `#6B7775` cool gray | `#8FA19D` cool gray |
| `--accent` | `#5BA99A` soft teal | `#5BA99A` soft teal |
| `--accent-foreground` | `#F9FCFB` | `#F9FCFB` |
| `--border` | `#DEE5E3` | `#2F3634` |
| `--input` | `#DEE5E3` | `#2F3634` |
| `--ring` | `#5BA99A` teal | `#5BA99A` teal |

### Afternoon Palette
*Grounded, focused, steady — full presence, calm clarity*

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#FAF9F7` warm white | `#1A1918` warm black |
| `--foreground` | `#2D2A26` warm charcoal | `#EDEBE8` soft cream |
| `--muted` | `#F0EDE8` soft cream | `#282624` muted charcoal |
| `--muted-foreground` | `#6B665D` warm gray | `#9C978F` warm gray |
| `--accent` | `#7D9B84` sage green | `#7D9B84` sage green |
| `--accent-foreground` | `#FDFCFA` | `#FDFCFA` |
| `--border` | `#E2DED6` | `#363432` |
| `--input` | `#E2DED6` | `#363432` |
| `--ring` | `#7D9B84` sage | `#7D9B84` sage |

### Evening Palette
*Reflective, settling, warm — golden hour, winding down*

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#FBF9F6` warm cream | `#1B1917` deep warm |
| `--foreground` | `#2E2924` warm brown | `#EBE6DF` soft cream |
| `--muted` | `#F2EEE6` soft cream | `#2A2622` muted brown |
| `--muted-foreground` | `#7A7268` warm brown | `#A69E94` warm tan |
| `--accent` | `#C4956A` warm amber | `#C4956A` warm amber |
| `--accent-foreground` | `#1B1917` | `#1B1917` |
| `--border` | `#E6E0D6` | `#3A3530` |
| `--input` | `#E6E0D6` | `#3A3530` |
| `--ring` | `#C4956A` amber | `#C4956A` amber |

## Time Detection

Default behavior:
- **Morning**: 5:00 AM – 11:59 AM (local time)
- **Afternoon**: 12:00 PM – 5:59 PM
- **Evening**: 6:00 PM – 4:59 AM

User can override manually if desired.

## Component Guidelines

- **Buttons**: Soft rounded corners, subtle hover states
- **Inputs**: Clean borders, generous padding, warm focus rings
- **Cards**: Minimal shadows (or none), border-based separation
- **Spacing**: Generous — let content breathe
- **Icons**: lucide-react, 20-24px default, stroke width 1.5-2

## Avoid

- Pure white (#FFFFFF) or pure black (#000000)
- Cool grays or blues
- Harsh shadows or gradients
- Cluttered layouts
- Corporate or "tech dashboard" aesthetics
