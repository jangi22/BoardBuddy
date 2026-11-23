export type UserRole = 'SUPERADMIN' | 'STUDENT';

export type VerificationStatus = 
  | 'PENDING_VERIFICATION' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'NEEDS_CLEARER_COPY' 
  | 'SUSPENDED';

export type RevieweeType = 
  | 'Graduating Education Student' 
  | 'Other Reviewee';

export type Specialization = 
  | 'General'
  | 'English' 
  | 'Mathematics' 
  | 'Science' 
  | 'Filipino' 
  | 'Social Studies' 
  | 'Biological Science'
  | 'Physical Science'
  | 'Values Education'
  | 'MAPEH'
  | 'TLE';

export type DocumentType = 'STUDENT_ID' | 'CERTIFICATE' | 'TRANSCRIPT';

export type DocumentAuthenticityStatus = 
  | 'PENDING_REVIEW' 
  | 'MANUALLY_VERIFIED' 
  | 'OFFICIAL_SOURCE_VERIFIED' 
  | 'FLAGGED_SUSPICIOUS' 
  | 'REJECTED';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  reviewee_type: RevieweeType;
  institution: string;
  course?: string;
  verification_status: VerificationStatus;
  email_confirmed: boolean;
  rejection_reason?: string;
  avatar_url?: string;
  avatarUrl?: string;
  photoUrl?: string;
  is_premium?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StudentDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size?: number;
  ocr_extracted_data?: {
    extracted_name?: string;
    extracted_institution?: string;
    document_type_detected?: string;
    id_or_cert_number?: string;
    issue_or_valid_date?: string;
    confidence_score?: number;
    readability?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNREADABLE';
    match_with_registration?: boolean;
    inconsistencies?: string[];
  };
  ai_analysis?: {
    summary: string;
    flags: string[];
    authenticity_notes: string;
    recommended_action: 'APPROVE' | 'MANUAL_REVIEW' | 'REQUEST_CLEARER_COPY' | 'REJECT';
  };
  authenticity_status: DocumentAuthenticityStatus;
  uploaded_at: string;
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  description: string;
  board_exam_category: string;
  total_units: number;
  icon_name?: string;
  is_published: boolean;
  created_at: string;
  topic_count?: number;
}

export interface Topic {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  order_index: number;
  created_at: string;
}

export interface ReviewMaterial {
  id: string;
  subject_id: string;
  topic_id?: string;
  title: string;
  summary: string;
  key_concepts: string[];
  study_notes: string;
  is_published: boolean;
  created_at: string;
  subject_title?: string;
  topic_title?: string;
}

export type QuizDifficulty = 'EASY' | 'MODERATE' | 'DIFFICULT' | 'MIXED';

export interface Quiz {
  id: string;
  subject_id: string;
  topic_id?: string;
  title: string;
  description: string;
  difficulty: QuizDifficulty;
  time_limit_minutes: number;
  is_ai_generated: boolean;
  is_published: boolean;
  created_at: string;
  question_count?: number;
  subject_title?: string;
  topic_title?: string;
}

export interface Question {
  id: string;
  quiz_id?: string;
  subject_id: string;
  topic_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT';
  specialization?: string;
  source_reference?: string;
  is_published?: boolean;
  created_at?: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id?: string;
  subject_id: string;
  topic_id?: string;
  quiz_title?: string;
  subject_title?: string;
  total_questions: number;
  score: number;
  percentage: number;
  duration_seconds: number;
  passed: boolean;
  completed_at: string;
  answers?: StudentAnswerDetail[];
}

export interface StudentAnswerDetail {
  question_id: string;
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export interface StudentProgress {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id?: string;
  subject_title?: string;
  mastery_level: number;
  total_attempts: number;
  last_activity_at: string;
}

export interface AIRecommendation {
  id: string;
  user_id: string;
  weak_topics: Array<{ subject: string; topic: string; score: number; reason: string }>;
  strong_topics: Array<{ subject: string; topic: string; score: number }>;
  suggested_materials: Array<{ title: string; subject: string; linkId?: string; priority: 'HIGH' | 'MEDIUM' }>;
  study_plan: string;
  overall_readiness_score: number;
  generated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_active: boolean;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  user_name?: string;
  plan_code: string;
  plan_name?: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_reference: string;
  payment_status: 'PENDING' | 'PENDING_VERIFICATION' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  gateway_transaction_id?: string;
  created_at: string;
}

export interface ManualPaymentReceipt {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  institution?: string;
  reviewee_type?: string;
  plan_code: string;
  plan_name?: string;
  amount: number;
  currency?: string;
  payment_method: 'GCASH_QR' | 'MAYA_QR' | 'MANUAL_TRANSFER';
  reference_number: string;
  receipt_url: string;
  receipt_signed_url?: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  ai_confidence?: number;
  ai_notes?: string;
  ocr_extracted_data?: {
    extracted_reference?: string;
    extracted_amount?: number;
    extracted_recipient_name?: string;
    extracted_recipient_mobile?: string;
    transaction_timestamp?: string;
    confidence_score?: number;
    readability?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNREADABLE';
    matched_plan_price?: boolean;
    duplicate_reference_detected?: boolean;
  };
  ai_analysis?: {
    summary?: string;
    findings?: string[];
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    authenticity_notes?: string;
    recommended_action?: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  };
  rejection_reason?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id?: string;
  plan_code: string;
  plan_name?: string;
  amount_paid: number;
  payment_reference: string;
  payment_status: string;
  subscription_status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  started_at: string;
  expires_at: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action_type: string;
  description: string;
  created_at: string;
}

export interface VerificationLog {
  id: string;
  user_id: string;
  user_name?: string;
  admin_id?: string;
  action: string;
  note?: string;
  previous_status: string;
  new_status: string;
  created_at: string;
}

export interface SystemSettings {
  registration_open: boolean;
  auto_verification_threshold: number;
  require_human_audit_on_ambiguity: boolean;
  supported_exams: string[];
}

export interface DeckUser {
  name: string;
  email: string;
  pw?: string;
  type: string;
  institution?: string;
  joined: number;
  doc?: string | null;
  docLabel?: string;
  verified: 'approved' | 'pending' | 'needs_clearer_copy' | 'rejected' | 'suspended';
  role?: 'SUPERADMIN' | 'STUDENT';
  avatar_url?: string;
  avatarUrl?: string;
  photoUrl?: string;
}

export interface DeckTopic {
  id: string;
  s: 'pe' | 'ge' | 'en' | string;
  free?: number;
  title: string;
  notes: string[];
  cards: [string, string][];
  qs: [string, string[], number, string][];
}

export interface DeckQuestionItem {
  t: string;
  q: string;
  o: string[];
  a: number;
  w: string;
}

export interface DeckQuizResultLog {
  t: string;
  ok: boolean;
  q: string;
  o: string[];
  a: number;
  w: string;
  pick: number;
  at?: number;
}

export interface DeckPaymentRecord {
  ref: string;
  label: string;
  amt: number;
  method: string;
  at: number;
  until?: number | null;
  status?: string;
}

export interface DeckStudentState {
  user: DeckUser;
  plan?: 'm' | 'p' | null;
  until?: number | null;
  premium: boolean;
  done: Record<string, boolean>;
  res: Record<string, { c: number; t: number }>;
  known: Record<string, boolean>;
  hist?: Record<string, DeckQuizResultLog>;
  act?: Record<string, number>;
  pay?: DeckPaymentRecord[];
}
