-- ==============================================================================
-- BoardBuddy: Verification Queue & RLS Repair Script (supabase_fix.sql)
-- Run this in Supabase Dashboard -> SQL Editor
-- Safe & idempotent: can be executed multiple times without data loss.
--
-- IMPORTANT: Replace 'boardbuddy.team@gmail.com' below with your real
-- Super Admin email (matching INITIAL_SUPERADMIN_EMAIL) if different.
-- ==============================================================================

-- 1. I-add ang course column kung wala pa
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS course TEXT;

-- 2. SECURITY DEFINER helper to check if the current authenticated user is a SUPERADMIN
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'SUPERADMIN'
  );
END;
$$;

-- 3. Enable RLS and configure SELECT / UPDATE policies on public.profiles and public.student_documents
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can select all profiles" ON public.profiles;
CREATE POLICY "Superadmins can select all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_superadmin());

DROP POLICY IF EXISTS "Users read own documents or superadmin" ON public.student_documents;
DROP POLICY IF EXISTS "Superadmins can select all student documents" ON public.student_documents;
CREATE POLICY "Superadmins can select all student documents"
  ON public.student_documents
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmins can update profiles" ON public.profiles;
CREATE POLICY "Superadmins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 4. I-sync ang mga users gikan sa auth.users ngadto sa public.profiles kung wala pa sila sa queue
-- NOTE: Replace 'boardbuddy.team@gmail.com' with your real admin email if different.
-- No random email can be auto-created as SUPERADMIN; all other users strictly receive role = 'STUDENT'.
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  reviewee_type,
  institution,
  course,
  verification_status,
  email_confirmed,
  created_at,
  updated_at
)
SELECT
  u.id,
  LOWER(COALESCE(u.email, '')),
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(COALESCE(u.email, 'Student'), '@', 1),
    'Board Reviewee'
  ),
  CASE
    WHEN LOWER(COALESCE(u.email, '')) = 'boardbuddy.team@gmail.com' THEN 'SUPERADMIN'
    ELSE 'STUDENT'
  END,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'reviewee_type'), ''), 'Graduating Education Student'),
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'institution'), ''), 'Educational Institution'),
  NULLIF(TRIM(u.raw_user_meta_data->>'course'), ''),
  CASE
    WHEN LOWER(COALESCE(u.email, '')) = 'boardbuddy.team@gmail.com' THEN 'APPROVED'
    ELSE 'PENDING_VERIFICATION'
  END,
  (u.email_confirmed_at IS NOT NULL),
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
  AND COALESCE(UPPER(TRIM(u.raw_user_meta_data->>'role')), 'STUDENT') != 'SUPERADMIN'
ON CONFLICT (id) DO NOTHING;

-- 5. I-update ang pending status ug missing course sa mga bag-ong rehistro kung kinahanglan
-- NOTE: Replace 'boardbuddy.team@gmail.com' with your real admin email if different.
UPDATE public.profiles p
SET
  role = COALESCE(NULLIF(TRIM(p.role), ''), 'STUDENT'),
  verification_status = CASE
    WHEN p.verification_status IS NULL
      OR TRIM(p.verification_status) = ''
      OR UPPER(TRIM(p.verification_status)) IN ('PENDING', 'PENDING VERIFICATION')
    THEN 'PENDING_VERIFICATION'
    ELSE p.verification_status
  END,
  course = COALESCE(p.course, NULLIF(TRIM(u.raw_user_meta_data->>'course'), '')),
  updated_at = NOW()
FROM auth.users u
WHERE u.id = p.id
  AND LOWER(COALESCE(p.email, '')) != 'boardbuddy.team@gmail.com'
  AND (p.role = 'STUDENT' OR p.role IS NULL)
  AND (
    p.verification_status IS NULL
    OR TRIM(p.verification_status) = ''
    OR UPPER(TRIM(p.verification_status)) IN ('PENDING', 'PENDING VERIFICATION')
    OR (p.course IS NULL AND NULLIF(TRIM(u.raw_user_meta_data->>'course'), '') IS NOT NULL)
  );
