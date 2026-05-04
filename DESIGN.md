---
version: alpha
name: Linky
description: Neutral, system-aware interface for a real-time social video product — compact controls, geometric sans type, and restrained chroma except for data visualization and celebratory motion accents.
colors:
  light-background: "#ffffff"
  light-foreground: "#0a0a0a"
  light-card: "#ffffff"
  light-card-foreground: "#0a0a0a"
  light-popover: "#ffffff"
  light-popover-foreground: "#0a0a0a"
  light-primary: "#171717"
  light-on-primary: "#fafafa"
  light-secondary: "#f5f5f5"
  light-on-secondary: "#171717"
  light-muted: "#f5f5f5"
  light-muted-foreground: "#737373"
  light-accent: "#f5f5f5"
  light-on-accent: "#171717"
  light-destructive: "#e7000b"
  light-on-destructive: "#fcf3f3"
  light-border: "#e5e5e5"
  light-input: "#e5e5e5"
  light-ring: "#a1a1a1"
  light-sidebar: "#fafafa"
  light-sidebar-foreground: "#0a0a0a"
  light-sidebar-primary: "#171717"
  light-sidebar-on-primary: "#fafafa"
  light-sidebar-accent: "#f5f5f5"
  light-sidebar-on-accent: "#171717"
  light-sidebar-border: "#e5e5e5"
  light-sidebar-ring: "#a1a1a1"
  light-surface: "#f8f8f8"
  light-surface-foreground: "#0a0a0a"
  light-code-highlight: "#f2f2f2"
  light-code-number: "#747474"
  light-selection: "#0a0a0a"
  light-on-selection: "#ffffff"
  dark-background: "#0a0a0a"
  dark-foreground: "#fafafa"
  dark-card: "#171717"
  dark-card-foreground: "#fafafa"
  dark-popover: "#171717"
  dark-popover-foreground: "#fafafa"
  dark-primary: "#e5e5e5"
  dark-on-primary: "#171717"
  dark-secondary: "#262626"
  dark-on-secondary: "#fafafa"
  dark-muted: "#262626"
  dark-muted-foreground: "#a1a1a1"
  dark-accent: "#404040"
  dark-on-accent: "#fafafa"
  dark-destructive: "#ff6467"
  dark-on-destructive: "#df2225"
  dark-border: "#ffffff1a"
  dark-input: "#ffffff26"
  dark-ring: "#737373"
  dark-sidebar: "#171717"
  dark-sidebar-foreground: "#fafafa"
  dark-sidebar-primary: "#1447e6"
  dark-sidebar-on-primary: "#fafafa"
  dark-sidebar-accent: "#262626"
  dark-sidebar-on-accent: "#fafafa"
  dark-sidebar-border: "#ffffff1a"
  dark-sidebar-ring: "#737373"
  dark-surface: "#161616"
  dark-surface-foreground: "#a1a1a1"
  dark-code-highlight: "#262626"
  dark-code-number: "#a4a4a4"
  dark-selection: "#e5e5e5"
  dark-on-selection: "#171717"
  success: "#22c543"
  warning: "#f36b16"
  chart-1: "#93c5fd"
  chart-2: "#3b82f6"
  chart-3: "#2563eb"
  chart-4: "#1d4ed8"
  chart-5: "#1e40af"
  motion-accent-1: "#ff4242"
  motion-accent-2: "#a142fe"
  motion-accent-3: "#40a1ff"
  motion-accent-4: "#43d0ff"
  motion-accent-5: "#a0ff42"
typography:
  display:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 26px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 22px
  body-md-medium:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 22px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.02em
  code:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 20px
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  xl2: 18px
  xl3: 22px
  xl4: 26px
  full: 9999px
spacing:
  unit: 4px
  touch-min: 44px
  page-padding-sm: 12px
  page-padding-md: 16px
  page-padding-lg: 24px
  card-padding-x: 16px
  card-padding-y: 16px
  card-gap: 16px
  card-gap-sm: 12px
  section-y: 32px
  section-y-lg: 48px
  sidebar-item-x: 12px
  inline-gap-tight: 4px
  inline-gap: 6px
  inline-gap-comfortable: 8px
  stack-gap: 12px
  stack-gap-loose: 16px
elevation:
  card-ring-light: rgba(10, 10, 10, 0.1)
  card-ring-dark: rgba(250, 250, 250, 0.1)
  focus-ring-width: 3px
  focus-ring-opacity: 0.5
  modal-backdrop: rgba(0, 0, 0, 1)
motion:
  duration-instant: 100ms
  duration-fast: 150ms
  duration-shiny-loop: 8s
  easing-default: ease
  easing-standard: cubic-bezier(0.4, 0, 0.2, 1)
  interaction-press-nudge: 1px
breakpoints:
  xl: 1280px
  xl2: 1536px
  xl3: 1600px
  xl4: 2000px
components:
  button-primary:
    backgroundColor: "{colors.light-primary}"
    textColor: "{colors.light-on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    height: 32px
    padding: 0 10px
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    height: 32px
    padding: 0 10px
  button-primary-hover:
    backgroundColor: rgba(23, 23, 23, 0.8)
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.light-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
  button-destructive-quiet:
    backgroundColor: rgba(231, 0, 11, 0.1)
    textColor: "{colors.light-destructive}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
  card:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.light-card-foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding-y} {spacing.card-padding-x}"
  card-dark:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.dark-card-foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding-y} {spacing.card-padding-x}"
  input-outline:
    backgroundColor: "{colors.light-background}"
    textColor: "{colors.light-foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 0 12px
    height: 32px
  focus-visible:
    ringWidth: "{elevation.focus-ring-width}"
    ringColor: "{colors.light-ring}"
  link-inline:
    textColor: "{colors.light-primary}"
    typography: "{typography.body-md}"
