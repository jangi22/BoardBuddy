-- ==============================================================================
-- BoardBuddy: AI-Powered Board Exam Review System
-- Supabase PostgreSQL Schema & Security Rules (RLS)
-- ==============================================================================

-- 1. Create Private Storage Bucket for Student Documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Custom Types & Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'STUDENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status_enum AS ENUM (
    'PENDING_VERIFICATION',
    'APPROVED',
    'REJECTED',
    'NEEDS_CLEARER_COPY',
    'SUSPENDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('SUPERADMIN', 'STUDENT')),
  reviewee_type TEXT NOT NULL DEFAULT 'Graduating Education Student',
  institution TEXT NOT NULL,
  course TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' 
    CHECK (verification_status IN ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'NEEDS_CLEARER_COPY', 'SUSPENDED')),
  email_confirmed BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Student Documents Table
CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('STUDENT_ID', 'CERTIFICATE', 'TRANSCRIPT')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INT,
  ocr_extracted_data JSONB DEFAULT '{}'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  authenticity_status TEXT DEFAULT 'PENDING_REVIEW' 
    CHECK (authenticity_status IN ('PENDING_REVIEW', 'MANUALLY_VERIFIED', 'OFFICIAL_SOURCE_VERIFIED', 'FLAGGED_SUSPICIOUS', 'REJECTED')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  board_exam_category TEXT NOT NULL DEFAULT 'General Education',
  total_units INT DEFAULT 3,
  icon_name TEXT DEFAULT 'BookOpen',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Review Materials Table
CREATE TABLE IF NOT EXISTS public.review_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  key_concepts JSONB DEFAULT '[]'::jsonb,
  study_notes TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Quizzes Table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'MODERATE' CHECK (difficulty IN ('EASY', 'MODERATE', 'DIFFICULT', 'MIXED')),
  time_limit_minutes INT DEFAULT 15,
  is_ai_generated BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MODERATE' CHECK (difficulty IN ('EASY', 'MODERATE', 'DIFFICULT')),
  specialization TEXT DEFAULT 'General',
  source_reference TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  quiz_title TEXT,
  subject_title TEXT,
  total_questions INT NOT NULL,
  score INT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  duration_seconds INT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Student Answers Table
CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN NOT NULL
);

-- 12. Student Progress Table
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  mastery_level NUMERIC(5,2) DEFAULT 0,
  total_attempts INT DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject_id, topic_id)
);

-- 13. AI Recommendations Table
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weak_topics JSONB DEFAULT '[]'::jsonb,
  strong_topics JSONB DEFAULT '[]'::jsonb,
  suggested_materials JSONB DEFAULT '[]'::jsonb,
  study_plan TEXT,
  overall_readiness_score INT DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  duration_months INT DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.subscription_plans (code, name, price, duration_months, features)
