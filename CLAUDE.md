You build React Frontend with Living Apps Backend.

## Tech Stack
- React 18 + TypeScript (Vite)
- shadcn/ui + Tailwind CSS v4
- recharts for charts
- date-fns for date formatting
- Living Apps REST API

## Your Users Are NOT Developers

Your users don't understand code or UI design. Their requests will be simple and vague.
**Your job:** Interpret what they actually need and create a beautiful, functional app that makes them say "Wow, das ist genau was ich brauche!"

## Workflow: Analyze, Implement, Deploy

### Step 1: Analyze (1-2 sentences)
Read `.scaffold_context` and `app_metadata.json`. Decide in 1-2 sentences which UI paradigm fits best for the user's core workflow and WHY. Then go straight to implementation.

### Step 2: Implement
Follow `.claude/skills/frontend-impl/SKILL.md` to build DashboardOverview.tsx with the chosen UI paradigm. Edit Layout.tsx (title only). index.css is pre-generated — do NOT touch it.

### Step 3: Build
Run `npm run build`. If it fails, fix the errors and retry until the build succeeds.
Deployment happens automatically after you finish — do NOT deploy manually.

**WRITE ONCE RULE:** Write/edit each file ONCE. Do NOT write a file, read it back, then rewrite it.

**NEVER USE BASH FOR FILE OPERATIONS.** No `cat`, `echo`, `heredoc`, `>`, `>>`, `tee`, or any other shell command to read or write source files. ALWAYS use Read/Write/Edit tools. If a tool call fails, fix the issue and retry with the SAME tool — do NOT fall back to Bash.


---

## Pre-Generated CRUD Scaffolds

The following files are **pre-generated** and provide a complete React Router app with full CRUD for all entities:

- `src/App.tsx` — HashRouter with all routes configured
- `src/components/Layout.tsx` — Sidebar navigation with links to all pages
- `src/components/PageShell.tsx` — Consistent page header wrapper
- `src/pages/DashboardOverview.tsx` — Skeleton with data hook, enrichment, loading/error (**you fill the content!**)
- `src/hooks/useDashboardData.ts` — Central hook: fetches all entities, provides lookup maps, loading/error state
- `src/types/enriched.ts` — Enriched types with resolved display names (e.g. `EnrichedKurse` with `dozentName`)
- `src/lib/enrich.ts` — `enrichX()` functions to resolve applookup fields to display names
- `src/lib/formatters.ts` — `formatDate()`, `formatCurrency()`, `displayLookup()`, `displayMultiLookup()`, `lookupKey()`, `lookupKeys()` (locale-aware)
- `src/lib/ai.ts` — AI utilities: `chatCompletion`, `classify`, `extract`, `summarize`, `translate`, `analyzeImage`, `extractFromPhoto`, `fileToDataUri`
- `src/lib/chat-context.ts` — App-specific AI assistant system prompt
- `src/components/ChatWidget.tsx` — Floating AI chat assistant (included in Layout)
- `src/config/ai-features.ts` — AI photo scan toggles per entity (**you can edit this!**)
- `src/pages/{Entity}Page.tsx` — Full CRUD pages per entity (table, search, create/edit/delete)
- `src/components/dialogs/{Entity}Dialog.tsx` — Create/edit forms with correct field types
- `src/components/ConfirmDialog.tsx` — Delete confirmation
- `src/components/StatCard.tsx` — Reusable KPI card
- `src/pages/AdminPage.tsx` — Admin view: tabbed data management for all entities, column filters, multi-select, bulk actions (delete, edit field)
- `src/components/dialogs/BulkEditDialog.tsx` — Bulk edit dialog for admin view (pick field, set value, apply to selected records)

### YOUR JOB

The CRUD pages provide basic list-based CRUD as a fallback. **Your job is to build the dashboard as the app's primary workspace** — where users actually DO their work, not just view stats.

**The dashboard is NOT an info page.** It must provide the core workflow with the UI paradigm that fits the data best. Ask: "What is the most natural way for a user to interact with THIS data?" A generic list/table is almost never the answer. Build an interactive, domain-specific component with full create/edit/delete directly in it.

### Rules for Pre-Generated Files

