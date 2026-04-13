# DESIGN.md

Tail Match — Design System

## 1. Visual Theme & Atmosphere

Instagram-inspired clean minimal. White cards on off-white backgrounds, thin borders instead of shadows, and a warm photo filter on all animal images. The design defers entirely to the photos — the UI is a quiet frame around content that tugs at your heart. Urgency badges (red/orange/yellow) are the only loud color, because deadline awareness saves lives.

Inspirations: Instagram feed/grid, Japanese pet adoption sites, clean mobile-first design.

## 2. Color Palette & Roles

No CSS variables — Tailwind classes and MUI theme values.

### Primary

| Color      | Hex       | Usage                          |
| ---------- | --------- | ------------------------------ |
| Near-black | `#262626` | Primary text, buttons, borders |
| Black      | `#000000` | Button hover                   |
| Off-white  | `#FAFAFA` | Page background                |
| White      | `#FFFFFF` | Cards, content areas           |

### Accent

| Color       | Hex       | Usage                    |
| ----------- | --------- | ------------------------ |
| Coral       | `#FF7A7A` | Heart icon, soft accent  |
| Coral light | `#FFEDED` | Coral tinted backgrounds |
| Coral dark  | `#E85555` | Coral hover              |

### Urgency States

| State   | Background | Text      | Border    |
| ------- | ---------- | --------- | --------- |
| Urgent  | `#FFEEF0`  | `#ED4956` | `#FFBEC2` |
| Warning | `#FFF8E6`  | `#B07D00` | `#FFE299` |
| Caution | `#FFF3CD`  | `#856404` | `#FFE69C` |

### Neutral

| Color        | Hex       | Usage                      |
| ------------ | --------- | -------------------------- |
| Border       | `#DBDBDB` | Standard border            |
| Border light | `#EFEFEF` | Subtle dividers            |
| Muted gray   | `#8E8E8E` | Secondary text, helpers    |
| Warm gray    | `#F5F5F5` | Section backgrounds, hover |

## 3. Typography Rules

### Font Family

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic Medium", Meiryo, sans-serif
```

### Type Scale

| Element      | Size             | Weight | Notes                           |
| ------------ | ---------------- | ------ | ------------------------------- |
| H1           | 2rem (32px)      | 300    | Light weight, tight tracking    |
| H2           | 1.75rem (28px)   | 300    |                                 |
| H4           | 1.125rem (18px)  | 400    | Card titles                     |
| Body1        | 0.9375rem (15px) | 400    | Primary body text               |
| Body2        | 0.8125rem (13px) | 400    | Secondary text                  |
| Caption      | 0.75rem (12px)   | 400    | Helper, meta                    |
| Badge        | 0.6875rem (11px) | 600    | Urgency badges, tracking 0.02em |
| Filter label | 0.75rem (12px)   | 600    | Uppercase, tracking 0.06em      |

## 4. Component Stylings

### Animal Card — Grid View (Instagram Square)

- Aspect ratio: `1:1`
- Border radius: `4px`
- Hover overlay: `rgba(0,0,0,0.3)`, transition 0.15s
- Warm filter: `linear-gradient(135deg, rgba(255,200,150,0.07), rgba(255,240,210,0.03))`
- Badge: top-left (urgency), top-right (transfer heart icon `#ED4956`)

### Animal Card — Feed View

- Border: `1px solid #DBDBDB`
- Border radius: `8px`
- Background: `#FFFFFF`
- No shadow
- Header: avatar 36px + name + location
- Body: metadata chips + personality text (line-clamp-2)

### Filter Chips (Pill)

- Padding: `6px 14px`
- Border radius: `16px`
- Default: white bg, `#DBDBDB` border, `#262626` text
- Active: `#262626` bg, white text
- Transition: `all 0.15s ease`

### Buttons

- Contained: `#262626` bg, white text, `8px 16px` padding, hover `#000000`
- Outlined: `#DBDBDB` border, `#262626` text, hover `#A8A8A8` border
- Border radius: `8px`

### Select Inputs

- Border: `1px solid #DBDBDB`
- Border radius: `8px`
- Padding: `10px 14px`
- Focus: `1px solid #262626`

## 5. Layout Principles

### Container

- Max width: `1200px` (MUI lg)
- Padding: `8px` mobile, `24px` desktop

### Instagram Grid