---

## Overview

Linky reads as a **calm, high-trust utility** for live conversation: plenty of neutral surface area, crisp type, and interaction feedback that is quick but not flashy. The default aesthetic is **achromatic neutral** (near-black and off-white) so people, video, and user-generated content stay in the spotlight. Color is reserved for **semantics** (success, warning, destructive), **navigation emphasis** (sidebar active state in the dark theme), **charts**, and **playful motion accents** (multi-hue gradients used sparingly for delight, not for core chrome).

The product follows **system appearance** (light or dark) with an immediate switch and **no animated theme cross-fade** on change, so the interface feels predictable on low-power devices and avoids “muddy” intermediate states.

## Colors

**Light theme** centers on a true white canvas, charcoal ink, and graphite primary actions. Secondary and muted fills are a very light warm gray; borders and inputs align to the same family so fields feel embedded rather than outlined in a second color system. Destructive states use a clear red; success and warning are saturated enough to read at a glance without dominating layouts.

**Dark theme** inverts to a near-black canvas and lifted charcoal cards. Primary actions become **light gray fills** with **dark text** (inverted polarity versus light mode). Muted and accent surfaces are separated by subtle lightness steps. Borders and inputs use **low-opacity white** rather than a separate gray hex, which keeps edges soft in dim environments. The **sidebar primary** in dark mode shifts to a **saturated blue** so wayfinding and active nav read clearly against the dark shell.

**Data visualization** uses a consistent blue ramp. **Motion accents** are five vivid hues (red, violet, blue, cyan, lime) for gradients and decorative animation — they should never replace semantic colors for status.

**Selection** in light mode is inverted (dark highlight, white text); in dark mode it inverts again (light highlight, dark text) for legible contrast.

## Typography

**Be Vietnam Pro** is the sole brand typeface for Latin and Vietnamese, loaded in a wide weight range so hierarchy is expressed with weight and size rather than mixing families. Body copy favors **14px** with comfortable line height; marketing or dense settings may step up to **16px**. Buttons and compact controls use **14px medium**. Small labels and metadata use **12px semibold** with slight positive letter-spacing for scanability.

**Monospace** is reserved for code, IDs, and technical snippets. Body text uses **synthetic weight adjustment disabled** and **legibility-optimized rendering** so long sessions in chat and settings stay readable.

Headlines tighten tracking slightly as size increases; display-level treatment should stay rare so the app does not feel like a marketing microsite inside productive surfaces.

## Layout

Rhythm is governed by a **4px grid** (quarter-rem spacing scale). Cards and panels use **16px** vertical padding and gap by default, with a **12px** compact variant where density matters (tables, mobile). Page gutters typically sit between **12px and 24px** depending on breakpoint.

**Wide layouts** include extended breakpoints at **1600px** and **2000px** so ultra-wide monitors keep content from feeling stranded; optional structural borders appear only on very large viewports.

**Safe areas** on notched devices reserve bottom inset padding where fixed footers or tab bars meet the OS home indicator.

## Elevation and depth

Depth is **restrained**. Cards and elevated surfaces often rely on a **1px ring** at low-opacity foreground color rather than heavy drop shadows, so elevation reads as **crisp and flat-modern** rather than skeuomorphic.

**Focus** states use a **3px ring** at **half opacity** on the ring color, paired with a **border tint** on the control — keyboard users get an obvious target without a second visual language.

**Modal overlays** use a full black scrim; **destructive** and **invalid** fields can add a faint red ring tint.

**Touch targets** should respect a minimum **44px** where primary actions are finger-driven; desktop may use shorter control heights with confidence from hover precision.

## Shapes

Corner radii derive from a **10px base radius**: smaller controls step down in **2px** increments; larger containers step up in **4px** increments up to **26px** for hero-scale shells. **Pills and avatars** use full rounding.

Optional **appearance flavors** (user-chosen) can remove rounding or scale type for accessibility and personal taste; the default remains **rounded-lg** on controls and **rounded-xl** on cards.

## Components

**Buttons** default to **filled primary** (dark fill in light theme, light fill in dark theme). **Outline** buttons use a neutral border and gain a muted fill on hover. **Ghost** buttons are transparent until hover. **Destructive** actions use a **soft red wash** with red text rather than solid red fills for default emphasis, keeping danger available without alarming empty states.

**Cards** are **rounded-xl**, **text-sm** body, with a **subtle ring** for edge definition. Headers align to a **tight title + optional description** grid; media flush to the top of the card gets rounded top corners only.

**Inputs** in dark mode often use a **translucent** fill (`~15%` white) so they sit **inside** surfaces rather than punching holes through them.

**Sidebar** active and brand color can follow the **sidebar-primary** token (blue in dark theme) while the rest of the chrome stays neutral.

**Motion** utilities include long-loop **shimmer** and **rainbow** treatments for marketing or delight — cap motion for **reduced-motion** preferences so essential flows stay static and direct.

## Do's and Don'ts

**Do** keep the default UI in **neutral grays** and let content supply color.

**Do** pair **light gray destructive** buttons with **stronger red** for irreversible confirmations.

**Do** use the **chart ramp** for analytics consistency.

**Do** respect **system theme** and avoid animating global background or text colors on theme change.

**Don't** use the **rainbow accent hues** for errors, success, or primary CTAs in the core app chrome.

**Don't** rely on **low-contrast gray-on-gray** for primary actions — primary must invert cleanly between themes.

**Don't** mix **multiple sans-serif families** in one surface; use weight and size for hierarchy.

**Don't** block **touch** interactions with hover-only affordances on primary paths; mirror important actions for coarse pointers.
