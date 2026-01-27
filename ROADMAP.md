# Product Roadmap: Progression & UX Enhancements

> **Context**: This roadmap focuses on progression UX, realtime motivation, and engagement polish for a 1-1 video chat platform with level, streak, and prestige systems.

---

## A. Soft Prestige UX

### User-Facing Goal
Allow users who reach high levels (50+) to display rank + tier status in a way that feels prestigious but not intimidating. Prestige should signal commitment and experience without creating competitive pressure.

### When It Appears in the Journey
- **Early awareness** (Level 40+): Surface prestige concept subtly in progress page ("Prestige unlocks at Level 50")
- **Unlock moment** (Level 50): Celebrate first prestige transition with a dedicated moment (not a popup)
- **Persistent signals** (Post-prestige): Badge appears in profile, chat UI, and progress page

### UX Tone
- **Calm and refined**: Not flashy or loud
- **Subtle pride**: Users should feel accomplished but not pressured to grind
- **Progressive discovery**: Tiers (I → II → III) reveal slowly, not all at once
- **Non-intrusive**: Badges should enhance identity, not dominate the interface

### Signals Used
- **Level thresholds**: Prestige tiers unlock at specific levels (e.g., Prestige I at 50, II at 75, III at 100)
- **Accumulated EXP**: Total lifetime EXP can be a secondary signal for prestige progression
- **Streak milestones**: Optional bonus prestige progress for maintaining long streaks (100+ days)

### Surface Areas

#### 1. Progress Page
**When**: Post-Level 40  
**What**:
- Add a "Prestige Path" section below level/streak cards
- Show current rank tier (I, II, III) with a refined badge icon
- Display progress to next tier with a horizontal progress indicator
- Use muted colors (bronze/silver/gold tones) instead of bright colors
- Provide context: "Prestige shows your long-term dedication"

#### 2. Profile Display
**When**: Always visible (if user has prestige)  
**What**:
- Small badge next to avatar in sidebar user dropdown
- Badge appears in "Manage Account" section with tooltip: "Prestige Tier I"
- No animation on hover; just a static, elegant icon

#### 3. Chat UI (Idle & Active Call)
**When**: During idle state or active call  
**What**:
- **Idle state**: Show prestige badge next to level indicator (already displays level + streak)
- **Active call**: Partner's prestige badge appears next to their name (small, unobtrusive)
- Badge size: 16px desktop, 14px mobile
- Position: Inline with text, no separate row

#### 4. Call History
**When**: Viewing past calls  
**What**:
- Prestige badge appears next to partner's name in call history table
- Helps users recognize long-term members

### Celebration Strategy (No Popup Spam)

#### First Prestige (Level 50)
- **Moment**: When user hits Level 50, show a dedicated full-screen transition (like a level-up screen in RPGs)
- **Content**: "You've reached Prestige Tier I" with a refined animation (fade in, subtle scale)
- **Duration**: 3-4 seconds, auto-dismiss (no button required)
- **Sound**: Optional gentle chime (user can disable)
- **After**: Badge appears everywhere immediately

#### Subsequent Tiers (II, III)
- **Same approach**: Full-screen momentary celebration, then auto-dismiss
- **No repetition**: Once user sees prestige celebration, they expect it; keep it consistent

#### Avoid
- Toast notifications for prestige
- Badge animations that loop forever
- Popup modals requiring "OK" clicks
- Confetti or over-the-top effects

### Technical Approach
- **Frontend-only (Phase A)**: Display prestige based on level threshold calculation
- **Backend support (Phase C)**: Store prestige tier in user profile for persistence and optimization

---

## B. Realtime Progress Insights

### User-Facing Goal
Give users a sense of progression during and after calls without creating performance anxiety. Progress should feel rewarding, not like surveillance.

### When It Appears in the Journey
- **During call**: Minimal, ambient feedback
- **Post-call**: Summary of what was earned
- **Daily view**: "Today's progress" visible in idle state

### UX Tone
- **Encouraging, not pressuring**: "You earned 2 minutes of EXP" not "You need 8 more minutes"
- **Informative, not intrusive**: Updates should be discoverable, not forced
- **Subtle celebration**: Small wins matter (5 EXP earned = small pulse animation)