VALUES 
  ('m', 'Monthly Standard Plan', 299.00, 1, '["Full LET review materials", "Practice quizzes", "AI Study Assistant", "1 Month Access"]'::jsonb),
  ('p', 'Monthly Premium Plan', 499.00, 1, '["Unlimited AI Quiz Generation", "Priority Document Review", "Full LET review materials", "AI Personalized Study Plan", "1 Month Unlimited Access"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price;

-- 15. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  payment_method TEXT NOT NULL,
  payment_reference TEXT UNIQUE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED', 'REFUNDED')),
  gateway_transaction_id TEXT,
  webhook_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL,
  payment_reference TEXT REFERENCES public.payments(payment_reference) ON DELETE SET NULL,
  payment_status TEXT NOT NULL DEFAULT 'COMPLETED',
  subscription_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (subscription_status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Payment Webhook Events Table (Idempotency)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Verification Logs Table
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  note TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value)
VALUES 
  ('registration_open', '{"enabled": true}'::jsonb),
  ('auto_verification_threshold', '{"min_confidence": 0.85, "require_human_audit_on_ambiguity": true}'::jsonb),
  ('supported_exams', '["Board Licensure Examination for Professional Teachers (BLEPT)", "Philippine Nursing Licensure Exam (PNLE)", "Civil Engineering Licensure Examination", "Certified Public Accountant (CPA) Licensure Examination", "Criminologist Licensure Examination"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'SUPERADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_approved_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'STUDENT' AND verification_status = 'APPROVED'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmins can insert profiles" ON public.profiles;
CREATE POLICY "Superadmins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_superadmin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Superadmins can update profiles" ON public.profiles;
CREATE POLICY "Superadmins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Users can update own name" ON public.profiles;
CREATE POLICY "Users can update own name"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    verification_status = (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
  );

-- Storage / Documents Policies
DROP POLICY IF EXISTS "Users read own documents or superadmin" ON public.student_documents;
CREATE POLICY "Users read own documents or superadmin"
  ON public.student_documents FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Users upload own documents" ON public.student_documents;
CREATE POLICY "Users upload own documents"
  ON public.student_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

-- Subjects / Topics / Materials / Quizzes Policies
DROP POLICY IF EXISTS "Anyone view published subjects" ON public.subjects;
CREATE POLICY "Anyone view published subjects"
  ON public.subjects FOR SELECT
  USING (is_published = true OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin manage subjects" ON public.subjects;
CREATE POLICY "Superadmin manage subjects"
  ON public.subjects FOR ALL
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Anyone view topics" ON public.topics;
CREATE POLICY "Anyone view topics"
  ON public.topics FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmin manage topics" ON public.topics;
CREATE POLICY "Superadmin manage topics"
  ON public.topics FOR ALL
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Approved students view review materials" ON public.review_materials;
CREATE POLICY "Approved students view review materials"
  ON public.review_materials FOR SELECT
  USING ((is_published = true AND (public.is_approved_student() OR public.is_superadmin())) OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin manage review materials" ON public.review_materials;
CREATE POLICY "Superadmin manage review materials"
  ON public.review_materials FOR ALL
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Approved students view quizzes" ON public.quizzes;
CREATE POLICY "Approved students view quizzes"
  ON public.quizzes FOR SELECT
  USING ((is_published = true AND (public.is_approved_student() OR public.is_superadmin())) OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin manage quizzes" ON public.quizzes;
CREATE POLICY "Superadmin manage quizzes"
  ON public.quizzes FOR ALL
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Approved students view questions" ON public.questions;
CREATE POLICY "Approved students view questions"
  ON public.questions FOR SELECT
  USING (public.is_approved_student() OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin manage questions" ON public.questions;
CREATE POLICY "Superadmin manage questions"
  ON public.questions FOR ALL
  USING (public.is_superadmin());

-- Attempts & Answers Policies
DROP POLICY IF EXISTS "Users read own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users read own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Approved students insert attempts" ON public.quiz_attempts;
CREATE POLICY "Approved students insert attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own answers" ON public.student_answers;
CREATE POLICY "Users read own answers"
  ON public.student_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa 
      WHERE qa.id = student_answers.attempt_id AND (qa.user_id = auth.uid() OR public.is_superadmin())
    )
  );

DROP POLICY IF EXISTS "Users insert own answers" ON public.student_answers;
CREATE POLICY "Users insert own answers"
  ON public.student_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa 
      WHERE qa.id = student_answers.attempt_id AND qa.user_id = auth.uid()
    )
  );

-- Subscription Plans & Payment Policies
DROP POLICY IF EXISTS "Anyone view subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone view subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Superadmin manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

-- 21. Manual Payment Receipts Table (QR Payment Upload & Verification Audit Queue)
CREATE TABLE IF NOT EXISTS public.manual_payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('GCASH_QR', 'MAYA_QR', 'MANUAL_TRANSFER')),
  payment_reference TEXT UNIQUE NOT NULL,
  receipt_file_url TEXT NOT NULL,
  ocr_extracted_data JSONB DEFAULT '{}'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  payment_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
    CHECK (payment_status IN ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'EXPIRED')),
  rejection_reason TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.manual_payment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own manual payment receipts" ON public.manual_payment_receipts;
CREATE POLICY "Users read own manual payment receipts"
  ON public.manual_payment_receipts FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Users insert own manual payment receipts" ON public.manual_payment_receipts;
CREATE POLICY "Users insert own manual payment receipts"
  ON public.manual_payment_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Superadmin manage manual payment receipts" ON public.manual_payment_receipts;
CREATE POLICY "Superadmin manage manual payment receipts"
  ON public.manual_payment_receipts FOR ALL
  USING (public.is_superadmin());

-- AUTOMATED SUBSCRIPTION EXPIRATION STORED FUNCTION
CREATE OR REPLACE FUNCTION public.expire_outdated_subscriptions()
RETURNS VOID AS $$
BEGIN
  -- Mark subscriptions expired past their expiration date
  UPDATE public.subscriptions
  SET subscription_status = 'EXPIRED', updated_at = NOW()
  WHERE subscription_status = 'ACTIVE' AND expires_at < NOW();

  -- Update profiles is_premium state
  UPDATE public.profiles p
  SET is_premium = false, updated_at = NOW()
  WHERE p.is_premium = true AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p.id AND s.subscription_status = 'ACTIVE' AND s.expires_at >= NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BOOTSTRAP TRIGGER FOR SUPER ADMIN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'STUDENT';
  v_status TEXT := 'PENDING_VERIFICATION';
  v_initial_admin TEXT := 'boardbuddy.team@gmail.com';
BEGIN
  IF LOWER(NEW.email) = LOWER(v_initial_admin) THEN
    v_role := 'SUPERADMIN';
    v_status := 'APPROVED';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    reviewee_type,
    institution,
    course,
    verification_status,
    email_confirmed
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Board Reviewee'),
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'reviewee_type', 'Graduating Education Student'),
    COALESCE(NEW.raw_user_meta_data->>'institution', 'Educational Institution'),
    NEW.raw_user_meta_data->>'course',
    v_status,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    course = COALESCE(EXCLUDED.course, public.profiles.course),
    email_confirmed = NEW.email_confirmed_at IS NOT NULL,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
