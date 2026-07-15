-- migration-002-phase2.sql
-- Phase 2: Timetable occurrences, Black Book, Reflections, Notifications, Staff Invitations
-- Apply via Supabase MCP: apply_migration

SET search_path = public;

-- ============================================================
-- NEW ENUM TYPES
-- ============================================================

CREATE TYPE public.black_book_severity AS ENUM ('minor', 'moderate', 'serious');
CREATE TYPE public.occurrence_status   AS ENUM ('upcoming', 'active', 'completed');
CREATE TYPE public.notification_type   AS ENUM (
  'lesson_plan_submitted',
  'lesson_plan_approved',
  'black_book_serious',
  'reflection_due'
);

-- ============================================================
-- NEW TABLE: lesson_occurrences
-- Bridges a recurring timetable slot to a specific calendar date.
-- One row per (slot, date) pair — created lazily, never bulk-inserted.
-- ============================================================

CREATE TABLE public.lesson_occurrences (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID              NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  timetable_slot_id UUID              NOT NULL REFERENCES public.timetable_slots(id) ON DELETE CASCADE,
  lesson_plan_id    UUID              REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
  date              DATE              NOT NULL,
  status            public.occurrence_status NOT NULL DEFAULT 'upcoming',
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (timetable_slot_id, date)
);

CREATE INDEX idx_lo_school_date ON public.lesson_occurrences (school_id, date);
CREATE INDEX idx_lo_slot        ON public.lesson_occurrences (timetable_slot_id);
CREATE INDEX idx_lo_lesson_plan ON public.lesson_occurrences (lesson_plan_id) WHERE lesson_plan_id IS NOT NULL;

ALTER TABLE public.lesson_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lo_read_school" ON public.lesson_occurrences
  FOR SELECT USING (school_id = public.get_my_school_id());

CREATE POLICY "lo_insert_own_slot" ON public.lesson_occurrences
  FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (
      public.is_leadership()
      OR timetable_slot_id IN (
        SELECT id FROM public.timetable_slots WHERE teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "lo_update_own" ON public.lesson_occurrences
  FOR UPDATE USING (
    school_id = public.get_my_school_id()
    AND (
      public.is_leadership()
      OR timetable_slot_id IN (
        SELECT id FROM public.timetable_slots WHERE teacher_id = auth.uid()
      )
    )
  );

-- ============================================================
-- NEW TABLE: reflections
-- One teacher reflection per day — upserted, never bulk-inserted.
-- ============================================================

CREATE TABLE public.reflections (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  notes      TEXT        NOT NULL CHECK (char_length(notes) >= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (teacher_id, date)
);

CREATE INDEX idx_ref_teacher_date ON public.reflections (teacher_id, date);
CREATE INDEX idx_ref_school_date  ON public.reflections (school_id, date);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_read_own" ON public.reflections
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "ref_read_leadership" ON public.reflections
  FOR SELECT USING (school_id = public.get_my_school_id() AND public.is_leadership());

CREATE POLICY "ref_insert_own" ON public.reflections
  FOR INSERT WITH CHECK (teacher_id = auth.uid() AND school_id = public.get_my_school_id());

CREATE POLICY "ref_update_own" ON public.reflections
  FOR UPDATE USING (teacher_id = auth.uid());

-- ============================================================
-- NEW TABLE: black_book_entries
-- Per-learner behavioral incidents. Principal annotates via principal_notes.
-- ============================================================

CREATE TABLE public.black_book_entries (
  id              UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID                     NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id      UUID                     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learner_id      UUID                     NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  class_id        UUID                     NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  occurrence_id   UUID                     REFERENCES public.lesson_occurrences(id) ON DELETE SET NULL,
  date            DATE                     NOT NULL,
  description     TEXT                     NOT NULL CHECK (char_length(description) >= 5),
  severity        public.black_book_severity NOT NULL DEFAULT 'minor',
  principal_notes TEXT,
  created_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX idx_bb_school   ON public.black_book_entries (school_id, date DESC);
CREATE INDEX idx_bb_learner  ON public.black_book_entries (learner_id);
CREATE INDEX idx_bb_teacher  ON public.black_book_entries (teacher_id);
CREATE INDEX idx_bb_serious  ON public.black_book_entries (school_id, severity)
  WHERE severity = 'serious';

ALTER TABLE public.black_book_entries ENABLE ROW LEVEL SECURITY;

-- Teachers read their own entries; leadership reads all school entries
CREATE POLICY "bb_read_own" ON public.black_book_entries
  FOR SELECT USING (
    teacher_id = auth.uid()
    OR (school_id = public.get_my_school_id() AND public.is_leadership())
  );

-- Any school member can insert with themselves as teacher
CREATE POLICY "bb_insert" ON public.black_book_entries
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid() AND school_id = public.get_my_school_id()
  );

-- Teacher can update their own entry only while principal_notes is null
CREATE POLICY "bb_update_own" ON public.black_book_entries
  FOR UPDATE USING (
    teacher_id = auth.uid() AND principal_notes IS NULL
  );

-- Principal can update any entry in their school (to add principal_notes)
CREATE POLICY "bb_update_principal" ON public.black_book_entries
  FOR UPDATE USING (
    school_id = public.get_my_school_id() AND public.get_my_role() = 'principal'
  );

-- ============================================================
-- NEW TABLE: notifications
-- In-app notifications — Supabase Realtime enabled below.
-- ============================================================

CREATE TABLE public.notifications (
  id         UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID                     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id  UUID                     NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  type       public.notification_type NOT NULL,
  title      TEXT                     NOT NULL,
  body       TEXT                     NOT NULL,
  data       JSONB                    NOT NULL DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_notif_user_all    ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_read_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Server actions insert for any user in their school (e.g., notify a teacher when a plan is approved)
CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT WITH CHECK (school_id = public.get_my_school_id());

CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Enable Realtime for live bell-icon updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- NEW TABLE: staff_invitations
-- Email invite tracking. Accepted when the invited user completes registration.
-- ============================================================

CREATE TABLE public.staff_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('teacher','dh','dp','principal')),
  invited_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, email)
);

CREATE INDEX idx_invite_school ON public.staff_invitations (school_id, created_at DESC);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_read" ON public.staff_invitations
  FOR SELECT USING (school_id = public.get_my_school_id() AND public.is_leadership());

CREATE POLICY "inv_insert" ON public.staff_invitations
  FOR INSERT WITH CHECK (school_id = public.get_my_school_id() AND public.is_leadership());

CREATE POLICY "inv_update" ON public.staff_invitations
  FOR UPDATE USING (school_id = public.get_my_school_id() AND public.is_leadership());

-- ============================================================
-- ALTER EXISTING: timetable_slots RLS
-- Drop leadership-only write policies; add teacher-scoped write policies.
-- ============================================================

DROP POLICY IF EXISTS "tt_manage" ON public.timetable_slots;
DROP POLICY IF EXISTS "tt_insert" ON public.timetable_slots;

-- Teachers can insert slots where they are the assigned teacher; leadership can insert any
CREATE POLICY "tt_insert_own" ON public.timetable_slots
  FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (teacher_id = auth.uid() OR public.is_leadership())
  );