### Signals Used
- **Call duration**: Primary EXP driver (1 second of call = 1 EXP)
- **Streak status**: Today's streak completion state
- **Favorites bonus**: Real-time detection if call is with a favorite (bonus EXP multiplier)
- **Daily EXP total**: Cumulative EXP earned today

### What Updates Live During a Call

#### 1. Call Timer
**Current**: Displays call duration  
**Enhancement**: Add subtle EXP indicator  
**Design**:
- Timer shows "05:32" as usual
- Below timer (or next to it): "10 EXP earned" in muted text
- Updates every 5 seconds (not every second—too distracting)
- Color: Neutral (not green/red)

#### 2. Favorite Indicator
**When**: User is in a call with someone they've favorited  
**What**:
- Small icon next to partner's name: "⭐ Favorite" (or heart icon)
- Tooltip: "Favorite bonus: +20% EXP"
- If mutual favorite: "💕 Mutual favorite: +50% EXP"
- Does not flash or animate; just static presence

#### 3. Streak Progress (During Call)
**Where**: Not visible during call (too distracting)  
**Why**: Users should focus on conversation, not numbers  
**Exception**: If user is about to complete their daily streak (e.g., 1 minute away), show a tiny progress indicator in video controls area (optional, can be Phase B refinement)

### What Updates After Call Ends

#### 1. Post-Call Summary (New Component)
**When**: Immediately after call ends (before returning to idle state)  
**Duration**: 3-4 seconds, auto-dismiss  
**Content**:
- Call duration (e.g., "5:32")
- EXP earned (e.g., "+332 EXP")
- If favorite bonus applied: "+66 bonus EXP (Favorite)"
- If streak completed: "🔥 Streak completed today!"
- Level progress bar update (animate from old % to new %)

**Design**:
- Center of screen, semi-transparent overlay
- Simple card layout (no overwhelming stats)
- Fade in → pause 2s → fade out
- User can click anywhere to dismiss early

#### 2. Idle State Updates
**What**: After post-call summary, idle state refreshes to show:
- Updated level progress percentage
- Updated EXP earned today
- Streak status (complete/incomplete)

### "Today Progress" Without Pressure

#### Idle State Display
**Current**: Shows level, progress %, streak  
**Enhancement**:
- Add: "Today: 15 min EXP earned" below existing stats
- Use neutral language: "earned" not "need" or "remaining"
- No color coding (avoid red/yellow/green pressure signals)

#### Progress Page
**Current**: Shows "EXP earned today"  
**Keep as is**: This is the right place for detailed stats

### Visualizing EXP Gain Subtly During Calls

#### Option A: Progress Ring Around Avatar
**Where**: Remote peer's avatar (or local avatar in picture-in-picture)  
**What**: Thin circular progress ring that slowly fills during the call  
**Color**: Subtle gradient (not bright)  
**Update frequency**: Every 10 seconds  
**Purpose**: Ambient feedback without distraction

#### Option B: Glow Pulse
**Where**: Video frame border  
**What**: Gentle pulsing glow every 30 seconds  
**Purpose**: Subconscious reminder that progress is happening  
**Intensity**: Very low opacity (5-10%)

#### Recommended: Option A (Progress Ring)
More concrete, less abstract than glow pulse.

### Avoiding Cognitive Overload

#### Don't Show During Call
- Real-time EXP counter ticking up every second
- Streak countdown timer
- Level-up progress bar (too distracting)
- Popups or notifications

#### Do Show During Call
- Static indicators (favorite badge, prestige badge)
- Ambient progress signals (ring, occasional pulse)
- Call timer (already exists)

#### Save for Post-Call
- Detailed EXP breakdown
- Streak completion confirmation
- Level-up celebration

### Technical Approach
- **Phase A (Frontend-only)**: Calculate and display EXP based on call duration
- **Phase B (Backend signals)**: Backend sends real-time favorite bonus status via WebSocket
- **Phase C (Advanced)**: Live streak progress updates during call (if user opts in)