```
xs: repeat(3, 1fr), gap 3px
sm: repeat(4, 1fr), gap 4px
md: repeat(5, 1fr), gap 4px
lg: repeat(6, 1fr), gap 4px
```

### Spacing (MUI 8px base)

| Token | Value |
| ----- | ----- |
| 1     | 8px   |
| 2     | 16px  |
| 3     | 24px  |
| 4     | 32px  |
| 5     | 40px  |
| 6     | 48px  |

### Header

- Height: `54px`
- Backdrop: `saturate(180%) blur(20px)`, `rgba(255,255,255,0.98)`
- Border-bottom: `1px solid #DBDBDB`

## 6. Depth & Elevation

### Shadows

Minimal. Borders are preferred over shadows.

- Default cards: none
- Dialog: `0 4px 20px rgba(0,0,0,0.08)`
- Hover (region grid): `0 1px 4px rgba(0,0,0,0.1)`
- Image text shadow: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))`

### Border Radius

| Component      | Radius |
| -------------- | ------ |
| Grid cells     | `4px`  |
| Cards          | `8px`  |
| Buttons        | `8px`  |
| Inputs         | `8px`  |
| Filter chips   | `16px` |
| Avatars        | `50%`  |
| Urgency badges | `4px`  |

### Z-Index

Simple stacking — header is sticky, dropdown menus above content.

## 7. Do's and Don'ts

### Do

- Use borders (`#DBDBDB`) instead of shadows for card separation
- Apply warm filter overlay on all animal photos
- Use urgency badges with three-tier color coding (red/orange/yellow)
- Keep headings at weight 300 (light) for elegance
- Use `#262626` (not pure black) for text and primary UI
- Toggle between grid and feed view
- Use `0.15s ease` for all interactive transitions

### Don't

- Add heavy shadows — this is Instagram-flat
- Use saturated accent colors beyond urgency badges and coral heart
- Set heading weight above 400 (headings are deliberately light)
- Use border-radius above 8px on cards (chips at 16px are the exception)
- Override the Japanese-inclusive font stack

### Transitions

| Context        | Duration | Timing |
| -------------- | -------- | ------ |
| Hover overlay  | 0.15s    | ease   |
| Button states  | 0.15s    | ease   |
| Image load     | 0.3s     | ease   |
| Scale entrance | 0.2s     | ease   |

## 8. Responsive Behavior

### Breakpoints (MUI)

| Name | Value  | Grid columns | Gap |
| ---- | ------ | ------------ | --- |
| xs   | 0      | 3            | 3px |
| sm   | 600px  | 4            | 4px |
| md   | 900px  | 5            | 4px |
| lg   | 1200px | 6            | 4px |

### Mobile

- Hamburger menu replaces desktop nav
- Full-width filter bar with horizontal scroll
- Card feed stacks to single column

## 9. Agent Prompt Guide

### Color Quick Reference

```
Primary text:     #262626  (near-black)
Background:       #FAFAFA  (off-white)
Cards:            #FFFFFF  (white)
Borders:          #DBDBDB  (light gray)
Muted text:       #8E8E8E  (gray)
Urgent:           #ED4956  (alert red)
Warning:          #FFBA33  (orange)
Caution:          #FFD166  (yellow)
Coral accent:     #FF7A7A  (heart)
```

### When generating UI for this project

- Instagram aesthetic. White cards, thin borders, no shadows
- `#262626` is the primary color for everything — text, buttons, active states
- Light heading weights (300). Never bold headers
- Urgency badges are the loudest visual element — three tiers of warm colors
- Warm photo filter overlay on all images (`rgba(255,200,150,0.07)` gradient)
- Grid view = Instagram square grid (3-6 columns). Feed view = rectangular cards
- MUI + Tailwind hybrid. MUI for layout/components, Tailwind for utilities
- Transitions at 0.15s. Fast and subtle
- Japanese font stack included — this serves Japanese adopters

### Color Emotion Reference

- **Near-black (#262626):** Authority without harshness
- **Off-white (#FAFAFA):** Clean, neutral, lets photos speak
- **Coral (#FF7A7A):** Affection, heart, emotional connection
- **Red (#ED4956):** Urgency, time running out, act now
- **Orange (#FFBA33):** Warning, attention needed soon
- **Yellow (#FFD166):** Gentle reminder, be aware