-- Teachers can update/delete their own slots; leadership can manage any
CREATE POLICY "tt_update_own" ON public.timetable_slots
  FOR UPDATE USING (
    school_id = public.get_my_school_id()
    AND (teacher_id = auth.uid() OR public.is_leadership())
  );

CREATE POLICY "tt_delete_own" ON public.timetable_slots
  FOR DELETE USING (
    school_id = public.get_my_school_id()
    AND (teacher_id = auth.uid() OR public.is_leadership())
  );

-- ============================================================
-- ALTER EXISTING: attendance — add soft occurrence link
-- No FK constraint — manual attendance records remain clean.
-- ============================================================

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS occurrence_id UUID;

CREATE INDEX IF NOT EXISTS idx_att_occurrence
  ON public.attendance (occurrence_id)
  WHERE occurrence_id IS NOT NULL;

-- ============================================================
-- UPDATE: handle_new_user trigger
-- Now reads raw_user_meta_data.school_id and .role set by inviteUserByEmail,
-- and marks the matching staff_invitation as accepted.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_role      TEXT;
BEGIN
  v_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;
  v_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'teacher');

  -- Validate role; fall back to teacher if the value is invalid
  IF v_role NOT IN ('teacher', 'dh', 'dp', 'principal') THEN
    v_role := 'teacher';
  END IF;

  INSERT INTO public.profiles (id, school_id, role)
  VALUES (NEW.id, v_school_id, v_role)
  ON CONFLICT (id) DO NOTHING;

  -- Mark the invitation as accepted if one exists for this school + email
  IF v_school_id IS NOT NULL AND NEW.email IS NOT NULL THEN
    UPDATE public.staff_invitations
    SET accepted_at = NOW()
    WHERE school_id = v_school_id
      AND email     = NEW.email
      AND accepted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- GRANTS
-- Tables created via raw SQL need explicit grants (dashboard auto-grants, raw SQL does not).
-- ============================================================

GRANT ALL ON TABLE public.lesson_occurrences  TO authenticated;
GRANT ALL ON TABLE public.reflections         TO authenticated;
GRANT ALL ON TABLE public.black_book_entries  TO authenticated;
GRANT ALL ON TABLE public.notifications       TO authenticated;
GRANT ALL ON TABLE public.staff_invitations   TO authenticated;

GRANT USAGE ON TYPE public.black_book_severity TO authenticated;
GRANT USAGE ON TYPE public.occurrence_status   TO authenticated;
GRANT USAGE ON TYPE public.notification_type   TO authenticated;
