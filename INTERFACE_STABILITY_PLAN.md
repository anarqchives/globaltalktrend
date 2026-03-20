# GTT Monitor Interface Stability & Usability Plan

## Product Vision

Transform GTT Monitor into a stable, accessible global awareness platform where any user can understand world events in seconds. The interface must feel calm, predictable, and trustworthy—never chaotic or overwhelming.

**Core Principle**: The Timeline is the heart of the platform. Everything else supports it.

---

## Strategic Epics

### Epic 1: Trend Radar Stability & Collapsibility
**Goal**: Create a predictable, non-disruptive radar module that enhances rather than blocks the timeline.

### Epic 2: Unified Heatmap Integration
**Goal**: Move the Temporal Heatmap inside the Trend Radar as an interactive intelligence layer.

### Epic 3: Interaction Design System
**Goal**: Establish consistent, accessible button and link styles across light and dark modes.

### Epic 4: Translation Completeness
**Goal**: Ensure 100% Portuguese coverage for all interface elements.

### Epic 5: Real-Time Update Integrity
**Goal**: Prevent layout shifts during data updates.

---

## Epic 1: Trend Radar Stability & Collapsibility

### User Stories

#### US-1.1: Fixed Radar Height
**As a** user browsing trends  
**I want** the Trend Radar to maintain a consistent height  
**So that** the timeline doesn't jump when data updates

**Acceptance Criteria**:
- [ ] Radar container has `min-height: 280px` and `max-height: 320px`
- [ ] Content overflow is handled with internal scrolling
- [ ] Data updates animate within the fixed container
- [ ] No Cumulative Layout Shift (CLS) when tabs switch

#### US-1.2: Collapsible Radar
**As a** user focused on reading the timeline  
**I want** to collapse the Trend Radar module  
**So that** I can maximize timeline visibility

**Acceptance Criteria**:
- [ ] Collapse button with clear icon (ChevronUp/ChevronDown)
- [ ] Collapsed state shows only a thin header bar (~40px)
- [ ] Collapse state persists in localStorage
- [ ] Smooth animation (200ms ease-out)
- [ ] Keyboard accessible (Enter/Space to toggle)

#### US-1.3: Three-Tab Structure
**As a** user exploring trends  
**I want** exactly three clear categories  
**So that** I understand the signal hierarchy

**Acceptance Criteria**:
- [ ] Tabs: "Emerging Signals", "Critical Alerts", "Top Trends"
- [ ] Each tab has a short explanation legend visible below tabs
- [ ] Remove any duplicate "Top Trends" sections outside the radar
- [ ] Tab counts show number of items in each category

**Tab Legends**:
```
Emerging Signals: "Early signals detected in the last 2 hours across multiple platforms."
Critical Alerts: "High-velocity trends confirmed by diverse sources."
Top Trends: "Most discussed topics globally in the selected time window."
```

---

## Epic 2: Unified Heatmap Integration

### User Stories

#### US-2.1: Heatmap Inside Radar
**As a** analyst user  
**I want** the heatmap integrated into the Trend Radar  
**So that** geographic intelligence is contextually connected

**Acceptance Criteria**:
- [ ] Heatmap appears as a collapsible section within Radar
- [ ] Toggle button: "Show Activity Map" / "Hide Activity Map"
- [ ] Heatmap shows 24h × 7 regions grid
- [ ] Visual connection to selected radar tab (filtered data)

#### US-2.2: Interactive Heatmap Cells
**As a** user exploring regional trends  
**I want** to hover on heatmap cells for details  
**So that** I understand where signals are emerging

**Acceptance Criteria**:
- [ ] Hover tooltip shows: Region, Time window, Trend count, Top trend title
- [ ] Cell color intensity reflects signal density
- [ ] Click on cell filters timeline to that region/time
- [ ] Color scale legend with labels: "Low" → "High"

#### US-2.3: Heatmap Legend
**As a** first-time user  
**I want** a clear legend explaining the heatmap  
**So that** I can read the visualization correctly

**Acceptance Criteria**:
- [ ] Legend positioned below heatmap
- [ ] Text: "This heatmap shows trend activity across regions over the last 24 hours. Brighter cells indicate higher signal concentration."
- [ ] Color scale bar with numeric labels
- [ ] Accessible contrast in both light/dark modes

---

## Epic 3: Interaction Design System

### Design Tokens

