# Spec: Capture Forms — Learners, Attendance, Lesson Plans

**Status:** Draft for review
**Date:** 2026-07-06
**Scope decisions:** Attendance = today + past dates + notes. Learners = manual CRUD only (CSV import deferred). Lesson plans = create/edit + submit, minimal approve.

---

## 1. Goal

Give teachers working capture forms for the three core "Teach & Manage" flows:

1. **Learners** — add, edit, and remove learners and assign them to a class (foundational: attendance and lesson plans are meaningless without learners).
2. **Attendance** — extend the existing register to capture past dates and per-learner notes, and scope the class list to the teacher's own classes.
3. **Lesson plans** — create, edit, and submit lesson plans; DH/DP/Principal can see submitted plans and approve them.

### Non-goals (deferred)

- CSV/bulk learner import.
- Attendance history/analytics views.
- Lesson plan reviewer comments, rejection flow, or review audit trail (`reviewed_by`, timestamps).
- Class and subject management UI (assumed to exist in the DB; leadership seeds them via SQL for now — see Open Questions).
- Learner photos, guardians beyond a single `parent_contact` string.

---

## 2. Current state

| Area | State |
|---|---|
| `src/app/(app)/attendance/page.tsx` | Working. Server component loads classes → `AttendanceSheet` client component. Today-only, no notes, silent on save error, shows **all** school classes rather than the teacher's. |
| `src/app/(app)/learners/page.tsx` | Stub ("Coming in Phase 2"). |
| `src/app/(app)/lesson-plans/page.tsx` | Stub ("Coming in Phase 2"). |
| DB schema (`supabase/schema.sql`) | `learners`, `attendance`, `lesson_plans` tables all exist with RLS. `attendance.notes` and the `lesson_plans` status enum (`draft/submitted/approved`) are already in place. |
| Types (`src/lib/types/database.ts`) | Row/Insert/Update types exist for all three tables. |
| UI kit (`src/components/ui/`) | avatar, badge, button, card, dropdown-menu, input, label, separator. **Missing:** select, textarea, dialog, table. |

### Existing patterns — and the one we standardize on

The codebase currently has two mutation patterns:

- `attendance-sheet.tsx`: client-side Supabase (`@/lib/supabase/client`) directly from the component. RLS enforced.
- `actions/profile.ts`: server action using the **admin client** (`createAdminClient`), which bypasses RLS.

**Decision:** all new mutations are **server actions using the user-scoped server client** (`@/lib/supabase/server`), so RLS applies and validation lives in one place. Do **not** copy the admin-client pattern from `profile.ts` — it was needed there only because users update their own profile before RLS-relevant fields exist; it is not a template. Reads for initial page data happen in the server component; interactive re-fetches (e.g. switching class on the attendance sheet) may use the client SDK as today.

Server actions return the established discriminated union: `{ ok: true, ... } | { ok: false; error: string }`.

> ⚠️ Per `AGENTS.md`, this project's Next.js (16.2.9) has breaking changes vs. training data. **Before implementing, read the relevant guides in `node_modules/next/dist/docs/`** — at minimum the pages on server actions, `revalidatePath`, and dynamic route segments.

---

## 3. Shared prerequisites

### 3.1 New UI components

Add via shadcn (project already depends on `shadcn` + `@base-ui/react`):

- `select` — class/subject/status pickers
- `textarea` — objectives, activities, notes
- `dialog` — add/edit learner modal, delete confirmation
- `table` — learner list

### 3.2 Schema migration (`supabase/migrations/…` or appended to schema.sql per current convention)