- **DashboardOverview.tsx** — You MUST call `Read("src/pages/DashboardOverview.tsx")` FIRST. Then call `Write` ONCE with the complete new content. Do NOT read it back after writing. Do NOT use Bash cat/echo — use ONLY Read and Write tools. The skeleton already has `useDashboardData()`, enrichment, loading/error — keep that pattern, replace the empty content div.
- **Rules of Hooks** — ALL hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) MUST be placed BEFORE any early returns (`if (loading) return ...`, `if (error) return ...`). Placing hooks after early returns causes React error #310 at runtime.
- **Reuse pre-generated dialogs in DashboardOverview** — When the dashboard needs create/edit dialogs, ALWAYS import and reuse the pre-generated `{Entity}Dialog` from `@/components/dialogs/{Entity}Dialog`. Do NOT build custom dialog forms — they lack photo scan, validation, and all field types. Example: `import { KurseDialog } from '@/components/dialogs/KurseDialog';`
- **index.css** — NEVER touch. Pre-generated design system (font, colors, sidebar theme). Use existing tokens.
- **Layout.tsx** — NEVER Write, only Edit (title/subtitle only).
- **useDashboardData.ts, enriched.ts, enrich.ts, formatters.ts, ai.ts, chat-context.ts, ChatWidget.tsx** — NEVER touch. Use as-is.
- **`src/config/ai-features.ts`** — You MAY edit this file. Set `AI_PHOTO_SCAN['EntityName']` to `true` to enable the "Foto scannen" button in that entity's dialog. The button lets users photograph a document/receipt/card and auto-fill form fields via AI.
- **CRUD pages and dialogs** — NEVER touch. Complete with all logic.
- **App.tsx** — NEVER touch. Routes are pre-configured.
- **PageShell.tsx, StatCard.tsx, ConfirmDialog.tsx** — NEVER touch.
- **AdminPage.tsx, BulkEditDialog.tsx** — NEVER touch. Pre-generated admin panel with filters, multi-select, and bulk actions.

### Pre-Generated Component APIs (exact props — do NOT guess or Read to check)

**`{Entity}Dialog`** — always this exact interface:
```tsx
<KurseDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onSubmit={async (fields) => { await LivingAppsService.createKurseEntry(fields); fetchAll(); }} // dialog closes itself on success
  defaultValues={editRecord?.fields}         // undefined = create, fields = edit
  dozentenList={dozenten}                    // list prop name = {entityIdentifier}List — EXACTLY matching useDashboardData key
  raeumeList={raeume}                        // e.g. dozenten → dozentenList, raeume → raeumeList (NOT dozentList/raumList)
  enablePhotoScan={AI_PHOTO_SCAN['Kurse']}   // import AI_PHOTO_SCAN from '@/config/ai-features'
/>
```

**Applookup `defaultValues` need full record URLs — NEVER raw IDs:**
```tsx
// ❌ WRONG — raw ID breaks the Select
defaultValues={{ kurs: selectedKursId }}

// ✅ CORRECT — full URL, same format the API stores
import { APP_IDS } from '@/types/app';
import { createRecordUrl } from '@/services/livingAppsService';
defaultValues={{ kurs: createRecordUrl(APP_IDS.KURSE, selectedKursId) }}
```

**`StatCard`** — `icon` must be rendered JSX, NOT a component reference:
```tsx
// ✅ CORRECT
<StatCard title="Kurse" value="42" description="Gesamt" icon={<BookOpen size={18} className="text-muted-foreground" />} />
// ❌ WRONG
<StatCard icon={BookOpen} />
```

**`ConfirmDialog`** — uses `onClose` (not `onCancel`):
```tsx
<ConfirmDialog
  open={!!deleteTarget}
  title="Eintrag löschen"
  description="Wirklich löschen?"
  onConfirm={handleDelete}
  onClose={() => setDeleteTarget(null)}
/>
```

### What the scaffolds already handle (DON'T redo these)

- All UI text auto-detected in correct language (German/English)
- PageShell wrapper with consistent headers on all pages
- Layout with sidebar using semantic tokens (bg-sidebar, text-sidebar-foreground, etc.)
- Date formatting via `formatDate()` in `src/lib/formatters.ts`
- Currency formatting via `formatCurrency()` in `src/lib/formatters.ts`
- Lookup fields pre-enriched to `{ key, label }` objects — access `.label` directly, no formatters needed
- Applookup fields resolved to display names via `enrichX()` in `src/lib/enrich.ts`
- Data fetching + lookup maps via `useDashboardData()` hook
- Loading/error states in DashboardOverview.tsx
- Boolean fields with styled badges
- Search, create, edit, delete with confirm dialog
- React Router with HashRouter (works on any path, no server-side routing needed)
- Responsive mobile sidebar with overlay

**Generated components use semantic tokens** — the pre-generated `index.css` design system (Plus Jakarta Sans, indigo palette, dark sidebar) applies to all components automatically. Do NOT edit it.

---

## Existing Files (DO NOT recreate!)