```css
/* Primary Actions (Submit, Refresh, Save) */
.btn-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
  @apply h-9 px-4 rounded-md font-medium;
  @apply transition-colors duration-150;
}

/* Secondary Actions (Cancel, Close, Alternative) */
.btn-secondary {
  @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
  @apply h-9 px-4 rounded-md font-medium;
}

/* Ghost Actions (Toolbar, Compact UI) */
.btn-ghost {
  @apply hover:bg-accent hover:text-accent-foreground;
  @apply h-8 px-3 rounded-md;
}

/* Outline Actions (Filters, Tags) */
.btn-outline {
  @apply border border-input bg-background hover:bg-accent;
  @apply h-8 px-3 rounded-md text-sm;
}

/* Action Links */
.action-link {
  @apply text-primary underline-offset-4 hover:underline;
  @apply font-medium cursor-pointer;
}

/* Tags/Chips */
.tag {
  @apply inline-flex items-center gap-1;
  @apply px-2 py-0.5 rounded-full text-xs font-medium;
  @apply bg-muted text-muted-foreground;
}

.tag-interactive {
  @apply tag cursor-pointer hover:bg-accent;
}
```

### User Stories

#### US-3.1: Consistent Button Hierarchy
**As a** user interacting with the platform  
**I want** buttons to have clear visual hierarchy  
**So that** I know which actions are primary vs secondary

**Acceptance Criteria**:
- [ ] Primary buttons use `bg-primary` with high contrast text
- [ ] Secondary buttons use `bg-secondary` with subtle styling
- [ ] Ghost buttons only show on hover
- [ ] All buttons have `h-8` or `h-9` consistent height
- [ ] Focus states visible with ring indicator

#### US-3.2: Dark Mode Contrast
**As a** user in dark mode  
**I want** all interactive elements clearly visible  
**So that** I can navigate without eye strain

**Acceptance Criteria**:
- [ ] Minimum contrast ratio 4.5:1 for text on buttons
- [ ] Icons use `currentColor` to inherit text color
- [ ] Borders visible with `border-border` token
- [ ] Hover states provide clear feedback
- [ ] Active/pressed states distinguishable

#### US-3.3: Clickable Element Recognition
**As a** user scanning the interface  
**I want** to instantly recognize clickable elements  
**So that** I don't miss interactive features

**Acceptance Criteria**:
- [ ] Links use underline or distinct color
- [ ] Buttons have consistent padding and rounded corners
- [ ] Interactive cards show hover elevation/border change
- [ ] Cursor changes to pointer on all clickables
- [ ] Touch targets minimum 44px on mobile

---

## Epic 4: Translation Completeness

### Translation Audit Checklist

#### Navigation & Header
- [ ] Logo text / Brand name
- [ ] Language selector label
- [ ] Theme toggle tooltip
- [ ] Refresh button tooltip
- [ ] User menu items
- [ ] "Support" / "Apoie" button

#### Trend Radar
- [ ] Tab labels (Emerging, Critical, Top)
- [ ] Tab legends/descriptions
- [ ] Empty state messages
- [ ] "Show/Hide" toggles
- [ ] Heatmap legend text

#### Timeline
- [ ] Section headers (Now, Last 2h, Last 24h)
- [ ] "Load more" button
- [ ] Empty state message
- [ ] Card labels (Source, Region, Growth)
- [ ] Time ago formatting

#### Cards
- [ ] "Share" button/tooltip
- [ ] "Save" button/tooltip
- [ ] "Expand" action
- [ ] Trust badges
- [ ] Category labels

#### Filters
- [ ] Filter labels (Country, Category, Period, Type)
- [ ] Placeholder texts
- [ ] "Clear filters" button
- [ ] "Apply" button

#### Modals & Tooltips
- [ ] About modal content
- [ ] Login modal text
- [ ] All tooltip strings
- [ ] Error messages
- [ ] Success toasts

### User Stories

#### US-4.1: Complete Portuguese Interface
**As a** Portuguese-speaking user  
**I want** the entire interface in my language  
**So that** I can use the platform without confusion

**Acceptance Criteria**:
- [ ] All navigation items translated
- [ ] All button labels translated
- [ ] All tooltips translated
- [ ] All section titles translated
- [ ] All placeholder texts translated
- [ ] Date/time formatting localized

#### US-4.2: Centralized Translation Keys
**As a** developer maintaining translations  
**I want** all strings in LanguageContext  
**So that** translations are consistent and maintainable