---

## C. Floating Video Polish

### User-Facing Goal
When users navigate away from `/chat` during an active call, the video should enter a floating mode that feels smooth, responsive, and unobtrusive.

### When It Appears in the Journey
- **Trigger**: User navigates to another page (e.g., `/user/progress`, `/connections/favorites`) while in an active call
- **Behavior**: Video minimizes to a corner, stays on top, allows user to restore full view anytime

### UX Tone
- **Fluid and responsive**: Animations should feel natural (easing curves, no jank)
- **Non-blocking**: Floating video should not obstruct important UI elements
- **Discoverable**: Users should immediately understand how to expand it back

### Signals Used
- **Navigation events**: Detect route change while in call
- **Audio activity**: Visual cues when remote peer is speaking
- **Idle time**: If floating video is idle for 60+ seconds, gently pulse to remind user

### Micro-Interactions

#### 1. Entering Floating Mode
**Animation**:
- Full video scales down to floating size (scale: 1 → 0.3)
- Simultaneous translation to corner (e.g., bottom-right)
- Duration: 400ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (standard material ease)
- Fade: Video controls fade out during transition

**Visual**:
- Shadow increases slightly to lift video off page
- Border radius increases (from 0 to 12px on desktop, 8px mobile)
- Overlay dim effect on background video fades out

#### 2. Exiting Floating Mode (Restore)
**Animation**:
- Reverse of entering (scale: 0.3 → 1, translate back to center)
- Duration: 350ms (slightly faster than entering)
- Easing: `cubic-bezier(0.2, 0, 0, 1)` (deceleration ease)
- Video controls fade in during last 100ms

**Trigger**:
- User clicks "Expand" button on floating video
- User clicks floating video frame (double-tap on mobile)
- User navigates back to `/chat`

#### 3. Dragging Floating Video
**Current**: Draggable to any corner  
**Enhancement**:
- **Snap to corners**: When user releases drag, snap to nearest corner with spring animation
- **Drag feedback**: Slight scale increase (1.05x) while dragging
- **Magnetic zones**: Corners have invisible zones (50px radius) that pull video into place
- **Haptic feedback** (mobile): Light haptic pulse when snapping to corner

**Animation**:
- Snap duration: 250ms
- Easing: `cubic-bezier(0.68, -0.55, 0.27, 1.55)` (spring back)

#### 4. Hover States (Desktop)
**Current**: Overlay appears on hover with "Expand" button  
**Enhancement**:
- **Hover transition**: Fade in over 150ms (no delay)
- **Unhover transition**: Fade out after 200ms delay
- **Button scale**: "Expand" button scales 1.0 → 1.05 on hover
- **Border glow**: Subtle glow around video frame on hover (optional)

#### 5. Audio Activity Feedback
**When**: Remote peer is speaking  
**What**:
- **Visual ring**: Thin circular border around floating video pulses in sync with audio levels
- **Color**: Accent color (matches theme)
- **Intensity**: Opacity oscillates between 0.3 and 0.8 based on volume
- **Update frequency**: 100ms (smooth, not choppy)
- **Disable if**: Video is being dragged or user is hovering

**Technical**:
- Use Web Audio API to detect audio activity
- Apply CSS `box-shadow` with dynamic opacity
- Throttle updates to avoid performance impact

### Animation Principles

#### Easing Curves
- **Enter animations**: Deceleration easing (slow down at end)
- **Exit animations**: Acceleration easing (speed up at end)
- **Snap/spring**: Overshoot easing (bounces slightly)

#### Duration Guidelines
- **Quick interactions** (hover, tap): 150-250ms
- **Layout transitions** (enter/exit floating): 350-450ms
- **Drag snap**: 200-300ms

#### Scale + Fade Combinations
- Always combine scale with fade for smoother perception
- Scale range: 0.9-1.1 (avoid extreme scales)

### Floating Video Behavior by Context

#### During Idle (No Match)
**Behavior**: Floating video should not appear (only active calls can float)

#### During Searching
**Behavior**: If user was in floating mode and call ended, exit floating mode immediately (no animation, instant transition)

