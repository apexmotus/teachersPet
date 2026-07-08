-- Migration 001: lesson plan leadership review + updated_at
-- Run in Supabase SQL editor after the initial schema.sql

-- Allow DH/DP/Principal to approve submitted lesson plans
CREATE POLICY "lp_review_leadership" ON lesson_plans FOR UPDATE
  USING (school_id = get_my_school_id() AND is_leadership());

-- Track edits
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
