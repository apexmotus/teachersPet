-- Migration 001: lesson plan leadership review + updated_at
-- Run in Supabase SQL editor after the initial schema.sql

SET search_path = public;

-- Allow DH/DP/Principal to approve submitted lesson plans
CREATE POLICY "lp_review_leadership" ON public.lesson_plans FOR UPDATE
  USING (public.get_my_school_id() = school_id AND public.is_leadership());

-- Track edits
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
