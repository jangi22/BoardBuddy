-- ==============================================================================
-- BoardBuddy: Supabase Database Optimization & Security Migration (Final Corrected)
-- Safe incremental migration (No data loss, no table drops)
-- ==============================================================================

-- 0. ENSURE PROFILES.COURSE COLUMN & REGISTRATION TRIGGER SUPPORT COURSE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course TEXT;

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

-- 1. ADD MISSING PERFORMANCE INDEXES FOR FREQUENT QUERIES & FOREIGN KEYS
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_student_documents_user_id ON public.student_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON public.student_documents(authenticity_status);

CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);

CREATE INDEX IF NOT EXISTS idx_review_materials_subject_id ON public.review_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_review_materials_topic_id ON public.review_materials(topic_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id ON public.quizzes(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions(subject_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject_id ON public.quiz_attempts(subject_id);

CREATE INDEX IF NOT EXISTS idx_student_answers_attempt_id ON public.student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question_id ON public.student_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON public.student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON public.ai_recommendations(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);

CREATE INDEX IF NOT EXISTS idx_manual_payment_receipts_user_id ON public.manual_payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_receipts_status ON public.manual_payment_receipts(payment_status);
CREATE INDEX IF NOT EXISTS idx_manual_payment_receipts_reference ON public.manual_payment_receipts(payment_reference);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON public.verification_logs(user_id);

-- 2. ENSURE RLS IS ENABLED ON ALL TABLES
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
ALTER TABLE public.manual_payment_receipts ENABLE ROW LEVEL SECURITY;

-- 3. EXPLICITLY DROP OLD/CONFLICTING POLICIES TO PREVENT PERMISSIVE COMBINATION
DROP POLICY IF EXISTS "Users read and upsert own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users read own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users insert own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users update own progress" ON public.student_progress;

DROP POLICY IF EXISTS "Users read and upsert own ai recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users read own ai recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users insert own ai recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users update own ai recommendations" ON public.ai_recommendations;

DROP POLICY IF EXISTS "Anyone read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public read non-sensitive system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Superadmin manage system settings" ON public.system_settings;

DROP POLICY IF EXISTS "Superadmin manage verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Users read own verification logs" ON public.verification_logs;

DROP POLICY IF EXISTS "Superadmin manage activity logs" ON public.activity_logs;

DROP POLICY IF EXISTS "Superadmin manage webhook events" ON public.payment_webhook_events;
DROP POLICY IF EXISTS "Superadmin read webhook events" ON public.payment_webhook_events;

-- 4. CREATE NEW GRANULAR SECURE POLICIES

-- Student Progress: Separate SELECT, INSERT, UPDATE. NO DELETE for students.
CREATE POLICY "Users read own progress"
  ON public.student_progress FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "Users insert own progress"
  ON public.student_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "Users update own progress"
  ON public.student_progress FOR UPDATE
  USING (auth.uid() = user_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

-- AI Recommendations: Separate SELECT, INSERT, UPDATE. NO DELETE for students.
CREATE POLICY "Users read own ai recommendations"
  ON public.ai_recommendations FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "Users insert own ai recommendations"
  ON public.ai_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "Users update own ai recommendations"
  ON public.ai_recommendations FOR UPDATE
  USING (auth.uid() = user_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

-- Verification Logs: Superadmin full management, students read own audit entries.
CREATE POLICY "Superadmin manage verification logs"
  ON public.verification_logs FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "Users read own verification logs"
  ON public.verification_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin());

-- Activity Logs: Superadmin full management only.
CREATE POLICY "Superadmin manage activity logs"
  ON public.activity_logs FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Payment Webhook Events: Ordinary users blocked completely. Superadmin read-only audit. Backend service-role bypasses RLS.
CREATE POLICY "Superadmin read webhook events"
  ON public.payment_webhook_events FOR SELECT
  USING (public.is_superadmin());

-- System Settings: Public read restricted exclusively to non-sensitive keys (registration_open, supported_exams). Superadmin full management.
CREATE POLICY "Public read non-sensitive system settings"
  ON public.system_settings FOR SELECT
  USING (key IN ('registration_open', 'supported_exams'));

CREATE POLICY "Superadmin manage system settings"
  ON public.system_settings FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 5. SUBSCRIPTION PLANS SCHEMA & SEED DATA (CODES 'm' AND 'p')
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  currency text DEFAULT 'PHP',
  duration_months integer DEFAULT 1,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Public read active subscription plans') THEN
    CREATE POLICY "Public read active subscription plans" ON public.subscription_plans FOR SELECT USING (is_active = true OR public.is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Superadmin manage subscription plans') THEN
    CREATE POLICY "Superadmin manage subscription plans" ON public.subscription_plans FOR ALL USING (public.is_superadmin());
  END IF;
END $$;

INSERT INTO public.subscription_plans (code, name, price, currency, duration_months, features, is_active)
VALUES
  (
    'm',
    'Monthly Standard Plan',
    299.00,
    'PHP',
    1,
    '["Full LET review materials", "Practice quizzes", "AI Study Assistant", "1 Month Access"]'::jsonb,
    true
  ),
  (
    'p',
    'Monthly Premium Plan',
    499.00,
    'PHP',
    1,
    '["Unlimited AI Quiz Generation", "Priority Document Review", "Full LET review materials", "AI Personalized Study Plan", "1 Month Unlimited Access"]'::jsonb,
    true
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  duration_months = EXCLUDED.duration_months,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();