#### During Navigation
**Desktop**:
- Floating video stays in corner as user browses other pages
- Video stays on top of all content (z-index: 9999)
- Clicking page content does not dismiss floating video

**Mobile**:
- Same as desktop, but smaller video size (120x160px vs 180x240px)
- Floating video should not block navigation elements (avoid top-right if nav menu is there)

#### During Call End
**Behavior**:
- When call ends, floating video fades out over 300ms
- User returns to full `/chat` page (idle state)

### Desktop vs Mobile Differences

| Feature               | Desktop                              | Mobile                                |
|-----------------------|--------------------------------------|---------------------------------------|
| Floating size         | 180x240px                            | 120x160px                             |
| Corner snap zones     | 50px radius                          | 40px radius                           |
| Hover interactions    | Yes (show expand button)             | No (use double-tap to expand)         |
| Drag sensitivity      | Standard                             | Higher sensitivity (easier to drag)   |
| Audio activity ring   | 2px border                           | 1.5px border                          |
| Expand button size    | 40px                                 | 36px                                  |

### Technical Approach
- **Phase A (Pure UX polish)**: Refine CSS animations, easing curves, hover states
- **Phase B (Audio activity)**: Integrate Web Audio API for speaking detection
- **Phase C (Advanced)**: Add drag physics (momentum, velocity-based snapping)

---

## D. Idle / Searching UX

### User-Facing Goal
When users are not matched, they should feel calm and engaged—not anxious or bored. The idle/searching states should provide gentle entertainment and motivation without overwhelming the user.

### When It Appears in the Journey
- **Idle**: User opens `/chat` but hasn't clicked "Start Chat"
- **Searching**: User clicked "Start Chat" and is waiting for a match

### UX Tone
- **Calm and patient**: Not frantic or urgent
- **Subtly motivating**: Gentle reminders of progression without pressure
- **Boredom-reducing**: Provide something to look at while waiting (but not distracting)

### Signals Used
- **Time waiting**: How long user has been searching (show after 10+ seconds)
- **Streak status**: Reminder of today's streak progress (if incomplete)
- **Level proximity**: If user is close to leveling up (e.g., 90%+), surface that
- **Peer activity**: Optional (Phase C): "50 people are chatting right now"

### What the User Sees When Not Matched

#### Idle State (Current)
**Content**:
- User avatar
- "Ready to start a chat?"
- Level, progress %, streak
- "Start Chat" button
- "You earn EXP by talking"

**Enhancements (Phase A)**:
- Add **today's EXP earned** below existing stats: "Today: 5 min EXP"
- If streak incomplete: Show "X minutes to complete streak" (gentle, not red/urgent)
- If close to level-up (90%+): Highlight progress percentage with subtle glow

#### Searching State (Current)
**Content**:
- "Finding someone new…"
- Animated dots (pulsing)
- Rotating hints: "You earn EXP by talking", "Skipping helps find better matches", "You can favorite people you like"

**Enhancements (Phase A)**:
- Add more hints (expand from 3 to 8-10)
- Include progression hints: "Long streaks unlock prestige tiers", "Favorites give bonus EXP"
- Add platform hints: "Navigate away—your video will float", "Use ⌘K to search"

**Enhancements (Phase B)**:
- After 10 seconds: Show "Still searching…" with estimated wait time (if backend supports)
- After 20 seconds: Rotate between hints and motivational stats ("Your longest streak: 12 days")
- After 30+ seconds: Offer alternative action: "Visit your progress page while you wait"

### Reducing Boredom While Waiting

#### Visual Interest (Static)
- **Background patterns**: Subtle animated gradient or noise texture (very low opacity)
- **Card depth**: Use shadow + blur to create depth (already present, keep it)

#### Visual Interest (Animated)
- **Breathing effect**: Card scales slightly (0.98 → 1.0) every 4 seconds (subtle)
- **Hint transitions**: Current fade-in is good; add slide-up effect (5px translate)

#### Interactive Elements (Phase B)
- **Mini calendar preview**: Show last 7 days of streak in searching state (collapsed view)
- **Level progress ring**: Display circular progress indicator during search