| Path | Content |
|------|---------|
| `src/index.css` | Design system (font, colors, tokens) — DO NOT edit |
| `src/types/app.ts` | TypeScript interfaces (lookup fields typed as `LookupValue`), APP_IDS, LOOKUP_OPTIONS |
| `src/types/enriched.ts` | Enriched types with resolved display names |
| `src/services/livingAppsService.ts` | API Service with typed CRUD methods |
| `src/hooks/useDashboardData.ts` | Central data hook (fetch, maps, loading/error) |
| `src/lib/enrich.ts` | `enrichX()` functions for applookup resolution |
| `src/lib/formatters.ts` | `formatDate()`, `formatCurrency()`, `displayLookup()`, `displayMultiLookup()`, `lookupKey()`, `lookupKeys()` |
| `src/lib/ai.ts` | AI helpers: `chatCompletion`, `classify`, `extract`, `summarize`, `translate`, `analyzeImage`, `extractFromPhoto`, `fileToDataUri` |
| `src/lib/chat-context.ts` | App-specific system prompt for AI assistant |
| `src/components/ChatWidget.tsx` | Floating AI chat assistant (in Layout) |
| `src/config/ai-features.ts` | AI feature toggles — **editable** (photo scan per entity) |
| `src/App.tsx` | React Router with all routes |
| `src/components/Layout.tsx` | Sidebar navigation |
| `src/components/PageShell.tsx` | Page header wrapper |
| `src/pages/*Page.tsx` | CRUD pages per entity |
| `src/components/dialogs/*Dialog.tsx` | Create/edit dialogs |
| `src/components/ConfirmDialog.tsx` | Delete confirmation |
| `src/components/StatCard.tsx` | KPI card |
| `src/pages/AdminPage.tsx` | Admin view: tabbed data management, filters, multi-select, bulk actions |
| `src/components/dialogs/BulkEditDialog.tsx` | Bulk edit dialog for admin (field picker + value input) |
| `src/components/ui/*` | shadcn components |
| `app_metadata.json` | App metadata |

---

## Critical API Rules (MUST follow!)

### Date Formats (STRICT!)

| Field Type | Format | Example |
|------------|--------|---------|
| `date/date` | `YYYY-MM-DD` | `2025-11-06` |
| `date/datetimeminute` | `YYYY-MM-DDTHH:MM` | `2025-11-06T12:00` |

**NO seconds** for `datetimeminute`! `2025-11-06T12:00:00` will FAIL.

### lookup Fields

Lookup fields are **pre-enriched** to `{ key, label }` objects by `LivingAppsService`. You can access the label directly:

```typescript
// Single lookup (lookup/select, lookup/radio) — type: LookupValue
<span>{record.fields.kursart?.label}</span>       // → "Restorative"

// Multi lookup (multiplelookup/checkbox) — type: LookupValue[]
<span>{record.fields.tags?.map(v => v.label).join(', ')}</span>  // → "Yoga, Pilates"

// Access the raw key when needed (e.g. for filtering, conditionals):
record.fields.kursart?.key  // → "restorative"
```

**When writing to the API** (create/update), send plain key strings — the pre-generated dialogs handle this automatically.

### applookup Fields

`applookup/select` fields store full URLs: `https://my.living-apps.de/rest/apps/{app_id}/records/{record_id}`

```typescript
const recordId = extractRecordId(record.fields.category);
if (!recordId) return; // Always null-check!

const data = {
  category: createRecordUrl(APP_IDS.CATEGORIES, selectedId),
};
```

### API Response Format

Returns **object**, NOT array. Use `Object.entries()` to extract `record_id`.

### TypeScript Import Rules

```typescript
// ❌ WRONG
import { Habit } from '@/types/app';

// ✅ CORRECT
import type { Habit } from '@/types/app';
```

### shadcn Select

```typescript
// ❌ WRONG - Runtime error!
<SelectItem value="">None</SelectItem>

// ✅ CORRECT
<SelectItem value="none">None</SelectItem>
```

### Using the Data Hook

Data fetching is pre-generated. Use the `useDashboardData()` hook in DashboardOverview.tsx:

```typescript
const { habits, enrichedHabits, loading, error, fetchAll } = useDashboardData();
```

For CRUD operations, call `LivingAppsService` then refresh:

```typescript
const handleAdd = async (data) => {
  await LivingAppsService.createHabit(data);
  fetchAll();
};

const handleDelete = async (id) => {
  await LivingAppsService.deleteHabit(id);
  fetchAll();
};
```

### AI Features (pre-generated — just import)

All AI utilities are in `src/lib/ai.ts`. Import what you need:

```typescript
import { classify, extract, summarize, translate, analyzeImage, extractFromPhoto, fileToDataUri } from '@/lib/ai';

// Classify text into categories
const { category } = await classify(text, ["bug", "feature", "question"]);

// Extract structured data from text
const data = await extract(text, '{"name": "string", "amount": "number"}');

// Auto-fill form from uploaded photo
const file = e.target.files[0];
const uri = await fileToDataUri(file);
const fields = await extractFromPhoto(uri, '{"product": "string", "price": "number"}');
```

## Build
After completion: Run `npm run build` to create the production bundle. Deployment is handled automatically by the service.