```sql
-- Leadership must be able to approve submitted lesson plans.
-- Existing policies only allow the owning teacher to UPDATE.
CREATE POLICY "lp_review_leadership" ON lesson_plans FOR UPDATE
  USING (school_id = get_my_school_id() AND is_leadership());

-- updated_at for lesson plan edits
ALTER TABLE lesson_plans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

No changes needed for learners or attendance — existing tables and policies cover the chosen scope.

### 3.3 Class-scoping helper

Attendance and lesson plans both need "which classes does this teacher teach?". Add a shared server-side query helper `getTeacherClasses(userId, schoolId, role)`:

- **teacher:** classes joined through `class_teachers` (fallback: if the teacher has no `class_teachers` rows, show all school classes with a notice — schools won't have assignments seeded on day one).
- **dh/dp/principal:** all school classes.

Lives in `src/lib/queries/classes.ts` (new folder for shared server-side reads).

---

## 4. Feature: Learners CRUD

**Route:** `/learners` (replace stub)

### UX

- Server component loads the school's classes and learners (joined with class name), ordered by class then surname.
- Filter bar: class select (default "All classes") + free-text search on name/surname (client-side filter is fine at this scale).
- Table columns: #, Surname, Name, Class, Date of birth, Parent contact, row actions (Edit / Remove).
- "Add learner" button → dialog with form. Edit reuses the same dialog pre-filled.
- Remove → confirmation dialog. **Hard delete** (cascades to attendance and results via FK) — acceptable pre-launch; flag at delete time: "This removes the learner's attendance and assessment records."
- Empty state: "No learners yet. Add your first learner." with the Add button.

### Form fields

| Field | Required | Validation |
|---|---|---|
| Name | yes | non-empty, trimmed |
| Surname | yes | non-empty, trimmed |
| Class | yes | must be a class in the user's school |
| ID number | no | if present: exactly 13 digits (SA ID format; no checksum validation in v1) |
| Date of birth | no | valid date, not in the future |
| Parent contact | no | free text (phone or email) |

### Server actions (`src/app/actions/learners.ts`)

- `createLearner(payload)` — inserts with `school_id` from the caller's profile (never trusted from the client).
- `updateLearner(id, payload)` — same validation; class changes allowed.
- `deleteLearner(id)`
- All: re-derive `school_id` server-side, validate, `revalidatePath('/learners')`.

### Access

Existing RLS: any authenticated school member can manage learners of their school. Keep for v1 (small-school reality: teachers do their own admin). Revisit when roles harden.

### Acceptance criteria

- [ ] Teacher can add a learner with only name + surname + class and see them in the table without a manual refresh.
- [ ] Validation errors render inline in the dialog; the dialog stays open on error.
- [ ] Invalid ID number (≠13 digits) is rejected server-side, not just client-side.
- [ ] A newly added learner appears on the attendance sheet for their class.
- [ ] A user with no `school_id` sees the same "complete your profile" notice as the attendance page.

---

## 5. Feature: Attendance — past dates, notes, own classes

**Route:** `/attendance` (modify existing page + `AttendanceSheet`)

### Changes

1. **Date selection.** Add a date input above the sheet, default today, `max` = today (no future capture). Changing the date re-fetches that day's records; existing per-day pre-fill logic already generalizes (replace the `today` constant with the selected date).
2. **Weekend guard.** If the selected date is Sat/Sun, show a non-blocking notice ("Weekend date selected") but allow saving — schools have catch-up days.
3. **Per-learner notes.** Small note icon per row toggles an inline `Input` (persisted to `attendance.notes`); include `notes` in the upsert payload and pre-fill it on load.
4. **Own classes.** Page uses `getTeacherClasses` (§3.3) instead of all school classes.
5. **Error feedback.** Save failures currently vanish (`if (!error) setSaved(true)` and nothing else). Show an error state with the Supabase message and keep the unsaved changes intact.
6. **Move the save to a server action** `saveAttendance(classId, date, records)` in `src/app/actions/attendance.ts` per §2: validates date ≤ today, class belongs to the caller's school, then upserts on `(class_id, learner_id, date)`. The interactive learner/record fetch on class-switch stays client-side.

### Acceptance criteria

- [ ] Capturing yesterday's register and re-opening yesterday shows the saved statuses and notes.
- [ ] Future dates cannot be selected or saved (server-rejected too).
- [ ] A note saved for a learner survives a page reload.
- [ ] A failed save shows an error message and does not clear the marked statuses.
- [ ] A teacher with `class_teachers` rows sees only their classes; leadership sees all.

---

## 6. Feature: Lesson plans — create/edit + submit + minimal approve

**Routes:**
- `/lesson-plans` — list (replace stub)
- `/lesson-plans/new` — create form
- `/lesson-plans/[id]` — view/edit form

### List page

- Teachers: their own plans, newest `date` first, with status badge (draft = gray, submitted = blue, approved = green).
- DH/DP/Principal: two tabs (simple toggle, no tab component needed): "My plans" / "Submitted for review" — the latter lists school plans with status `submitted`.
- Each row: topic, class, subject, date, status → links to `/lesson-plans/[id]`.
- "New lesson plan" button.

### Form fields

| Field | Required | Notes |
|---|---|---|
| Class | yes | from `getTeacherClasses` |
| Subject | no | school subjects select (nullable in schema) |
| Date | yes | the lesson date; future allowed (plans are prepared ahead) |
| Topic | yes | input |
| Objectives | no | textarea |
| Activities | no | textarea |
| Resources | no | textarea |

`memo_url` (file upload) is **out of scope** — depends on storage buckets not yet provisioned; leave the column unused.

### Workflow

- Create → status `draft`.
- Owner can edit while `draft` or `submitted`; editing a `submitted` plan reverts it to `draft` (prevents post-submission edits going unnoticed). `approved` plans are read-only for the owner.
- Owner action: **Submit for review** (`draft → submitted`).
- Leadership action on a `submitted` plan: **Approve** button (`submitted → approved`). No comments/rejection in v1; to request changes, leadership tells the teacher offline and the teacher edits (which reverts to draft).

### Server actions (`src/app/actions/lesson-plans.ts`)

- `createLessonPlan(payload)` — `teacher_id` and `school_id` derived server-side; status forced to `draft`.
- `updateLessonPlan(id, payload)` — owner only (RLS enforces); sets `updated_at`; if current status is `submitted`, resets to `draft`.
- `submitLessonPlan(id)` — owner only; `draft → submitted` only.
- `approveLessonPlan(id)` — leadership only (new RLS policy §3.2); `submitted → approved` only. Status transitions validated server-side, not just in the UI.

### Acceptance criteria

- [ ] Teacher can create a draft, see it in their list, edit it, and submit it.
- [ ] Submitted plan appears in a DH's "Submitted for review" tab; Approve flips it to approved.
- [ ] A teacher cannot approve their own plan (no Approve button rendered, and the server action rejects non-leadership callers).
- [ ] Editing a submitted plan reverts it to draft.
- [ ] An approved plan renders read-only for the owning teacher.
- [ ] Without the new `lp_review_leadership` policy the approve action fails — migration is verifiably required.

---

## 7. Implementation order

1. **Prereqs** — UI components (§3.1), migration (§3.2), `getTeacherClasses` (§3.3). *Read the Next.js docs in `node_modules/next/dist/docs/` first.*
2. **Learners CRUD** — everything else depends on learner data existing.
3. **Attendance enhancements** — smallest delta, builds on working code.
4. **Lesson plans** — largest surface (3 routes, workflow).

Each step should end with a manual run-through against the local dev server (`npm run dev`, currently on :3001) using a seeded teacher + DH account.

## 8. Open questions

1. **Class/subject seeding:** there is no UI to create classes or subjects, and learners/lesson plans both require a class. Are classes seeded via SQL for the pilot school, or does a minimal "manage classes" screen need to precede this work?
2. **`class_teachers` assignments:** same question — without rows there, the teacher-scoping falls back to "all classes". Acceptable for pilot?
3. **Learner delete:** is hard delete acceptable once real attendance data exists, or should v1.1 add an `is_active` flag instead?