#### Avoid
- Timers counting up ("You've been waiting 45 seconds…")—creates anxiety
- Fast animations or flashing—creates stress
- Empty states—always show something (hints, stats, or encouragement)

### Gentle Progression Reminders (Level, Streak, Prestige)

#### Level Reminder
**When**: User is 85%+ to next level  
**What**: Idle state shows "Almost Level X!" with pulsing star icon  
**Tone**: Encouraging, not nagging

#### Streak Reminder
**When**: Streak incomplete and user is idle for 5+ minutes  
**What**: Hint rotates in: "Complete your streak today—X minutes needed"  
**Frequency**: Once per session (don't spam)

#### Prestige Reminder
**When**: User is Level 45+ (close to Prestige I)  
**What**: Idle state shows "5 levels to Prestige I" below level stats  
**Tone**: Aspirational, not grindy

### Static vs Animated

#### Static Elements
- User avatar
- "Start Chat" button (no pulse/glow)
- Level number
- Streak count
- Prestige badge (if applicable)

#### Animated Elements
- Searching dots (pulsing)
- Hint text (fade in/out + slide up)
- Background gradient (slow drift)
- Card breathing effect (very subtle scale)
- Progress ring (if shown, smooth rotation)

### What Disappears Instantly When Matched

#### Instant Removal
- "Finding someone new…" text
- Animated dots
- Hints text
- Any "Still searching" messages

#### Immediate Replacement
- Peer's video feed (as soon as available)
- "Connecting…" state (if peer video isn't ready yet)

#### Transition
- Searching card fades out over 200ms
- Video container fades in simultaneously (crossfade effect)

### Desktop vs Mobile Considerations

| Element                  | Desktop                              | Mobile                                |
|--------------------------|--------------------------------------|---------------------------------------|
| Card size                | max-w-sm (448px)                     | max-w-xs (320px)                      |
| Avatar size              | 64px                                 | 56px                                  |
| Button size              | h-14 (56px)                          | h-12 (48px)                           |
| Hint font size           | text-xs (12px)                       | text-xs (12px)                        |
| Stat display             | Single row                           | Wrapped (2 rows if needed)            |
| Background effects       | Enabled                              | Disabled (performance)                |

---

## 3. Phasing Strategy

### Phase A: Pure UX Polish (No Backend Required)
**Timeline**: Immediate (can start now)  
**Effort**: Low-Medium  
**Impact**: High (improves perceived quality)

**What to build**:
- Floating video animation refinements (easing curves, transitions)
- Idle/searching state enhancements (more hints, better layout)
- Post-call summary component (frontend-calculated EXP)
- Prestige badge display (calculate from level threshold)
- Progress page prestige section (static UI)

**Safe to do frontend-only**:
- All animation polish
- Hint rotations
- EXP display based on call duration (duration already tracked)
- Prestige tier calculation (if prestige = f(level))

**Deliverables**:
- Refined floating video with smooth animations
- Enhanced idle/searching states with more content
- Post-call EXP summary overlay
- Prestige badge UI components (no data persistence yet)

---

### Phase B: Light Realtime Signals (Minimal Backend)
**Timeline**: After Phase A  
**Effort**: Medium  
**Impact**: Medium (adds useful feedback)

**What to build**:
- Real-time favorite bonus detection (backend signals via WebSocket)
- Audio activity visualization (Web Audio API)
- "Still searching" timer with estimated wait (backend provides queue size)
- Backend stores prestige tier in user profile

**Backend additions needed**:
- WebSocket event: `favorite-bonus-active` (sent when call starts with favorited user)
- API endpoint: `/api/matchmaking/queue-status` (returns estimated wait time)
- Database: Add `prestigeTier` field to user profile

**Safe to delay**:
- Advanced realtime EXP tracking (not critical)
- Live streak progress during call (too distracting)

**Deliverables**:
- Favorite bonus indicator during calls
- Audio activity ring on floating video
- Smarter searching state with wait time estimates
- Prestige tier persisted in backend

---

### Phase C: Prestige & Long-Term Motivation (Full Feature)
**Timeline**: After Phase B  
**Effort**: High  
**Impact**: High (long-term engagement)

**What to build**:
- Full prestige system (tiers, progression, celebrations)
- Prestige badges in all surfaces (profile, chat, history)
- Advanced progression insights (weekly/monthly EXP reports)
- Peer activity signals ("X people online now")

**Backend additions needed**:
- Prestige level calculation logic
- Prestige celebration events
- Leaderboards (optional, if competitive)
- Analytics: Track prestige engagement metrics

**Ideas to delay (avoid feature bloat)**:
- Prestige-based matchmaking (match users with similar prestige)
- Prestige rewards (cosmetics, badges, perks)—wait for user feedback
- Prestige leaderboards—risk creating toxic competition

**Deliverables**:
- Complete prestige experience from Level 1 to Prestige III
- Prestige badges everywhere
- Celebration animations for tier unlocks
- Backend infrastructure for future prestige features

---

## 4. Explicit Constraints

### Frontend-Only (Safe to Build Now)
- Floating video animations (easing, transitions, hover states)
- Idle/searching UI enhancements (hints, stats, layout)
- Post-call summary overlay (calculate EXP from call duration)
- Prestige badge UI components (render based on level)
- Audio activity ring (Web Audio API, no backend)
- Progress page UI for prestige display

### Backend Support Needed Later
- Favorite bonus real-time detection (WebSocket event)
- Prestige tier persistence (database field)
- Matchmaking queue status (API endpoint)
- Prestige celebration triggers (backend events)
- Advanced EXP tracking (server-side validation)

### Delayed to Avoid Feature Bloat
- Prestige leaderboards (risk: toxic competition)
- Prestige-based matchmaking (risk: fragmented user base)
- Cosmetic rewards for prestige (risk: complexity creep)
- Real-time peer activity counters (risk: privacy concerns)
- Live streak progress during call (risk: distraction)
- EXP multiplier events (risk: gamification overload)

---

## 5. Success Metrics (Future Evaluation)

### Phase A (UX Polish)
- **Perceived quality**: User feedback on animations ("feels smooth")
- **Engagement**: Time spent on idle/searching states (should decrease boredom)
- **Floating video usage**: % of users who navigate away during calls

### Phase B (Realtime Signals)
- **Favorite bonus awareness**: % of users who notice favorite bonus indicator
- **Audio activity**: User feedback on speaking detection accuracy
- **Search patience**: Average wait time before users give up

### Phase C (Prestige System)
- **Prestige adoption**: % of Level 50+ users who engage with prestige
- **Long-term retention**: Do prestige users stay longer?
- **Celebration effectiveness**: Do users dismiss prestige celebrations early?

---

## 6. Design Principles

### General Rules
1. **Subtle over flashy**: Progression should feel calm, not like a casino
2. **Informative over intrusive**: Show stats, don't force them on users
3. **Rewarding over demanding**: Celebrate progress, don't nag about incomplete goals
4. **Ambient over active**: During calls, focus on conversation, not numbers

### Specific Guidelines
- **Animations**: 150-450ms durations, ease-out for entrances, ease-in for exits
- **Colors**: Neutral tones for progress signals (avoid red/yellow alarm colors)
- **Typography**: Muted foreground for stats, bold only for key numbers
- **Spacing**: Use white space to reduce cognitive load
- **Accessibility**: Ensure color contrasts meet WCAG AA standards

---

## Appendix: Future Ideas (Beyond This Roadmap)

### Community Features
- Weekly EXP challenges ("Earn 60 minutes this week")
- Streak milestones rewards (100-day streak = special badge)
- Favorite-based mini-network ("Your favorites have favorited 12 others")

### Advanced Progression
- Skill trees (unlock chat features via EXP)
- Daily quests ("Complete 3 calls today")
- Seasonal events (double EXP weekends)

### Social Proof
- Anonymous aggregate stats ("1,234 calls happened today")
- Trending topics (based on chat keywords)
- "Most favorited users this week" (privacy-safe leaderboard)

**Note**: All appendix ideas should be evaluated for user demand before building.