**Acceptance Criteria**:
- [ ] No hardcoded strings in components
- [ ] All new features add translation keys
- [ ] Fallback to Portuguese if key missing
- [ ] Type-safe translation keys (TypeScript)

---

## Epic 5: Real-Time Update Integrity

### User Stories

#### US-5.1: Non-Disruptive Radar Updates
**As a** user reading the radar  
**I want** updates to happen smoothly  
**So that** content doesn't jump unexpectedly

**Acceptance Criteria**:
- [ ] New items animate in from opacity 0 → 1
- [ ] Removed items fade out before removal
- [ ] Container height remains fixed
- [ ] Update interval: every 60 seconds (not continuous)

#### US-5.2: Interaction-Aware Updates
**As a** user with an expanded card  
**I want** updates to pause  
**So that** my reading isn't interrupted

**Acceptance Criteria**:
- [ ] Updates pause when any card is expanded
- [ ] Updates pause when user is scrolling (debounced)
- [ ] "New trends available" notification appears
- [ ] Manual refresh button always available
- [ ] Resume updates when card closes

#### US-5.3: Timeline Stability
**As a** user scrolling the timeline  
**I want** new items to queue above  
**So that** my scroll position is preserved

**Acceptance Criteria**:
- [ ] New items added to a pending queue
- [ ] Queue count shown in notification badge
- [ ] Click "Load new" injects items at top
- [ ] Scroll position maintained during injection
- [ ] No layout shift during normal browsing

---

## Implementation Priority

### Phase 1: Stability Foundation (Week 1)
1. Fix Radar container height (US-1.1)
2. Add collapse functionality (US-1.2)
3. Clean up to three tabs only (US-1.3)

### Phase 2: Design System (Week 2)
4. Implement button hierarchy (US-3.1)
5. Fix dark mode contrast (US-3.2)
6. Audit clickable elements (US-3.3)

### Phase 3: Heatmap Integration (Week 3)
7. Move heatmap into Radar (US-2.1)
8. Add interactive cells (US-2.2)
9. Create heatmap legend (US-2.3)

### Phase 4: Polish (Week 4)
10. Complete translation audit (US-4.1, US-4.2)
11. Implement update integrity (US-5.1, US-5.2, US-5.3)
12. Final accessibility review

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Cumulative Layout Shift | High | < 0.1 |
| Time to understand a trend | ~10s | < 3s |
| Dark mode contrast ratio | Variable | ≥ 4.5:1 |
| Translation coverage | ~80% | 100% |
| User-reported confusion | Unknown | Decrease 50% |

---

## Technical Notes

### Radar Height Strategy
```tsx
<div className="min-h-[280px] max-h-[320px] overflow-hidden">
  <div className="h-full overflow-y-auto scrollbar-thin">
    {/* Radar content */}
  </div>
</div>
```

### Collapse State Persistence
```tsx
const [radarCollapsed, setRadarCollapsed] = useState(() => {
  return localStorage.getItem('radar-collapsed') === 'true';
});

useEffect(() => {
  localStorage.setItem('radar-collapsed', String(radarCollapsed));
}, [radarCollapsed]);
```

### Update Queue Pattern
```tsx
const [pendingTrends, setPendingTrends] = useState<TrendCardProps[]>([]);
const [isUserInteracting, setIsUserInteracting] = useState(false);

// When new data arrives
if (isUserInteracting) {
  setPendingTrends(prev => [...newTrends, ...prev]);
} else {
  setTrends(newTrends);
}
```

---

## Appendix: Translation Keys to Add

```typescript
// LanguageContext additions
const newKeys = {
  // Radar
  radar_collapse: "Recolher radar",
  radar_expand: "Expandir radar",
  radar_emerging_legend: "Sinais detectados nas últimas 2 horas em múltiplas plataformas.",
  radar_critical_legend: "Tendências de alta velocidade confirmadas por fontes diversas.",
  radar_top_legend: "Assuntos mais discutidos globalmente na janela de tempo selecionada.",
  
  // Heatmap
  heatmap_show: "Mostrar mapa de atividade",
  heatmap_hide: "Ocultar mapa de atividade",
  heatmap_legend: "Este mapa mostra a atividade de tendências por região nas últimas 24 horas.",
  heatmap_low: "Baixa",
  heatmap_high: "Alta",
  
  // Updates
  new_trends_available: "Novas tendências disponíveis",
  load_new_trends: "Carregar novas",
  
  // Accessibility
  collapse_section: "Recolher seção",
  expand_section: "Expandir seção",
};
```
