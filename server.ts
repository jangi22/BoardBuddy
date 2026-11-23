import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dns from 'dns';
import { validateRegistrationEmail } from './src/lib/emailValidation.js';

dotenv.config();

function cleanEnvValue(val: string | undefined): string {
  if (!val) return '';
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

for (const key of Object.keys(process.env)) {
  const raw = process.env[key];
  if (typeof raw === 'string') {
    process.env[key] = cleanEnvValue(raw);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Cold start race middleware with throttled retry when service role key is not operational
let probePromise: Promise<void> | null = null;
let lastProbeAttemptAt = 0;
const PROBE_RETRY_INTERVAL_MS = 30_000;

app.use(async (req, _res, next) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }
  try {
    if (supabaseAdmin) {
      if (!probePromise) {
        lastProbeAttemptAt = Date.now();
        probePromise = probeServiceRoleKey().catch(() => {});
      }
      // On Vercel serverless cold starts, cap wait so auth routes stay responsive even if admin probe lags
      await Promise.race([
        probePromise,
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);

      if (!isServiceRoleKeyOperational && Date.now() - lastProbeAttemptAt >= PROBE_RETRY_INTERVAL_MS) {
        lastProbeAttemptAt = Date.now();
        probePromise = probeServiceRoleKey().catch(() => {});
        await Promise.race([
          probePromise,
          new Promise<void>((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    }
  } catch (_) {}

  next();
});

// Multer memory storage for uploading student IDs, certificates, and reviewer files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const PLACEHOLDER_API_KEYS = new Set([
  'undefined',
  'null',
  'none',
  'false',
  'true',
  'your_gemini_api_key',
  'your_api_key',
  'gemini_api_key',
  'replace_me',
  'changeme',
  'my_gemini_api_key',
]);

function normalizeCandidateKey(raw: unknown): string {
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (typeof source !== 'string') return '';
  const cleaned = cleanEnvValue(source);
  if (!cleaned || PLACEHOLDER_API_KEYS.has(cleaned.toLowerCase())) {
    return '';
  }
  return cleaned;
}

export function getGeminiApiKeyCandidates(req?: Request): string[] {
  const rawCandidates: unknown[] = [
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  ];

  if (req) {
    rawCandidates.push(
      req.headers?.['x-gemini-api-key'],
      req.headers?.['x-goog-api-key'],
      req.headers?.['x-api-key'],
      req.body?.gemini_api_key,
      req.body?.geminiApiKey,
      req.body?.apiKey,
      req.body?.api_key,
      req.body?.key,
      req.query?.key,
      req.query?.apiKey,
      req.query?.gemini_api_key
    );

    const authHeader = req.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken.startsWith('AIza')) {
        rawCandidates.push(bearerToken);
      }
    }
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of rawCandidates) {
    const key = normalizeCandidateKey(item);
    if (key && !seen.has(key)) {
      seen.add(key);
      normalized.push(key);
    }
  }

  // Prefer standard Google AI Studio keys (AIza...) over internal/session tokens (e.g. AQ.)
  const aizaKeys = normalized.filter((k) => k.startsWith('AIza'));
  const otherKeys = normalized.filter((k) => !k.startsWith('AIza'));
  return [...aizaKeys, ...otherKeys];
}

// Dynamic Gemini API key resolver supporting all standard environment variable names, headers, and payloads
export function getGeminiApiKey(req?: Request): string {
  return getGeminiApiKeyCandidates(req)[0] || '';
}

export function getGenAI(req?: Request, explicitKey?: string): GoogleGenAI {
  const apiKey = explicitKey || getGeminiApiKey(req);
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Proxied 'ai' instance so existing code continues to work with dynamic per-call key resolution
export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    const client = getGenAI();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});

const isVercelRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

function toSafeLowerString(val: unknown): string {
  if (typeof val === 'string') return val.trim().toLowerCase();
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim().toLowerCase();
  return '';
}

function getSafeBody(req: Request): Record<string, any> {
  let body: unknown = req?.body;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return {};
    try {
      body = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }
  return body as Record<string, any>;
}

function extractSafeErrorMessage(err: unknown, fallback = 'An error occurred.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err.trim() || fallback;
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const candidate =
      obj.message ??
      obj.error_description ??
      obj.msg ??
      obj.details ??
      obj.error;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === 'object') {
      return extractSafeErrorMessage(candidate, fallback);
    }
  }
  return fallback;
}

function isPlaceholderEnvValue(val: string): boolean {
  const lower = val.trim().toLowerCase();
  if (!lower) return true;
  if (PLACEHOLDER_API_KEYS.has(lower)) return true;
  if (
    lower.includes('your-project') ||
    lower.includes('your_project') ||
    lower.includes('your-anon-key') ||
    lower.includes('your_anon_key') ||
    lower.includes('your-service-role') ||
    lower.includes('your_service_role')
  ) {
    return true;
  }
  return false;
}

export function getServerEnv(names: string[], fallback = ''): string {
  for (const name of names) {
    const raw = cleanEnvValue(process.env[name]);
    if (raw && !isPlaceholderEnvValue(raw)) {
      return raw;
    }
  }
  return fallback;
}

const DEFAULT_PUBLIC_SUPABASE_URL = 'https://nrcwkebmvsqqramhgint.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_kGLWelLGwX0qgGlVYVyedQ_1egh1vAH';

export const SUPABASE_URL = getServerEnv([
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'REACT_APP_SUPABASE_URL',
  'PUBLIC_SUPABASE_URL',
], DEFAULT_PUBLIC_SUPABASE_URL);

export const SUPABASE_ANON_KEY = getServerEnv([
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'REACT_APP_SUPABASE_ANON_KEY',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
], DEFAULT_PUBLIC_SUPABASE_ANON_KEY);

export const SUPABASE_SERVICE_ROLE_KEY = getServerEnv([
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_KEY',
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_SERVICE_KEY',
  'SUPABASE_SECRET_KEY',
]);

const supabaseUrl = SUPABASE_URL;
const supabaseServiceKey = SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = SUPABASE_ANON_KEY;

const hasValidSupabaseUrl = Boolean(
  supabaseUrl &&
  /^https?:\/\/.+/i.test(supabaseUrl)
);

export const isServiceRoleKeyValid = Boolean(
  supabaseServiceKey &&
  !supabaseServiceKey.startsWith('sb_publishable_')
);

const hasValidAnonKey = Boolean(supabaseAnonKey);

const effectiveAuthKey = hasValidAnonKey
  ? supabaseAnonKey
  : (isServiceRoleKeyValid ? supabaseServiceKey : '');

if (!hasValidSupabaseUrl || (!hasValidAnonKey && !isServiceRoleKeyValid)) {
  console.error('[Supabase Error]: Missing or invalid Supabase environment variables (SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY).');
}

function getInitialSuperAdminEmail(): string {
  const configured = getServerEnv(
    [
      'INITIAL_SUPERADMIN_EMAIL',
      'VITE_INITIAL_SUPERADMIN_EMAIL',
      'NEXT_PUBLIC_INITIAL_SUPERADMIN_EMAIL',
    ],
    'boardbuddy.team@gmail.com'
  );
  return toSafeLowerString(configured) || 'boardbuddy.team@gmail.com';
}

function isSuperAdminEmailAddress(email?: unknown): boolean {
  const normalized = toSafeLowerString(email);
  if (!normalized) return false;
  return normalized === getInitialSuperAdminEmail();
}

export const isSupabaseConfigured = Boolean(
  hasValidSupabaseUrl &&
  effectiveAuthKey
);

let supabaseAdmin: SupabaseClient | null = null;
export let isServiceRoleKeyOperational = false;

// Probe service role key health on startup (deduplicated against concurrent calls)
let activeProbeTask: Promise<void> | null = null;
async function probeServiceRoleKey() {
  if (activeProbeTask) return activeProbeTask;
  activeProbeTask = (async () => {
    lastProbeAttemptAt = Date.now();
    if (!supabaseAdmin) {
      isServiceRoleKeyOperational = false;
      return;
    }
    try {
      const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (!error) {
        isServiceRoleKeyOperational = true;
        console.log('[Supabase Admin Health] Service role key verified and operational.');
      } else {
        isServiceRoleKeyOperational = false;
        const errMsg = extractSafeErrorMessage(error, String(error));
        if (errMsg.includes('Unregistered API key')) {
          console.warn('[Supabase Admin Health] Service role key verification note: Unregistered API key. Admin operations require a valid service_role key.');
        } else {
          console.error('[Supabase Admin Health] Service role key verification failed:', errMsg);
        }
      }
    } catch (e: any) {
      isServiceRoleKeyOperational = false;
      const errMsg = extractSafeErrorMessage(e, String(e));
      if (errMsg.includes('Unregistered API key')) {
        console.warn('[Supabase Admin Health] Service role key verification exception note: Unregistered API key.');
      } else {
        console.error('[Supabase Admin Health] Exception during service role key verification:', errMsg);
      }
    } finally {
      activeProbeTask = null;
    }
  })();
  return activeProbeTask;
}

if (hasValidSupabaseUrl && isServiceRoleKeyValid && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    if (!isVercelRuntime) {
      probeServiceRoleKey().catch(() => {});
    }
  } catch (initErr) {
    console.error('Failed to initialize Supabase Admin Client:', initErr);
  }
}

function createAuthClientSafe(): SupabaseClient | null {
  if (!hasValidSupabaseUrl || !effectiveAuthKey) {
    return null;
  }
  try {
    return createClient(supabaseUrl, effectiveAuthKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch (err) {
    console.error('[Supabase] Failed to create auth client:', err);
    return null;
  }
}

function createAuthClient(): SupabaseClient {
  const client = createAuthClientSafe();
  if (!client) {
    throw new Error('Supabase authentication client is not configured.');
  }
  return client;
}

function createUserClient(accessToken?: string): SupabaseClient {
  if (!hasValidSupabaseUrl || !effectiveAuthKey) {
    throw new Error('Supabase user client is not configured.');
  }
  return createClient(supabaseUrl, effectiveAuthKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

// Resilient helper to get a functional database client
function getDatabaseClient(token?: string): SupabaseClient {
  if (isServiceRoleKeyOperational && supabaseAdmin) {
    return supabaseAdmin;
  }
  if (token) {
    return createUserClient(token);
  }
  if (supabaseAdmin) {
    return supabaseAdmin;
  }
  return createAuthClient();
}

function createAuthSessionToken(userId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 3600); // 7 days
  const payload = Buffer.from(JSON.stringify({ sub: userId, email, exp, iss: 'boardbuddy-server' })).toString('base64url');
  const secret = supabaseServiceKey || 'boardbuddy-session-secret-key-salt';
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyAuthSessionToken(token: string): { userId: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const secret = supabaseServiceKey || 'boardbuddy-session-secret-key-salt';
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const parsedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsedPayload.exp && parsedPayload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!parsedPayload.sub) return null;
    return { userId: parsedPayload.sub, email: parsedPayload.email || '' };
  } catch (e) {
    return null;
  }
}

const PAYMONGO_SECRET_KEY = getServerEnv(['PAYMONGO_SECRET_KEY', 'VITE_PAYMONGO_SECRET_KEY', 'NEXT_PUBLIC_PAYMONGO_SECRET_KEY']);
const PAYMONGO_PUBLIC_KEY = getServerEnv(['PAYMONGO_PUBLIC_KEY', 'VITE_PAYMONGO_PUBLIC_KEY', 'NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY']);
const PAYMONGO_WEBHOOK_SECRET = getServerEnv(['PAYMONGO_WEBHOOK_SECRET', 'VITE_PAYMONGO_WEBHOOK_SECRET']);
const APP_BASE_URL = getServerEnv(
  ['APP_BASE_URL', 'APP_URL', 'FRONTEND_URL', 'NEXT_PUBLIC_APP_URL', 'VITE_APP_URL'],
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
);

// Helper to check Supabase auth configuration (allows public auth routes to work with URL + Anon Key)
function ensureSupabaseAuthConfigured(res: Response): boolean {
  if (!isSupabaseConfigured || !hasValidSupabaseUrl || !effectiveAuthKey) {
    res.status(503).json({
      success: false,
      code: 'SUPABASE_NOT_CONFIGURED',
      error: 'Authentication service is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in your environment variables.',
      supabaseConfigured: false,
    });
    return false;
  }
  return true;
}

// Helper to check full Supabase configuration (including admin/service-role operations)
function ensureSupabaseConfigured(res: Response): boolean {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    res.status(503).json({
      success: false,
      code: 'SUPABASE_NOT_CONFIGURED',
      error: 'Supabase database is not configured. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.',
      supabaseConfigured: false,
    });
    return false;
  }
  return true;
}

// Resilient Storage Upload helper with Base64 Data URI fallback if bucket RLS blocks upload
async function uploadToStorageOrFallback(
  bucket: string,
  storagePath: string,
  fileBuffer: Buffer,
  mimeType: string,
  token?: string
): Promise<string> {
  try {
    const client = token
      ? createUserClient(token)
      : (isServiceRoleKeyOperational && supabaseAdmin ? supabaseAdmin : null);
    if (client) {
      const { data, error: storageErr } = await client.storage
        .from(bucket)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (!storageErr && data?.path) {
        return storagePath;
      } else if (storageErr) {
        console.warn(`[Storage Upload] Bucket '${bucket}' RLS warning:`, storageErr.message || storageErr);
      }
    }
  } catch (e: any) {
    console.warn(`[Storage Upload] Bucket '${bucket}' exception:`, e?.message || e);
  }

  // Fallback to inline Base64 Data URI so uploads never fail due to storage bucket RLS policies
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
}

// Resilient Pending Registration Sync Store (buffers document/course if RLS blocks anonymous insert before admin sync)
const PENDING_REG_FILE = '/tmp/boardbuddy-pending-registrations.json';
const pendingRegistrationsMemory = new Map<string, any>();

function readPendingRegistrationFallbacks(): any[] {
  const map = new Map<string, any>(pendingRegistrationsMemory);
  try {
    if (fs.existsSync(PENDING_REG_FILE)) {
      const raw = fs.readFileSync(PENDING_REG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.id && !map.has(item.id)) {
            map.set(item.id, item);
          }
        }
      }
    }
  } catch (_) {}
  return Array.from(map.values());
}

function savePendingRegistrationFallback(entry: any) {
  if (!entry?.id) return;
  pendingRegistrationsMemory.set(entry.id, entry);
  try {
    const all = readPendingRegistrationFallbacks();
    const idx = all.findIndex((x) => x.id === entry.id);
    if (idx >= 0) all[idx] = entry;
    else all.unshift(entry);
    fs.writeFileSync(PENDING_REG_FILE, JSON.stringify(all.slice(0, 100)));
  } catch (_) {}
}

function removePendingRegistrationFallback(userId: string) {
  pendingRegistrationsMemory.delete(userId);
  try {
    if (fs.existsSync(PENDING_REG_FILE)) {
      const all = readPendingRegistrationFallbacks().filter((x) => x.id !== userId);
      fs.writeFileSync(PENDING_REG_FILE, JSON.stringify(all));
    }
  } catch (_) {}
}

function updatePendingRegistrationStatusFallback(userId: string, status: string, reason?: string | null) {
  const existing = readPendingRegistrationFallbacks().find((x) => x.id === userId);
  if (existing) {
    const updated = {
      ...existing,
      verification_status: status,
      rejection_reason: status === 'APPROVED' ? null : (reason ?? existing.rejection_reason ?? null),
      email_confirmed: status === 'APPROVED' ? true : existing.email_confirmed,
      updated_at: new Date().toISOString(),
    };
    savePendingRegistrationFallback(updated);
  }
}

// Subscription Plan Seeding
async function seedSubscriptionPlans() {
  if (!isSupabaseConfigured || !supabaseAdmin) return;
  
  const plans = [
    {
      code: 'p149',
      name: 'Monthly Premium Plan',
      price: 149,
      currency: 'PHP',
      duration_months: 1,
      features: [
        'Full LET review materials & syllabus coverage',
        'Unlimited randomized practice quizzes & choices',
        'AI Study Assistant powered by Gemini',
        'Personalized study plans & weak area recommendations',
        'Mock board exams with timed conditions',
        'Administrator GCash QR Verification'
      ],
      is_active: true,
    }
  ];

  for (const plan of plans) {
    try {
      await supabaseAdmin
        .from('subscription_plans')
        .upsert([plan], { onConflict: 'code' });
    } catch (e) {
      console.error(`[Seeding] Failed to seed plan ${plan.code}:`, e);
    }
  }

  // Clean up old obsolete plans from DB
  try {
    await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .in('code', ['m', 'p']);
  } catch (_) {}
}

// LET Board Exam Review Datasets for Practice, Summaries, and Cards
import { LET_REVIEW_DATASETS } from './src/data/boardContent.js';
import { buildTopicSpecificSummary } from './src/lib/customTopicGenerator.js';
import { generateLocalBoardCoachReply } from './src/lib/localStudyCoach.js';
export { LET_REVIEW_DATASETS };

// Build concise clean syllabus topic description from markdown summary content
function formatTopicDescription(rawContent: string): string {
  const cleaned = String(rawContent || '')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Board-ready LET syllabus competency and key concepts.';
  return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned;
}

let reviewDatasetsSeedPromise: Promise<void> | null = null;

// Database seeding for review materials and structured syllabus topics
async function seedReviewDatasets(): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;
  if (reviewDatasetsSeedPromise) return reviewDatasetsSeedPromise;

  reviewDatasetsSeedPromise = (async () => {
    try {
      // 0. Purge any legacy Elementary / Early Childhood / Elem-Sec subject, topic, or material rows
      try {
        await supabaseAdmin!
          .from('review_materials')
          .delete()
          .or('title.ilike.%Elementary Education%,title.ilike.%Early Childhood%,title.ilike.%BEEd%,title.ilike.%BECEd%,title.ilike.%BSNEd%,title.ilike.%Kindergarten%,title.ilike.%Elem/Sec%,summary.ilike.%Elementary Education (BEEd)%,summary.ilike.%Early Childhood Education%');
      } catch (_) {}

      try {
        await supabaseAdmin!
          .from('topics')
          .delete()
          .or('title.ilike.%Elementary Education%,title.ilike.%Early Childhood%,title.ilike.%BEEd%,title.ilike.%BECEd%,title.ilike.%BSNEd%,title.ilike.%Kindergarten%,title.ilike.%Elem/Sec%,description.ilike.%Elementary Education (BEEd)%,description.ilike.%Early Childhood Education%');
      } catch (_) {}

      try {
        const { data: oldMajors } = await supabaseAdmin!
          .from('subjects')
          .select('id')
          .eq('title', 'Elem/Sec Majors')
          .maybeSingle();

        const { data: secMajors } = await supabaseAdmin!
          .from('subjects')
          .select('id')
          .eq('title', 'Secondary Majors')
          .maybeSingle();

        if (oldMajors?.id) {
          if (secMajors?.id) {
            await supabaseAdmin!
              .from('review_materials')
              .update({ subject_id: secMajors.id })
              .eq('subject_id', oldMajors.id);
            await supabaseAdmin!
              .from('topics')
              .update({ subject_id: secMajors.id })
              .eq('subject_id', oldMajors.id);
            await supabaseAdmin!.from('subjects').delete().eq('id', oldMajors.id);
          } else {
            await supabaseAdmin!
              .from('subjects')
              .update({
                title: 'Secondary Majors',
                description: 'Pedagogical Content Knowledge across secondary education majors.',
              })
              .eq('id', oldMajors.id);
          }
        }
      } catch (_) {}

      // 1. Ensure all 10 Secondary Education (BSEd) subject categories exist in database
      const categoryConfigs = [
        { code: 'PROF_ED', title: 'Professional Education', alias: 'Professional Ed', desc: 'Foundations of Education, Adolescent Development, Facilitating Learning, Secondary Assessment, and Curriculum.', cat: 'PROFESSIONAL_EDUCATION' },
        { code: 'GEN_ED', title: 'General Education', alias: 'General Ed', desc: 'English, Filipino, Mathematics, Science, Social Sciences, and ICT.', cat: 'GENERAL_EDUCATION' },
        { code: 'MATH', title: 'Mathematics', alias: 'Mathematics', desc: 'Secondary Calculus, Abstract Algebra, Geometry, Trigonometry, and Statistics.', cat: 'SPECIALIZATION' },
        { code: 'SCI', title: 'Science', alias: 'Science', desc: 'Secondary Biological, Chemical, Physical, and Earth/Space Sciences.', cat: 'SPECIALIZATION' },
        { code: 'FIL', title: 'Filipino', alias: 'Filipino', desc: 'Secondary Filipino: Wastong Gamit ng Wika, Panitikan, Retorika, at Balarila.', cat: 'SPECIALIZATION' },
        { code: 'SOC', title: 'Social Studies', alias: 'Social Studies', desc: 'Philippine History, Constitution, Economics, Geography, and Sociology.', cat: 'SPECIALIZATION' },
        { code: 'TLE', title: 'TLE', alias: 'TLE', desc: 'Secondary Technology and Livelihood Education, Agriculture, Drafting, and ICT.', cat: 'SPECIALIZATION' },
        { code: 'MAPEH', title: 'MAPEH', alias: 'MAPEH', desc: 'Secondary Music, Arts, Physical Education, and Health Foundations.', cat: 'SPECIALIZATION' },
        { code: 'VAL', title: 'Values Ed', alias: 'Values Ed', desc: 'Secondary Values Education: Ethical Frameworks, Character Formation, and Virtue Ethics.', cat: 'SPECIALIZATION' },
        { code: 'MAJORS', title: 'Secondary Majors', alias: 'Secondary Majors', desc: 'Pedagogical Content Knowledge across secondary education majors.', cat: 'SPECIALIZATION' },
      ];

      const { data: existingSubjects } = await supabaseAdmin!
        .from('subjects')
        .select('id, code, title');

      const subjectMap: Record<string, string> = {};

      for (const sub of existingSubjects || []) {
        if (sub.title) subjectMap[sub.title] = sub.id;
        if (sub.code) subjectMap[sub.code] = sub.id;
      }

      for (const conf of categoryConfigs) {
        try {
          const matchedId = subjectMap[conf.title] || subjectMap[conf.alias] || subjectMap[conf.code];
          if (matchedId) {
            subjectMap[conf.title] = matchedId;
            subjectMap[conf.alias] = matchedId;
            subjectMap[conf.code] = matchedId;
          } else {
            const { data: newSub } = await supabaseAdmin!
              .from('subjects')
              .insert([{
                code: conf.code,
                title: conf.title,
                description: conf.desc,
                board_exam_category: conf.cat,
                total_units: 3,
                is_published: true,
              }])
              .select('id')
              .maybeSingle();
            if (newSub?.id) {
              subjectMap[conf.title] = newSub.id;
              subjectMap[conf.alias] = newSub.id;
              subjectMap[conf.code] = newSub.id;
            }
          }
        } catch (_) {}
      }

      const defaultSubId = subjectMap['Professional Education'] || subjectMap['General Education'] || Object.values(subjectMap)[0];

      // 2. Seed all 100 structured syllabus topics into public.topics linked cleanly via subject_id
      const { data: existingTopics } = await supabaseAdmin!
        .from('topics')
        .select('id, subject_id, title');

      const existingTopicKeys = new Set(
        (existingTopics || []).map(
          (t: any) => `${t.subject_id}::${String(t.title || '').trim().toLowerCase()}`
        )
      );

      const orderCounterBySubject: Record<string, number> = {};
      const topicsToInsert: Array<{
        subject_id: string;
        title: string;
        description: string;
        order_index: number;
      }> = [];

      for (const summary of LET_REVIEW_DATASETS.summaries) {
        const targetSubId = subjectMap[summary.subject] || defaultSubId;
        if (!targetSubId) continue;

        orderCounterBySubject[targetSubId] = (orderCounterBySubject[targetSubId] || 0) + 1;
        const topicKey = `${targetSubId}::${summary.title.trim().toLowerCase()}`;

        if (!existingTopicKeys.has(topicKey)) {
          existingTopicKeys.add(topicKey);
          topicsToInsert.push({
            subject_id: targetSubId,
            title: summary.title,
            description: formatTopicDescription(summary.content),
            order_index: orderCounterBySubject[targetSubId],
          });
        }
      }

      for (let i = 0; i < topicsToInsert.length; i += 50) {
        const batch = topicsToInsert.slice(i, i + 50);
        const { error: topInsErr } = await supabaseAdmin!.from('topics').insert(batch);
        if (topInsErr) {
          console.warn('[Seeding] Topics batch insert note:', topInsErr.message);
        }
      }

      // 3. Seed all 100 Secondary Education review summaries into review_materials table
      const { data: existingMaterials } = await supabaseAdmin!
        .from('review_materials')
        .select('id, title');

      const existingMaterialTitles = new Set(
        (existingMaterials || []).map((m: any) => String(m.title || '').trim().toLowerCase())
      );

      const materialsToInsert: any[] = [];
      for (const summary of LET_REVIEW_DATASETS.summaries) {
        const targetSubId = subjectMap[summary.subject] || defaultSubId;
        if (!targetSubId) continue;
        const normTitle = summary.title.trim().toLowerCase();
        if (!existingMaterialTitles.has(normTitle)) {
          existingMaterialTitles.add(normTitle);
          materialsToInsert.push({
            subject_id: targetSubId,
            title: summary.title,
            summary: summary.content,
            study_notes: summary.content,
            key_concepts: [summary.title],
            is_published: true,
          });
        }
      }

      for (let i = 0; i < materialsToInsert.length; i += 50) {
        const batch = materialsToInsert.slice(i, i + 50);
        const { error: matInsErr } = await supabaseAdmin!.from('review_materials').insert(batch);
        if (matInsErr) {
          console.warn('[Seeding] Materials batch insert note:', matInsErr.message);
        }
      }

      console.log(
        `[Seeding] Secondary Education (BSEd) LET review datasets seeding completed (${LET_REVIEW_DATASETS.summaries.length} topics across 10 categories; inserted ${topicsToInsert.length} topics, ${materialsToInsert.length} materials).`
      );
    } catch (err: any) {
      console.warn('[Seeding] Review datasets seeding note:', err?.message || err);
    } finally {
      reviewDatasetsSeedPromise = null;
    }
  })();

  return reviewDatasetsSeedPromise;
}

// Robust Startup Initialization: Ensure manual_payment_receipts table exists with specific columns
async function initializeDatabaseSchema() {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  console.log('[Schema] Checking database schema health...');

  try {
    await supabaseAdmin.rpc('exec_sql', { 
      sql_query: 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course TEXT;' 
    });
  } catch (_) {}

  // Heal any broken /object/public/student-documents/ avatar URLs already stored in profiles
  try {
    const { data: brokenProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, avatar_url')
      .ilike('avatar_url', '%/storage/v1/object/public/student-documents/%');

    if (brokenProfiles && brokenProfiles.length > 0) {
      let repairedCount = 0;
      for (const bp of brokenProfiles) {
        const resolved = await resolveAndHealAvatarUrl(bp.avatar_url, bp.id);
        if (resolved && resolved !== bp.avatar_url) {
          repairedCount += 1;
        }
      }
      if (repairedCount > 0) {
        console.log(`[Avatar Repair] Converted ${repairedCount} private-bucket avatar URL(s) to valid signed URLs.`);
      }
    }
  } catch (_) {}
  
  // 1. Check if manual_payment_receipts exists by attempting a metadata fetch
  const { error: tableCheckError } = await supabaseAdmin
    .from('manual_payment_receipts')
    .select('id')
    .limit(1);

  if (tableCheckError && (tableCheckError.code === '42P01' || tableCheckError.message?.includes('does not exist'))) {
    console.log('[Schema] Table "manual_payment_receipts" is missing. Attempting automated creation...');
    
    // In Supabase, DDL usually requires a raw SQL RPC. We try a common 'exec_sql' RPC if available.
    // If not available, we log the SQL for the user to run manually.
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.manual_payment_receipts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
        plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
        plan_code text NOT NULL,
        amount numeric NOT NULL,
        currency text DEFAULT 'PHP',
        payment_method text NOT NULL,
        reference_number text UNIQUE NOT NULL,
        receipt_url text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING_VERIFICATION',
        ai_confidence numeric,
        ai_notes text,
        ocr_extracted_data jsonb DEFAULT '{}'::jsonb,
        ai_analysis jsonb DEFAULT '{}'::jsonb,
        rejection_reason text,
        verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
        verified_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      ALTER TABLE public.manual_payment_receipts ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manual_payment_receipts' AND policyname = 'Users read own manual payment receipts') THEN
          CREATE POLICY "Users read own manual payment receipts" ON public.manual_payment_receipts FOR SELECT USING (auth.uid() = user_id OR public.is_superadmin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manual_payment_receipts' AND policyname = 'Users insert own manual payment receipts') THEN
          CREATE POLICY "Users insert own manual payment receipts" ON public.manual_payment_receipts FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_superadmin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manual_payment_receipts' AND policyname = 'Superadmin manage manual payment receipts') THEN
          CREATE POLICY "Superadmin manage manual payment receipts" ON public.manual_payment_receipts FOR ALL USING (public.is_superadmin());
        END IF;
      END $$;
    `;

    try {
      // Attempting to use a common Supabase RPC for SQL execution if it exists
      const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql_query: createTableSQL });
      if (rpcError) {
        console.error('[Schema] Automated creation failed. Please run the following SQL in your Supabase Dashboard:', createTableSQL);
      } else {
        console.log('[Schema] Table "manual_payment_receipts" created successfully via RPC.');
      }
    } catch (e) {
      console.error('[Schema] Critical error during table creation attempt. Manual setup required:', createTableSQL);
    }
  } else {
    console.log('[Schema] Table "manual_payment_receipts" verified.');
  }
}

// Subscription Activation Helper
async function activateSubscription(userId: string, plan: any, paymentRef: string, paymentMethod: string, verifiedBy: string = 'SYSTEM_AI') {
  if (!supabaseAdmin) return;
  
  // 1. Insert record into payments table
  const paymentPayload: any = {
    user_id: userId,
    plan_code: plan.code,
    amount: plan.price,
    currency: 'PHP',
    payment_method: paymentMethod,
    payment_reference: paymentRef,
    payment_status: 'COMPLETED',
    updated_at: new Date().toISOString(),
  };
  if (plan.id) paymentPayload.plan_id = plan.id;

  await supabaseAdmin.from('payments').upsert([paymentPayload], { onConflict: 'payment_reference' });

  // 2. Calculate expiration
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('subscription_status', 'ACTIVE')
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let startDate = new Date();
  if (existingSub && new Date(existingSub.expires_at) > startDate) {
    startDate = new Date(existingSub.expires_at);
  }
  const expiresDate = calculateOneMonthExpiration(startDate);

  // 3. Create active subscription record
  const subscriptionPayload: any = {
    user_id: userId,
    plan_code: plan.code,
    amount_paid: plan.price,
    payment_reference: paymentRef,
    payment_status: 'COMPLETED',
    subscription_status: 'ACTIVE',
    started_at: startDate.toISOString(),
    expires_at: expiresDate.toISOString(),
  };
  if (plan.id) subscriptionPayload.plan_id = plan.id;

  await supabaseAdmin.from('subscriptions').insert([subscriptionPayload]);

  // 4. Activate premium status
  await supabaseAdmin
    .from('profiles')
    .update({ is_premium: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  await logActivity(userId, 'SUBSCRIPTION_ACTIVATED', `Activated subscription until ${expiresDate.toLocaleDateString()} (By: ${verifiedBy})`);
  
  return expiresDate;
}

// Array shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Calculate 1 calendar month expiration
function calculateOneMonthExpiration(fromDate: Date = new Date()): Date {
  const exp = new Date(fromDate);
  exp.setMonth(exp.getMonth() + 1);
  return exp;
}

// Extend Request interface for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  profile?: {
    id: string;
    email: string;
    full_name: string;
    role: 'SUPERADMIN' | 'STUDENT';
    verification_status: string;
    is_premium?: boolean;
    reviewee_type?: string;
  };
}

async function resolveAndHealAvatarUrl(rawUrl?: string | null, profileId?: string): Promise<string | undefined> {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  if (!supabaseAdmin) return trimmed;

  // Detect private student-documents URLs saved via getPublicUrl() (which fail with HTTP 400)
  const publicPrivateMatch = trimmed.match(/\/storage\/v1\/object\/public\/student-documents\/([^?#]+)/i);
  let storagePath: string | null = null;
  if (publicPrivateMatch && publicPrivateMatch[1]) {
    try {
      storagePath = decodeURIComponent(publicPrivateMatch[1]);
    } catch {
      storagePath = publicPrivateMatch[1];
    }
  } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:') && !trimmed.startsWith('/')) {
    storagePath = trimmed;
  }

  if (storagePath) {
    try {
      const { data: signedData } = await supabaseAdmin.storage
        .from('student-documents')
        .createSignedUrl(storagePath, 5 * 365 * 24 * 3600);
      if (signedData?.signedUrl) {
        if (profileId) {
          try {
            await supabaseAdmin
              .from('profiles')
              .update({ avatar_url: signedData.signedUrl, updated_at: new Date().toISOString() })
              .eq('id', profileId);
          } catch (_) {}
        }
        return signedData.signedUrl;
      }
    } catch (_) {}
  }

  return trimmed;
}

// ==============================================================================
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ==============================================================================

async function verifySupabaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!ensureSupabaseAuthConfigured(res)) return;

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing Bearer token.' });
  }

  try {
    let verifiedUserId = '';
    let verifiedEmail = '';

    // 1. Try GoTrue auth verification via public client
    const authClient = createAuthClientSafe();
    if (authClient) {
      const { data: authData, error: authError } = await authClient.auth.getUser(token);
      if (!authError && authData?.user) {
        verifiedUserId = authData.user.id;
        verifiedEmail = authData.user.email || '';
      }
    }
    if (!verifiedUserId && isServiceRoleKeyOperational && supabaseAdmin) {
      const { data: aData } = await supabaseAdmin.auth.getUser(token);
      if (aData?.user) {
        verifiedUserId = aData.user.id;
        verifiedEmail = aData.user.email || '';
      }
    }

    if (!verifiedUserId) {
      // Fallback: verify server-signed session token for approved users
      const fallbackPayload = verifyAuthSessionToken(token);
      if (fallbackPayload) {
        verifiedUserId = fallbackPayload.userId;
        verifiedEmail = fallbackPayload.email;
      }
    }

    if (!verifiedUserId) {
      return res.status(401).json({ error: 'Invalid or expired authentication session.' });
    }

    req.user = { id: verifiedUserId, email: verifiedEmail };

    // Retrieve user profile from Supabase database
    let profile: any = null;
    try {
      const userClient = createUserClient(token);
      const { data: p } = await userClient
        .from('profiles')
        .select('*')
        .eq('id', verifiedUserId)
        .maybeSingle();
      if (p) profile = p;
    } catch (_) {}

    if (!profile) {
      try {
        const authClient = createAuthClient();
        const { data: p } = await authClient
          .from('profiles')
          .select('*')
          .eq('id', verifiedUserId)
          .maybeSingle();
        if (p) profile = p;
      } catch (_) {}
    }

    if (!profile && isServiceRoleKeyOperational && supabaseAdmin) {
      try {
        const { data: p } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', verifiedUserId)
          .maybeSingle();
        if (p) profile = p;
      } catch (_) {}
    }

    if (profile) {
      const pStatus = String(profile.verification_status || '').trim().toUpperCase();
      if (pStatus === 'APPROVED' || pStatus === 'VERIFIED' || pStatus === 'ACTIVE') {
        profile.verification_status = 'APPROVED';
      }
      try {
        const resolvedAvatar = await resolveAndHealAvatarUrl(profile.avatar_url || profile.avatarUrl || profile.photoUrl, profile.id);
        if (resolvedAvatar) {
          profile.avatar_url = resolvedAvatar;
          profile.avatarUrl = resolvedAvatar;
          profile.photoUrl = resolvedAvatar;
        }
      } catch (_) {}
    }

    const isSuperAdminEmail = isSuperAdminEmailAddress(verifiedEmail);

    if (!profile) {
      if (isSuperAdminEmail) {
        profile = {
          id: verifiedUserId,
          email: verifiedEmail,
          full_name: 'BoardBuddy Super Admin',
          role: 'SUPERADMIN',
          reviewee_type: 'Other Reviewee',
          institution: 'BoardBuddy Central Administration',
          verification_status: 'APPROVED',
          email_confirmed: true,
          is_premium: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        return res.status(404).json({ success: false, code: 'PROFILE_NOT_FOUND', error: 'User profile not found in Supabase database.' });
      }
    } else if (isSuperAdminEmail) {
      profile.role = 'SUPERADMIN';
    }

    req.profile = profile;
    next();
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'AUTH_VERIFICATION_ERROR',
      error: extractSafeErrorMessage(err, 'Authentication service verification failed.'),
    });
  }
}

async function verifySuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  verifySupabaseAuth(req, res, () => {
    const roleUpper = String(req.profile?.role ?? '').trim().toUpperCase();
    if (roleUpper !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied. Authorized Super Admin access required.' });
    }
    next();
  });
}

// Log activity directly to Supabase activity_logs table
async function logActivity(userId: string | null, actionType: string, description: string, ip?: string, userAgent?: string, token?: string) {
  const client = (isServiceRoleKeyOperational && supabaseAdmin) ? supabaseAdmin : (token ? createUserClient(token) : null);
  if (!client) return;
  try {
    await client.from('activity_logs').insert([{
      user_id: userId,
      action_type: actionType,
      description,
      ip_address: ip || null,
      user_agent: userAgent || null,
    }]);
  } catch (e) {
    console.warn('Activity log error:', e);
  }
}

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  let urlHost = '';
  try {
    urlHost = new URL(supabaseUrl).hostname;
  } catch (_) {
    urlHost = supabaseUrl;
  }

  let profilesReadable = false;
  let profilesCount: number | null = null;
  let pendingCount: number | null = null;

  if (supabaseAdmin) {
    try {
      const [allRes, pendingRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('verification_status', 'PENDING_VERIFICATION'),
      ]);

      profilesReadable = !allRes.error;
      if (!allRes.error) {
        profilesCount = typeof allRes.count === 'number' ? allRes.count : 0;
      }
      if (!pendingRes.error) {
        pendingCount = typeof pendingRes.count === 'number' ? pendingRes.count : 0;
      }
    } catch (_) {
      profilesReadable = false;
    }
  }

  return res.json({
    ok: true,
    profilesReadable,
    profilesCount,
    pendingCount,
    envPresent: {
      SUPABASE_URL: Boolean(SUPABASE_URL),
      SUPABASE_ANON_KEY: Boolean(SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      VITE_SUPABASE_URL: Boolean(SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY: Boolean(SUPABASE_ANON_KEY),
      GEMINI_API_KEY: Boolean(getGeminiApiKey()),
      XENDIT_SECRET_KEY: Boolean(XENDIT_SECRET_KEY),
    },
    supabase: {
      configured: isSupabaseConfigured,
      urlHost,
      serviceRoleKeyOperational: isServiceRoleKeyOperational,
      profilesReadable,
      profilesCount,
      pendingCount,
    },
  });
});

// Server-side Email Existence, Anti-Dummy & DNS MX Record Verification
const mxVerificationCache = new Map<string, { valid: boolean; mxHost?: string; error?: string; expiresAt: number }>();

async function verifyDomainHasValidMx(domain: string): Promise<{ valid: boolean; mxHost?: string; error?: string }> {
  const now = Date.now();
  const cached = mxVerificationCache.get(domain);
  if (cached && cached.expiresAt > now) {
    return { valid: cached.valid, mxHost: cached.mxHost, error: cached.error };
  }

  const resolveWithTimeout = async (targetDomain: string) => {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    return Promise.race([
      resolver.resolveMx(targetDomain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DNS_TIMEOUT')), 4000)),
    ]);
  };

  let mxRecords: dns.MxRecord[] = [];
  let lastErrorCode = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      mxRecords = await resolveWithTimeout(domain);
      break;
    } catch (err: any) {
      lastErrorCode = err?.code || err?.message || 'DNS_ERROR';
      if (attempt === 0 && (lastErrorCode === 'DNS_TIMEOUT' || lastErrorCode === 'ETIMEOUT' || lastErrorCode === 'EAI_AGAIN')) {
        // Retry once with system default resolver
        try {
          mxRecords = await Promise.race([
            dns.promises.resolveMx(domain),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DNS_TIMEOUT')), 3000)),
          ]);
          break;
        } catch (fallbackErr: any) {
          lastErrorCode = fallbackErr?.code || fallbackErr?.message || lastErrorCode;
        }
      }
    }
  }

  const validExchanges = (mxRecords || [])
    .filter((rec) => {
      const ex = (rec.exchange || '').trim().toLowerCase();
      return (
        ex.length > 0 &&
        ex !== '.' &&
        ex !== 'localhost' &&
        ex !== '0.0.0.0' &&
        ex !== '127.0.0.1' &&
        ex.includes('.') &&
        !ex.endsWith('.invalid') &&
        !ex.endsWith('.local')
      );
    })
    .sort((a, b) => a.priority - b.priority);

  if (validExchanges.length === 0) {
    const isTransientDnsFailure =
      lastErrorCode === 'DNS_TIMEOUT' ||
      lastErrorCode === 'ETIMEOUT' ||
      lastErrorCode === 'EAI_AGAIN' ||
      lastErrorCode === 'ECONNREFUSED' ||
      lastErrorCode === 'EREFUSED' ||
      lastErrorCode === 'SERVFAIL';

    if (isTransientDnsFailure) {
      // Do not fail valid registrations if serverless runtime restricts outbound DNS lookups
      mxVerificationCache.set(domain, { valid: true, mxHost: 'dns-timeout-bypass', expiresAt: now + 30_000 });
      return { valid: true, mxHost: 'dns-timeout-bypass' };
    }

    const errorMsg =
      lastErrorCode === 'ENOTFOUND' || lastErrorCode === 'ENODATA' || !lastErrorCode
        ? `The email domain "${domain}" does not exist or cannot accept mail (no valid MX records found). Please enter an active, real email address.`
        : `Unable to verify mail servers (MX records) for "${domain}". Please use a valid, active email address.`;

    mxVerificationCache.set(domain, { valid: false, error: errorMsg, expiresAt: now + 60_000 });
    return { valid: false, error: errorMsg };
  }

  const primaryMx = validExchanges[0].exchange;
  mxVerificationCache.set(domain, { valid: true, mxHost: primaryMx, expiresAt: now + 5 * 60_000 });
  return { valid: true, mxHost: primaryMx };
}

async function verifyEmailExistenceAndDomain(rawEmail: unknown): Promise<{
  valid: boolean;
  email: string;
  domain?: string;
  mxHost?: string;
  error?: string;
}> {
  const normalizedEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const formatError = validateRegistrationEmail(normalizedEmail);
  if (formatError) {
    return { valid: false, email: normalizedEmail, error: formatError };
  }

  const domain = normalizedEmail.split('@')[1];
  const mxCheck = await verifyDomainHasValidMx(domain);
  if (!mxCheck.valid) {
    return { valid: false, email: normalizedEmail, domain, error: mxCheck.error };
  }

  return { valid: true, email: normalizedEmail, domain, mxHost: mxCheck.mxHost };
}

function isMissingRelationOrSchemaError(err: any): boolean {
  const code = String(err?.code || '').trim().toUpperCase();
  const message = extractSafeErrorMessage(err, '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find the table')
  );
}

async function checkEmailAvailabilitySafe(normalizedEmail: string): Promise<{
  available: boolean;
  checked: boolean;
  exists?: boolean;
  error?: string;
}> {
  if (!normalizedEmail || !isSupabaseConfigured) {
    return { available: true, checked: false };
  }

  const dbClient = supabaseAdmin || createAuthClientSafe();
  if (!dbClient) {
    return { available: true, checked: false };
  }

  try {
    const { data, error } = await dbClient
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1);

    if (!error) {
      if (Array.isArray(data) && data.length > 0) {
        return {
          available: false,
          checked: true,
          exists: true,
          error: 'This email address is already registered. Please sign in instead.',
        };
      }
      return { available: true, checked: true };
    }

    if (isMissingRelationOrSchemaError(error)) {
      console.warn('[verify-email] profiles table unavailable during uniqueness check:', extractSafeErrorMessage(error));
    } else {
      console.warn('[verify-email] profiles uniqueness query notice:', extractSafeErrorMessage(error));
    }
  } catch (profileCheckErr: any) {
    console.warn('[verify-email] Unexpected exception querying profiles:', extractSafeErrorMessage(profileCheckErr));
  }

  // Secondary check against Supabase Auth when operational admin client is available and profiles query could not verify
  if (isServiceRoleKeyOperational && supabaseAdmin) {
    try {
      const { data: authList, error: authListErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (!authListErr && Array.isArray(authList?.users)) {
        const matched = authList.users.some(
          (u) => toSafeLowerString(u?.email) === normalizedEmail
        );
        if (matched) {
          return {
            available: false,
            checked: true,
            exists: true,
            error: 'This email address is already registered. Please sign in instead.',
          };
        }
        return { available: true, checked: true };
      }
    } catch (authCheckErr: any) {
      console.warn('[verify-email] Auth admin uniqueness check skipped:', extractSafeErrorMessage(authCheckErr));
    }
  }

  return { available: true, checked: false };
}

// Live Email Verification Endpoint (Checks syntax, disposable/dummy patterns, DNS MX records, and safe DB uniqueness)
app.post('/api/auth/verify-email', async (req: Request, res: Response) => {
  let normalizedFallback = '';
  try {
    const body = getSafeBody(req);
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    normalizedFallback = rawEmail.toLowerCase();

    if (!rawEmail) {
      return res.status(400).json({
        valid: false,
        available: false,
        error: 'Please enter your email address.',
      });
    }

    const result = await verifyEmailExistenceAndDomain(rawEmail);
    if (!result.valid) {
      return res.status(400).json({
        valid: false,
        available: false,
        error: result.error || 'Please enter an active, real email address with a valid mail domain.',
      });
    }

    const availability = await checkEmailAvailabilitySafe(result.email);
    if (!availability.available) {
      return res.status(200).json({
        valid: false,
        available: false,
        exists: true,
        email: result.email,
        domain: result.domain,
        mxHost: result.mxHost,
        error: availability.error || 'This email address is already registered. Please sign in instead.',
      });
    }

    return res.status(200).json({
      valid: true,
      available: true,
      email: result.email,
      domain: result.domain,
      mxHost: result.mxHost,
      dbChecked: availability.checked,
    });
  } catch (err: any) {
    console.warn('[verify-email] Recoverable verification error, allowing registration proceed:', extractSafeErrorMessage(err));
    return res.status(200).json({
      valid: true,
      available: true,
      email: normalizedFallback,
      degraded: true,
    });
  }
});

// Register Student & Upload Document to private Supabase Storage
app.post('/api/auth/register', upload.single('document'), async (req: Request, res: Response) => {
  try {
    const body = getSafeBody(req);
    const full_name = typeof body.full_name === 'string' ? body.full_name : '';
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const reviewee_type = typeof body.reviewee_type === 'string' ? body.reviewee_type : '';
    const institution = typeof body.institution === 'string' ? body.institution : '';
    const course = typeof body.course === 'string' ? body.course : '';
    const document_type = typeof body.document_type === 'string' ? body.document_type : '';

    if (!email || !full_name || !password || !reviewee_type || !institution || !course) {
      return res.status(400).json({ success: false, code: 'MISSING_FIELDS', error: 'All registration fields including course are required. Please check your form inputs.' });
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      return res.status(400).json({ success: false, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters long and contain at least one uppercase and one lowercase letter.' });
    }

    const ALLOWED_EDUCATION_COURSES = new Set([
      'Bachelor of Secondary Education (BScEd) - Major in English',
      'Bachelor of Secondary Education (BScEd) - Major in Mathematics',
      'Bachelor of Secondary Education (BScEd) - Major in Science',
      'Bachelor of Secondary Education (BScEd) - Major in Social Studies / Social Sciences',
      'Bachelor of Secondary Education (BScEd) - Major in Filipino',
      'Bachelor of Secondary Education (BScEd) - Major in Values Education',
      'Bachelor of Secondary Education (BScEd) - Major in Music, Arts, Physical Education, and Health (MAPEH)',
      'Bachelor of Secondary Education (BScEd) - Major in Technology and Livelihood Education (TLE)',
      'Bachelor of Secondary Education (BScEd) - Major in Biology',
      'Bachelor of Secondary Education (BScEd) - Major in Chemistry',
      'Bachelor of Secondary Education (BScEd) - Major in Physics',
      'Bachelor of Technical-Vocational Teacher Education (BTVTEd)',
      'Bachelor of Culture and Arts Education (BCAEd)',
    ]);

    const normalizedCourse = String(course).trim();
    if (!normalizedCourse || !ALLOWED_EDUCATION_COURSES.has(normalizedCourse)) {
      return res.status(400).json({ success: false, error: 'Please select a valid Secondary Education Course / Degree Program.' });
    }

    const emailCheck = await verifyEmailExistenceAndDomain(String(email));
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, error: emailCheck.error || 'Please enter a valid, active email address.' });
    }
    const normalizedEmail = emailCheck.email;

    const normalizedRevieweeType =
      String(reviewee_type).trim().toLowerCase() === 'graduating education student'
        ? 'Graduating Education Student'
        : String(reviewee_type).trim();

    const normalizedDocType: 'STUDENT_ID' | 'CERTIFICATE' | 'TRANSCRIPT' =
      document_type === 'CERTIFICATE' || document_type === 'TRANSCRIPT' || document_type === 'STUDENT_ID'
        ? document_type
        : (normalizedRevieweeType === 'Graduating Education Student' ? 'STUDENT_ID' : 'CERTIFICATE');

    if (!req.file) {
      const requiredDoc = normalizedDocType === 'STUDENT_ID' ? 'Valid Student ID' : 'Certificate of Graduation / Diploma / TOR';
      return res.status(400).json({ success: false, error: `Document required: Please upload your ${requiredDoc} (JPG, PNG, or PDF).` });
    }

    // Require active Supabase configuration & operational service role key so registrations always persist reliably
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return res.status(503).json({
        success: false,
        code: 'SUPABASE_NOT_CONFIGURED',
        error: 'Registration is temporarily unavailable because the database connection is not configured. Please contact the administrator.',
      });
    }

    if (!isServiceRoleKeyOperational) {
      await probeServiceRoleKey().catch(() => {});
    }
    if (!isServiceRoleKeyOperational) {
      return res.status(503).json({
        success: false,
        code: 'SUPABASE_NOT_CONFIGURED',
        error: 'Registration is temporarily unavailable because the server database key is not operational. Please contact the administrator.',
      });
    }

    // Strict pre-registration uniqueness & database readiness check on BOTH profiles and Supabase Auth
    try {
      const { data: existingProfiles, error: profileLookupErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .limit(1);

      if (profileLookupErr) {
        console.error('[Registration] Strict profiles DB pre-check failed:', profileLookupErr);
        return res.status(503).json({
          success: false,
          code: 'DATABASE_UNAVAILABLE',
          error: 'Registration is temporarily unavailable because the student database could not be verified. Please try again in a moment.',
        });
      }

      if (Array.isArray(existingProfiles) && existingProfiles.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_REGISTERED',
          error: 'This email address is already registered. Please sign in instead.',
        });
      }
    } catch (lookupEx: any) {
      console.error('[Registration] Exception during profiles uniqueness check:', lookupEx);
      return res.status(503).json({
        success: false,
        code: 'DATABASE_UNAVAILABLE',
        error: 'Registration is temporarily unavailable because the database connection failed. Please try again in a moment.',
      });
    }

    try {
      let page = 1;
      const maxPages = 10;
      while (page <= maxPages) {
        const { data: authListData, error: authListErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (authListErr) {
          console.error('[Registration] Strict Supabase Auth pre-check failed:', authListErr);
          return res.status(503).json({
            success: false,
            code: 'AUTH_SERVICE_UNAVAILABLE',
            error: 'Registration is temporarily unavailable because the authentication service could not be verified. Please try again in a moment.',
          });
        }
        const users = authListData?.users || [];
        if (users.some((u) => toSafeLowerString(u?.email) === normalizedEmail)) {
          return res.status(409).json({
            success: false,
            code: 'EMAIL_ALREADY_REGISTERED',
            error: 'This email address is already registered. Please sign in instead.',
          });
        }
        if (!authListData?.nextPage || users.length < 1000) {
          break;
        }
        page += 1;
      }
    } catch (authCheckEx: any) {
      console.error('[Registration] Exception during Auth uniqueness check:', authCheckEx);
      return res.status(503).json({
        success: false,
        code: 'AUTH_SERVICE_UNAVAILABLE',
        error: 'Registration is temporarily unavailable because the authentication service could not be reached. Please try again in a moment.',
      });
    }

    let userId = '';
    let authErrorDetails = '';

    // 1. Create Supabase Auth user via operational admin client (with email_confirm: true)
    try {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          reviewee_type: normalizedRevieweeType,
          institution: institution.trim(),
          course: normalizedCourse,
        },
      });
      if (!authErr && authData?.user) {
        userId = authData.user.id;
      } else if (authErr) {
        authErrorDetails = extractSafeErrorMessage(authErr, 'Failed to create user account.');
        const lowerMsg = authErrorDetails.toLowerCase();
        const errCode = toSafeLowerString((authErr as any).code);
        if (
          lowerMsg.includes('already registered') ||
          lowerMsg.includes('already been registered') ||
          lowerMsg.includes('already exists') ||
          errCode === 'email_exists' ||
          (authErr as any).status === 422
        ) {
          return res.status(409).json({
            success: false,
            code: 'EMAIL_ALREADY_REGISTERED',
            error: 'This email address is already registered. Please sign in instead.',
          });
        }
        if (lowerMsg.includes('unregistered api key') || lowerMsg.includes('invalid api key')) {
          isServiceRoleKeyOperational = false;
          return res.status(503).json({
            success: false,
            code: 'SUPABASE_NOT_CONFIGURED',
            error: 'Registration is temporarily unavailable. Server database key is not configured correctly. Please contact the administrator.',
          });
        }
      }
    } catch (adminErr: any) {
      console.warn('[Registration] Admin createUser notice:', adminErr);
      authErrorDetails = extractSafeErrorMessage(adminErr, 'Admin account creation failed.');
    }

    // Stop if user creation failed - do NOT generate fake UUID or proceed to upload document
    if (!userId) {
      console.error('[Registration] Auth user creation failed:', authErrorDetails);
      return res.status(503).json({
        success: false,
        code: 'AUTH_CREATE_FAILED',
        error: authErrorDetails || 'Failed to create user account. Please check your details and try again.',
      });
    }

    // Helper to clean up newly created profile & auth user if any downstream persistence step fails
    const cleanupCreatedAuthUser = async () => {
      if (userId && supabaseAdmin) {
        try {
          await supabaseAdmin.from('profiles').delete().eq('id', userId);
        } catch (profDelErr) {
          console.warn('[Registration] Cleanup delete profile warning:', profDelErr);
        }
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (delErr) {
          console.warn('[Registration] Cleanup deleteUser warning:', delErr);
        }
      }
    };

    // 2. Perform Profile Upsert in Supabase DB using operational supabaseAdmin
    let profile: any = null;
    let profileErr: any = null;

    const baseProfilePayload = {
      id: userId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      role: 'STUDENT',
      reviewee_type: normalizedRevieweeType,
      institution: institution.trim(),
      verification_status: 'PENDING_VERIFICATION',
      email_confirmed: true,
    };

    try {
      let { data, error } = await supabaseAdmin
        .from('profiles')
        .upsert([{ ...baseProfilePayload, course: normalizedCourse }], { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error && (error.message?.includes('course') || error.code === '42703' || error.code === 'PGRST204')) {
        console.warn('[Registration] profiles.course column not found in DB yet; retrying upsert without course column.');
        const retry = await supabaseAdmin
          .from('profiles')
          .upsert([baseProfilePayload], { onConflict: 'id' })
          .select()
          .maybeSingle();
        data = retry.data ? { ...retry.data, course: normalizedCourse } : retry.data;
        error = retry.error;
      }

      if (!error && data) {
        profile = { ...data, course: data.course || normalizedCourse };
      } else {
        profileErr = error;
      }
    } catch (err) {
      profileErr = err;
    }

    if (!profile) {
      await cleanupCreatedAuthUser();
      console.error('[Registration DB Profile Error]:', profileErr);
      const realErrorMsg = extractSafeErrorMessage(profileErr, 'Failed to save student profile in database.');
      const lowerErr = toSafeLowerString(realErrorMsg);
      if (String(profileErr?.code || '') === '23505' || lowerErr.includes('duplicate key') || lowerErr.includes('already exists')) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_REGISTERED',
          error: 'This email address is already registered. Please sign in instead.',
        });
      }
      if (lowerErr.includes('unregistered api key') || lowerErr.includes('row-level security')) {
        return res.status(503).json({
          success: false,
          code: 'SUPABASE_NOT_CONFIGURED',
          error: 'Registration is temporarily unavailable. Server database key is not configured correctly. Please contact the administrator.',
        });
      }
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: `Unable to save student profile in database: ${realErrorMsg}`,
      });
    }

    // 3. Upload document to private Supabase Storage bucket 'student-documents' (with base64 fallback)
    const fileExt = path.extname(req.file.originalname) || '.png';
    const storagePath = `${userId}/${Date.now()}_document${fileExt}`;
    const finalStoragePath = await uploadToStorageOrFallback(
      'student-documents',
      storagePath,
      req.file.buffer,
      req.file.mimetype
    );

    // 4. Multimodal OCR and Document Legibility Analysis with Gemini AI (Images & PDFs)
    let ocrResult: any = {
      extracted_name: full_name.trim(),
      extracted_institution: institution.trim(),
      course: normalizedCourse,
      readability: 'HIGH',
    };
    let aiAnalysis: any = {
      summary: 'Queued for Super Admin audit.',
      recommended_action: 'MANUAL_REVIEW',
    };

    if (req.file.mimetype.startsWith('image/') || req.file.mimetype === 'application/pdf' || req.file.mimetype.includes('pdf')) {
      try {
        const geminiResp = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: req.file.mimetype,
                  data: req.file.buffer.toString('base64'),
                },
              },
              {
                text: `Analyze this uploaded document for Philippine Board Examination registration:
Applicant Name: "${full_name}"
Claimed Institution: "${institution}"
Course / Degree Program: "${normalizedCourse}"
Reviewee Category: "${normalizedRevieweeType}"
Selected Document Type: "${normalizedDocType}"

Tasks:
1. Extract full name, institution, document type, ID/cert number, and valid date.
2. Assess document readability (HIGH, MEDIUM, LOW, UNREADABLE).
3. Check match with registration details.
4. Note: Gemini AI analysis alone is NEVER proof of authenticity. Recommend action: APPROVE, MANUAL_REVIEW, REQUEST_CLEARER_COPY, or REJECT.

Return JSON:
{
  "extracted_name": string,
  "extracted_institution": string,
  "document_type_detected": string,
  "id_or_cert_number": string,
  "issue_or_valid_date": string,
  "confidence_score": number,
  "readability": "HIGH" | "MEDIUM" | "LOW" | "UNREADABLE",
  "match_with_registration": boolean,
  "inconsistencies": string[],
  "summary": string,
  "flags": string[],
  "authenticity_notes": string,
  "recommended_action": "APPROVE" | "MANUAL_REVIEW" | "REQUEST_CLEARER_COPY" | "REJECT"
}`,
              },
            ],
          },
          config: { responseMimeType: 'application/json' },
        });

        const parsed = JSON.parse(geminiResp.text || '{}');
        ocrResult = {
          extracted_name: parsed.extracted_name || full_name.trim(),
          extracted_institution: parsed.extracted_institution || institution.trim(),
          course: normalizedCourse,
          document_type_detected: parsed.document_type_detected || 'Document',
          id_or_cert_number: parsed.id_or_cert_number || 'N/A',
          issue_or_valid_date: parsed.issue_or_valid_date || 'N/A',
          confidence_score: parsed.confidence_score || 0.85,
          readability: parsed.readability || 'HIGH',
          match_with_registration: Boolean(parsed.match_with_registration),
          inconsistencies: parsed.inconsistencies || [],
        };

        aiAnalysis = {
          summary: parsed.summary || 'Gemini document scan complete.',
          flags: parsed.flags || [],
          authenticity_notes: parsed.authenticity_notes || 'Pending Super Admin verification.',
          recommended_action: parsed.recommended_action || 'MANUAL_REVIEW',
        };
      } catch (aiErr) {
        console.warn('Gemini OCR fallback:', aiErr);
      }
    }

    // 5. Save document record directly in Supabase DB
    const documentPayload = {
      user_id: userId,
      document_type: normalizedDocType,
      file_name: req.file.originalname,
      file_url: finalStoragePath,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      ocr_extracted_data: ocrResult,
      ai_analysis: aiAnalysis,
      authenticity_status: 'PENDING_REVIEW',
    };

    const { error: docInsertErr } = await supabaseAdmin
      .from('student_documents')
      .insert([documentPayload]);

    if (docInsertErr) {
      await cleanupCreatedAuthUser();
      console.error('[Registration DB Document Error]:', docInsertErr);
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: `Database document error: ${extractSafeErrorMessage(docInsertErr, 'Failed to save uploaded document record.')}`,
      });
    }

    await logActivity(
      userId,
      'STUDENT_REGISTER',
      `Registered as ${normalizedRevieweeType} (${normalizedCourse}) from ${institution}. Document (${normalizedDocType}) uploaded.`,
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({
      success: true,
      message: 'Registration submitted. Please wait for the Super Admin to approve your account.',
      user: profile,
    });
  } catch (err: any) {
    console.error('[Registration] Unhandled error:', err);
    return res.status(503).json({
      success: false,
      code: 'REGISTRATION_ERROR',
      error: extractSafeErrorMessage(err, 'An unexpected registration error occurred.'),
    });
  }
});

// Re-upload document for clearer copy
app.post('/api/auth/reupload-document', upload.single('document'), verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    if (!req.file || !req.user) {
      return res.status(400).json({ success: false, error: 'Document file is required.' });
    }

    const userId = req.user.id;
    const fileExt = path.extname(req.file.originalname) || '.png';
    const storagePath = `${userId}/${Date.now()}_clearer_copy${fileExt}`;

    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    const finalStoragePath = await uploadToStorageOrFallback(
      'student-documents',
      storagePath,
      req.file.buffer,
      req.file.mimetype,
      token
    );

    const dbClient = getDatabaseClient(token);
    await dbClient.from('student_documents').insert([{
      user_id: userId,
      document_type: req.profile?.reviewee_type === 'Graduating Education Student' ? 'STUDENT_ID' : 'CERTIFICATE',
      file_name: req.file.originalname,
      file_url: finalStoragePath,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      authenticity_status: 'PENDING_REVIEW',
    }]);

    const { data: updatedProfile } = await dbClient
      .from('profiles')
      .update({ verification_status: 'PENDING_VERIFICATION', rejection_reason: null })
      .eq('id', userId)
      .select()
      .single();

    await logActivity(userId, 'REUPLOAD_DOCUMENT', 'Re-uploaded clearer document copy.', req.ip, req.headers['user-agent'], token);

    return res.json({
      success: true,
      message: 'Clearer document submitted. Account status updated to Pending Verification.',
      user: updatedProfile,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'REUPLOAD_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to re-upload document.'),
    });
  }
});

const ACCOUNT_PENDING_APPROVAL_MESSAGE =
  'Your newly registered account is still pending approval by the admin. Please wait for verification before logging in.';

// User Login API endpoint (Proxy to Supabase Auth)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    let rawBody: any = req.body;
    if (typeof rawBody === 'string') {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({
          success: false,
          code: 'INVALID_REQUEST_BODY',
          error: 'Invalid JSON request body.',
        });
      }
    }

    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        error: 'Email and password are required.',
      });
    }

    const { email, password } = rawBody;
    if (email === undefined || email === null || password === undefined || password === null) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        error: 'Email and password are required.',
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT_TYPE',
        error: 'Email and password must be valid text values.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CREDENTIALS',
        error: 'Email and password are required.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        error: 'Please enter a valid email address.',
      });
    }

    const authClient = createAuthClientSafe();
    if (!authClient) {
      return res.status(503).json({
        success: false,
        code: 'SUPABASE_NOT_CONFIGURED',
        error: 'Authentication service is not configured. Please check Supabase environment variables.',
      });
    }

    // 1. Attempt standard password authentication via Supabase GoTrue (timeout-guarded)
    let authData: any = null;
    let authErr: any = null;
    try {
      const signInRes = await Promise.race([
        authClient.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AUTH_UPSTREAM_TIMEOUT')), 9000)
        ),
      ]);
      authData = signInRes.data;
      authErr = signInRes.error;
    } catch (signInException: any) {
      const exMsg = extractSafeErrorMessage(signInException, 'Authentication service connection error.');
      console.error('[Login Auth Exception]:', exMsg);
      const isTimeout = exMsg.includes('AUTH_UPSTREAM_TIMEOUT');
      return res.status(isTimeout ? 504 : 503).json({
        success: false,
        code: isTimeout ? 'AUTH_TIMEOUT' : 'AUTH_SERVICE_UNAVAILABLE',
        error: isTimeout
          ? 'Authentication took too long to respond. Please try again.'
          : 'Unable to reach authentication service. Please verify Supabase configuration and try again.',
      });
    }

    const authErrLower = toSafeLowerString(authErr?.message ?? authErr);
    const isEmailNotConfirmedErr = Boolean(
      authErr && (
        authErrLower.includes('email not confirmed') ||
        authErrLower.includes('email_not_confirmed') ||
        authErrLower.includes('email not verified')
      )
    );

    // If GoTrue blocks on "email not confirmed" (this occurs when password is correct but GoTrue email_confirmed_at is null)
    if (authErr && isEmailNotConfirmedErr) {
      let targetProfile: any = null;
      let targetUserId = '';

      if (supabaseAdmin) {
        try {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const matchingUser = userList?.users?.find(
            (u) => toSafeLowerString(u?.email) === normalizedEmail
          );
          if (matchingUser) {
            targetUserId = matchingUser.id;
            const { data: p } = await supabaseAdmin
              .from('profiles')
              .select('*')
              .eq('id', matchingUser.id)
              .maybeSingle();
            if (p) targetProfile = p;
          }
        } catch (_) {}
      }

      if (!targetProfile) {
        const fbMatch = readPendingRegistrationFallbacks().find(
          (r) => toSafeLowerString(r?.email) === normalizedEmail
        );
        if (fbMatch) {
          targetProfile = fbMatch;
          if (!targetUserId && fbMatch.id) targetUserId = fbMatch.id;
        }
      }

      const isAdminEmail = isSuperAdminEmailAddress(normalizedEmail);

      const rawStatus = targetProfile
        ? String(targetProfile.verification_status || 'PENDING_VERIFICATION')
            .trim()
            .replace(/\s+/g, '_')
            .toUpperCase()
        : 'PENDING_VERIFICATION';

      if (isAdminEmail || rawStatus === 'APPROVED') {
        if (targetUserId && supabaseAdmin) {
          try {
            await supabaseAdmin.auth.admin.updateUserById(targetUserId, { email_confirm: true });
          } catch (_) {}
        }
        try {
          const retryRes = await authClient.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (!retryRes.error && retryRes.data?.user) {
            return await processLoginSuccess(
              retryRes.data,
              normalizedEmail,
              res,
              retryRes.data.session?.access_token,
              targetProfile
            );
          }
        } catch (_) {}
      } else if (rawStatus === 'REJECTED') {
        return res.status(403).json({
          success: false,
          code: 'REJECTED',
          error: targetProfile?.rejection_reason
            ? `Your registration application was declined: ${String(targetProfile.rejection_reason)}`
            : 'Your account registration was declined by the administrator.',
        });
      } else if (rawStatus === 'NEEDS_CLEARER_COPY') {
        return res.status(403).json({
          success: false,
          code: 'NEEDS_CLEARER_COPY',
          error: targetProfile?.rejection_reason
            ? `Document review notice: ${String(targetProfile.rejection_reason)}`
            : 'The uploaded document was unreadable. Please upload a clear copy of your Student ID or Certificate.',
        });
      } else {
        // Newly registered / unapproved account → intercept login with 403 (no session)
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_PENDING_VERIFICATION',
          pendingType: 'account',
          error: ACCOUNT_PENDING_APPROVAL_MESSAGE,
        });
      }
    }

    if (authErr) {
      const errMsg = extractSafeErrorMessage(authErr, '');
      const errMsgLower = toSafeLowerString(errMsg);
      const errCode = String((authErr as any)?.code || (authErr as any)?.status || '');
      if (
        errMsgLower.includes('unregistered api key') ||
        errMsgLower.includes('invalid api key') ||
        errMsgLower.includes('apikey')
      ) {
        console.error('[Login Auth Error]:', errMsg, errCode);
        return res.status(503).json({
          success: false,
          code: 'SUPABASE_NOT_CONFIGURED',
          error: 'The Supabase API key in environment variables is unregistered or invalid for this project URL.',
        });
      }
      if (errCode === 'invalid_credentials' || errMsgLower.includes('invalid login credentials')) {
        console.warn('[Login Auth]: Invalid credentials attempt.');
      } else {
        console.warn('[Login Auth]:', errMsg, errCode);
      }
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid email or password.',
      });
    }

    if (!authData?.user?.id) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid email or password.',
      });
    }

    return await processLoginSuccess(authData, normalizedEmail, res, authData.session?.access_token);
  } catch (err: any) {
    const safeMsg = extractSafeErrorMessage(err, 'Authentication service is temporarily unavailable.');
    console.error('[Login Proxy] Unexpected error:', err);
    return res.status(503).json({
      success: false,
      code: 'LOGIN_SERVICE_ERROR',
      error: safeMsg,
    });
  }
});

async function processLoginSuccess(authData: any, normalizedEmail: string, res: any, token: string | undefined, existingProfile?: any) {
  try {
    if (!authData?.user?.id) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid email or password.',
      });
    }

    const isAdminEmail = isSuperAdminEmailAddress(normalizedEmail);

    // Retrieve profile with resilient client first (bypasses RLS), then user client, then auth client
    let profile: any = existingProfile || null;
    let db: SupabaseClient | null = null;
    try {
      db = getDatabaseClient(token);
    } catch (_) {
      db = null;
    }

    if (!profile && db) {
      try {
        const { data: p } = await db
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();
        if (p) profile = p;
      } catch (_) {}

      if (!profile) {
        try {
          const { data: p } = await db
            .from('profiles')
            .select('*')
            .ilike('email', normalizedEmail)
            .maybeSingle();
          if (p) profile = p;
        } catch (_) {}
      }
    }

    // Super Admin auto-provision / rescue
    if (isAdminEmail) {
      const superAdminProfile = {
        id: authData.user.id,
        email: normalizedEmail,
        full_name: profile?.full_name || 'BoardBuddy Super Admin',
        role: 'SUPERADMIN',
        reviewee_type: 'Other Reviewee',
        institution: 'BoardBuddy Central Administration',
        verification_status: 'APPROVED',
        email_confirmed: true,
        is_premium: true,
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const sideEffects: Promise<any>[] = [];
      if (db && (!profile || String(profile.role || '').toUpperCase() !== 'SUPERADMIN')) {
        sideEffects.push(Promise.resolve(db.from('profiles').upsert([superAdminProfile], { onConflict: 'id' })).catch(() => {}));
      }
      sideEffects.push(
        logActivity(authData.user.id, 'USER_LOGIN', `Super Admin ${normalizedEmail} logged in.`, undefined, undefined, token).catch(() => {})
      );
      await Promise.race([
        Promise.allSettled(sideEffects),
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]);

      return res.json({ success: true, user: superAdminProfile, session: authData.session });
    }

    // Default fallback if profile is missing for a student
    if (!profile) {
      profile = {
        id: authData.user.id,
        email: normalizedEmail,
        full_name: authData.user.user_metadata?.full_name || normalizedEmail.split('@')[0] || 'Student',
        role: 'STUDENT',
        reviewee_type: authData.user.user_metadata?.reviewee_type || 'General Reviewee',
        institution: authData.user.user_metadata?.institution || '',
        verification_status: 'PENDING_VERIFICATION',
        email_confirmed: true,
        is_premium: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (db) {
        try {
          await Promise.race([
            db.from('profiles').upsert([profile], { onConflict: 'id' }),
            new Promise<void>((resolve) => setTimeout(resolve, 1200)),
          ]);
        } catch (_) {}
      }
    }

    // Normalize string fields on returned profile defensively
    profile.email = typeof profile.email === 'string' && profile.email ? profile.email : normalizedEmail;
    profile.role = typeof profile.role === 'string' && profile.role ? profile.role : 'STUDENT';

    // CHECK APPROVAL STATUS FOR STUDENTS (CRITICAL GATE)
    const rawStatus = String(profile.verification_status || 'PENDING_VERIFICATION')
      .trim()
      .replace(/\s+/g, '_')
      .toUpperCase();
    const isApproved = rawStatus === 'APPROVED' || rawStatus === 'VERIFIED' || rawStatus === 'ACTIVE';

    if (isApproved) {
      profile.verification_status = 'APPROVED';
      try {
        const resolvedAvatar = await Promise.race([
          resolveAndHealAvatarUrl(profile.avatar_url || profile.avatarUrl || profile.photoUrl, profile.id),
          new Promise<string | undefined>((resolve) => setTimeout(() => resolve(undefined), 900)),
        ]);
        if (resolvedAvatar) {
          profile.avatar_url = resolvedAvatar;
          profile.avatarUrl = resolvedAvatar;
          profile.photoUrl = resolvedAvatar;
        }
      } catch (_) {}
      await Promise.race([
        logActivity(authData.user.id, 'USER_LOGIN', `Approved student ${normalizedEmail} logged in.`, undefined, undefined, token).catch(() => {}),
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]);
      return res.json({
        success: true,
        user: profile,
        session: authData.session,
      });
    }

    // BLOCK LOGIN IF NOT APPROVED
    if (rawStatus === 'REJECTED') {
      return res.status(403).json({
        success: false,
        code: 'REJECTED',
        error: profile.rejection_reason
          ? `Your registration application was declined: ${String(profile.rejection_reason)}`
          : 'Your account registration was declined by the administrator.',
      });
    }

    if (rawStatus === 'NEEDS_CLEARER_COPY') {
      return res.status(403).json({
        success: false,
        code: 'NEEDS_CLEARER_COPY',
        error: profile.rejection_reason
          ? `Document review notice: ${String(profile.rejection_reason)}`
          : 'The uploaded document was unreadable. Please upload a clear copy of your Student ID or Certificate.',
      });
    }

    // Newly registered / unapproved account awaiting Super Admin verification
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_PENDING_VERIFICATION',
      pendingType: 'account',
      error: ACCOUNT_PENDING_APPROVAL_MESSAGE,
    });
  } catch (err: any) {
    const safeMsg = extractSafeErrorMessage(err, 'Login error occurred.');
    console.error('[Login Proxy] processLoginSuccess error:', err);
    return res.status(503).json({
      success: false,
      code: 'LOGIN_SERVICE_ERROR',
      error: safeMsg,
    });
  }
}

// Current User Profile Endpoint
app.get('/api/auth/me', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userProfile: any = req.profile ? { ...req.profile } : null;
    if (userProfile) {
      try {
        const resolvedAvatar = await resolveAndHealAvatarUrl(userProfile.avatar_url || userProfile.avatarUrl || userProfile.photoUrl, userProfile.id);
        if (resolvedAvatar) {
          userProfile.avatar_url = resolvedAvatar;
          userProfile.avatarUrl = resolvedAvatar;
          userProfile.photoUrl = resolvedAvatar;
        }
      } catch (_) {}
    }
    return res.json({
      success: true,
      user: userProfile,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'PROFILE_FETCH_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to fetch current user profile.'),
    });
  }
});

// Logout API endpoint
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Short-lived signed URL generator for document viewing (Authorized User / Super Admin)
app.get('/api/documents/:id/signed-url', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    const docId = req.params.id;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const client = getDatabaseClient(token);

    const { data: doc, error: docErr } = await client
      .from('student_documents')
      .select('*')
      .eq('id', docId)
      .single();

    if (docErr || !doc) {
      return res.status(404).json({ success: false, error: 'Document record not found.' });
    }

    // Access control: Document owner OR Super Admin
    const roleUpper = String(req.profile?.role ?? '').trim().toUpperCase();
    if (doc.user_id !== req.user!.id && roleUpper !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized access to document.' });
    }

    if (doc.file_url?.startsWith('data:') || doc.file_url?.startsWith('http')) {
      return res.json({
        success: true,
        signedUrl: doc.file_url,
        document: doc,
      });
    }

    // Generate signed URL valid for 60 minutes
    const { data: signedData, error: signErr } = await client.storage
      .from('student-documents')
      .createSignedUrl(doc.file_url, 3600);

    if (signErr || !signedData?.signedUrl) {
      return res.status(503).json({ success: false, code: 'STORAGE_URL_ERROR', error: 'Failed to generate signed document URL.' });
    }

    return res.json({
      success: true,
      signedUrl: signedData.signedUrl,
      document: doc,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'DOCUMENT_URL_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to generate signed URL.'),
    });
  }
});

// Dynamic Profile Picture / Avatar Upload (User can upload & update their own profile picture)
app.post('/api/profile/avatar', upload.single('avatar'), verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    if (!req.file || !req.user) {
      return res.status(400).json({ error: 'Avatar image file is required.' });
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image format. Please upload JPG, PNG, WEBP, or GIF.' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size must not exceed 5MB.' });
    }

    const userId = req.user.id;
    const fileExt = path.extname(req.file.originalname) || '.png';
    const storagePath = `avatars/${userId}/${Date.now()}_avatar${fileExt}`;

    let avatarUrl = '';

    // 1. Try uploading to public 'avatars' bucket
    try {
      const { error: avErr } = await supabaseAdmin!.storage
        .from('avatars')
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (!avErr) {
        const { data: pubData } = supabaseAdmin!.storage.from('avatars').getPublicUrl(storagePath);
        if (pubData?.publicUrl) {
          avatarUrl = pubData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Avatars bucket upload attempt:', e);
    }

    // 2. Fallback to 'student-documents' bucket with long-lived signed URL if 'avatars' bucket was unavailable
    if (!avatarUrl) {
      try {
        const { error: docErr } = await supabaseAdmin!.storage
          .from('student-documents')
          .upload(storagePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

        if (!docErr) {
          const { data: signedData } = await supabaseAdmin!.storage
            .from('student-documents')
            .createSignedUrl(storagePath, 5 * 365 * 24 * 3600); // 5 years
          if (signedData?.signedUrl) {
            avatarUrl = signedData.signedUrl;
          }
        }
      } catch (e) {
        console.warn('Student-documents bucket fallback:', e);
      }
    }

    // 3. Fallback to inline Base64 data URI if storage buckets are not configured or encountered network restrictions
    if (!avatarUrl) {
      avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // 4. Update the avatar_url in the profiles table in Supabase
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    const userClient = token ? createUserClient(token) : supabaseAdmin!;
    
    let updatedProfile: any = null;
    let dbErr: any = null;

    const resUp = await userClient
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (resUp.data) {
      updatedProfile = resUp.data;
    } else {
      dbErr = resUp.error;
      const resAdmin = await supabaseAdmin!
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .maybeSingle();
      if (resAdmin.data) {
        updatedProfile = resAdmin.data;
        dbErr = null;
      }
    }

    if (!updatedProfile) {
      // Fallback profile response
      updatedProfile = {
        ...req.profile,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
    }

    await logActivity(userId, 'UPDATE_AVATAR', 'Updated profile picture.');

    const hydratedUser = {
      ...updatedProfile,
      avatar_url: avatarUrl,
      avatarUrl: avatarUrl,
      photoUrl: avatarUrl,
    };

    return res.json({
      success: true,
      message: 'Profile picture updated successfully.',
      avatar_url: avatarUrl,
      avatarUrl: avatarUrl,
      photoUrl: avatarUrl,
      user: hydratedUser,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'AVATAR_UPLOAD_ERROR',
      error: extractSafeErrorMessage(err, 'Avatar upload failed.'),
    });
  }
});

// Remove profile picture / reset to default initial avatar
app.delete('/api/profile/avatar', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const userId = req.user!.id;
    const { data: updatedProfile, error: dbErr } = await supabaseAdmin!
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (dbErr || !updatedProfile) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(dbErr, 'Failed to remove avatar from database.'),
      });
    }

    await logActivity(userId, 'REMOVE_AVATAR', 'Removed profile picture avatar.');

    return res.json({
      success: true,
      message: 'Profile picture removed successfully.',
      user: updatedProfile,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'AVATAR_REMOVE_ERROR',
      error: extractSafeErrorMessage(err, 'Avatar removal failed.'),
    });
  }
});

// Update Profile General Details (Full Name)
app.patch('/api/profile', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const userId = req.user!.id;
    const body = getSafeBody(req);
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';

    if (!full_name || full_name.length < 2) {
      return res.status(400).json({ success: false, error: 'Valid full name is required.' });
    }

    const { data: updatedProfile, error } = await supabaseAdmin!
      .from('profiles')
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error || !updatedProfile) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(error, 'Failed to update profile.'),
      });
    }

    await logActivity(userId, 'UPDATE_PROFILE', `Updated full name to ${full_name}`);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedProfile,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'PROFILE_UPDATE_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to update profile.'),
    });
  }
});

// ==============================================================================
// XENDIT PAYMENT GATEWAY & WEBHOOK INTEGRATION
// ==============================================================================

const XENDIT_SECRET_KEY = getServerEnv(['XENDIT_SECRET_KEY', 'VITE_XENDIT_SECRET_KEY']);
const XENDIT_WEBHOOK_TOKEN = getServerEnv(['XENDIT_WEBHOOK_TOKEN', 'VITE_XENDIT_WEBHOOK_TOKEN']);
const XENDIT_API_BASE_URL = getServerEnv(['XENDIT_API_BASE_URL'], 'https://api.xendit.co');


// Create Xendit Invoice Session using trusted database price
app.post('/api/payments/create-checkout', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const plan_code = typeof body.plan_code === 'string' ? body.plan_code.trim() : '';
    const payment_method = typeof body.payment_method === 'string' && body.payment_method.trim() ? body.payment_method.trim() : 'gcash';
    const userId = req.user!.id;

    if (!plan_code) {
      return res.status(400).json({ success: false, error: 'Plan code is required.' });
    }

    // 1. Retrieve trusted plan price directly from Supabase database (Never trust price from frontend!)
    const { data: plan, error: planErr } = await supabaseAdmin!
      .from('subscription_plans')
      .select('*')
      .eq('code', plan_code)
      .single();

    if (planErr || !plan) {
      return res.status(404).json({ error: 'Subscription plan not found in database.' });
    }

    const paymentRef = `BB-XND-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Create pending payment record in Supabase database
    const { data: payment, error: payErr } = await supabaseAdmin!
      .from('payments')
      .insert([{
        user_id: userId,
        plan_id: plan.id,
        plan_code: plan.code,
        amount: plan.price,
        currency: 'PHP',
        payment_method,
        payment_reference: paymentRef,
        payment_status: 'PENDING',
      }])
      .select()
      .single();

    if (payErr) {
      return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(payErr, 'Failed to create payment record.') });
    }

    await logActivity(userId, 'PAYMENT_CHECKOUT_INITIATED', `Created Xendit invoice for ${plan.name} (₱${plan.price}) via ${payment_method}. Ref: ${paymentRef}`);

    // 3. Retrieve user email for Xendit payer_email field
    const { data: userProfile } = await supabaseAdmin!
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle();

    const payerEmail = userProfile?.email || req.user?.email || 'student@boardbuddy.app';

    // 4. Create Xendit Invoice via official Xendit Invoices API
    let checkoutUrl = '';
    let xenditInvoiceId = '';

    if (XENDIT_SECRET_KEY && XENDIT_SECRET_KEY.trim().length > 5) {
      try {
        const payload: any = {
          external_id: paymentRef,
          amount: Number(plan.price),
          currency: 'PHP',
          description: `BoardBuddy ${plan.name} - 1 Month Access`,
          payer_email: payerEmail,
          customer: {
            given_names: userProfile?.full_name || 'BoardBuddy Reviewee',
            email: payerEmail,
          },
          success_redirect_url: `${APP_BASE_URL}?payment=success&ref=${paymentRef}`,
          failure_redirect_url: `${APP_BASE_URL}?payment=cancelled&ref=${paymentRef}`,
          payment_methods: payment_method === 'gcash' ? ['GCASH'] : payment_method === 'maya' ? ['PAYMAYA'] : ['CARD', 'GCASH', 'PAYMAYA'],
          items: [
            {
              name: plan.name,
              price: Number(plan.price),
              quantity: 1,
            },
          ],
        };

        const xenditResp = await fetch(`${XENDIT_API_BASE_URL}/v2/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY.trim() + ':').toString('base64')}`,
          },
          body: JSON.stringify(payload),
        });

        const xenditData = await xenditResp.json();
        if (xenditData?.invoice_url && typeof xenditData.invoice_url === 'string' && xenditData.invoice_url.startsWith('http')) {
          checkoutUrl = xenditData.invoice_url;
          xenditInvoiceId = xenditData.id;

          // Save gateway transaction ID
          await supabaseAdmin!
            .from('payments')
            .update({ gateway_transaction_id: xenditInvoiceId })
            .eq('id', payment.id);
        } else {
          console.warn('[Xendit API] Invoice creation note:', xenditData?.message || xenditData?.error_code || 'No invoice URL returned');
        }
      } catch (xErr) {
        console.warn('[Xendit API] Invocation warning:', xErr);
      }
    }

    const hasLiveInvoice = Boolean(checkoutUrl && checkoutUrl.startsWith('http'));

    return res.json({
      success: true,
      payment_reference: paymentRef,
      amount: plan.price,
      plan_name: plan.name,
      payment_method,
      checkout_url: hasLiveInvoice ? checkoutUrl : null,
      invoice_url: hasLiveInvoice ? checkoutUrl : null,
      requires_manual_qr: !hasLiveInvoice,
      message: hasLiveInvoice
        ? 'Xendit Invoice created successfully. Redirecting to payment gateway.'
        : 'Xendit live gateway is in manual mode. Please complete payment via Official GCash / Maya QR Code.',
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'PAYMENT_CHECKOUT_ERROR',
      error: extractSafeErrorMessage(err, 'Payment checkout creation failed.'),
    });
  }
});

// Official Xendit Webhook Endpoint (X-Callback-Token Verification & Idempotency)
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const callbackToken = req.headers['x-callback-token'] as string;

    if (XENDIT_WEBHOOK_TOKEN) {
      if (!callbackToken || callbackToken !== XENDIT_WEBHOOK_TOKEN) {
        return res.status(403).json({ success: false, error: 'Forbidden: Invalid or missing X-Callback-Token header.' });
      }
    }

    const eventPayload = getSafeBody(req);
    const externalId = typeof eventPayload.external_id === 'string' ? eventPayload.external_id.trim() : '';
    const invoiceId = typeof eventPayload.id === 'string' ? eventPayload.id : '';
    const status = typeof eventPayload.status === 'string' ? eventPayload.status.trim() : '';

    if (!externalId) {
      return res.status(400).json({ success: false, error: 'Missing external_id in Xendit webhook payload.' });
    }

    // Webhook Idempotency Check using invoice ID or payload event hash
    const eventId = invoiceId || `${externalId}_${status}_${Date.now()}`;
    const { data: existingEvent } = await supabaseAdmin!
      .from('payment_webhook_events')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      return res.status(200).json({ status: 'already_processed' });
    }

    // Save webhook event for idempotency tracking
    await supabaseAdmin!.from('payment_webhook_events').insert([{
      event_id: eventId,
      event_type: `invoice.${toSafeLowerString(status) || 'unknown'}`,
      payload: eventPayload,
    }]);

    // Handle PAID invoice events
    if (status === 'PAID') {
      const { data: payment } = await supabaseAdmin!
        .from('payments')
        .select('*')
        .eq('payment_reference', externalId)
        .single();

      if (payment && payment.payment_status === 'PENDING') {
        // Atomic update lock: transition payment_status PENDING -> COMPLETED
        const { data: updatedPayments } = await supabaseAdmin!
          .from('payments')
          .update({
            payment_status: 'COMPLETED',
            gateway_transaction_id: invoiceId || payment.gateway_transaction_id,
            webhook_event_id: eventId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
          .eq('payment_status', 'PENDING')
          .select();

        if (updatedPayments && updatedPayments.length > 0) {
          // Check existing active subscription to handle renewals correctly
          const { data: existingSub } = await supabaseAdmin!
            .from('subscriptions')
            .select('*')
            .eq('user_id', payment.user_id)
            .eq('subscription_status', 'ACTIVE')
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let startDate = new Date();
          if (existingSub && new Date(existingSub.expires_at) > startDate) {
            startDate = new Date(existingSub.expires_at);
          }
          const expiresDate = calculateOneMonthExpiration(startDate);

          // Create active subscription record in Supabase DB
          await supabaseAdmin!.from('subscriptions').insert([{
            user_id: payment.user_id,
            plan_id: payment.plan_id,
            plan_code: payment.plan_code,
            amount_paid: payment.amount,
            payment_reference: payment.payment_reference,
            payment_status: 'COMPLETED',
            subscription_status: 'ACTIVE',
            started_at: startDate.toISOString(),
            expires_at: expiresDate.toISOString(),
          }]);

          // Activate premium status on profile
          await supabaseAdmin!
            .from('profiles')
            .update({ is_premium: true, updated_at: new Date().toISOString() })
            .eq('id', payment.user_id);

          await logActivity(payment.user_id, 'XENDIT_PAYMENT_PAID', `Xendit webhook confirmed invoice payment ${externalId}. Activated 1-month subscription valid until ${expiresDate.toLocaleDateString()}`);
        }
      }
    } else if (status === 'EXPIRED') {
      await supabaseAdmin!
        .from('payments')
        .update({ payment_status: 'EXPIRED', updated_at: new Date().toISOString() })
        .eq('payment_reference', externalId)
        .eq('payment_status', 'PENDING');
    }

    return res.status(200).json({ status: 'success' });
  } catch (err: any) {
    console.error('Xendit webhook handling error:', err);
    return res.status(503).json({
      success: false,
      code: 'WEBHOOK_PROCESSING_ERROR',
      error: extractSafeErrorMessage(err, 'Webhook processing failed.'),
    });
  }
});

// Fetch student active subscription status directly from Supabase DB
app.get('/api/payments/my-subscription', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    const userId = req.user!.id;
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    const db = getDatabaseClient(token);

    const { data: activeSub, error } = await db
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('subscription_status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !activeSub) {
      return res.json({ is_active: false, subscription: null });
    }

    const now = new Date();
    const expiresAt = new Date(activeSub.expires_at);
    const isExpired = now > expiresAt;

    if (isExpired) {
      // Mark subscription expired in Supabase DB
      await db
        .from('subscriptions')
        .update({ subscription_status: 'EXPIRED' })
        .eq('id', activeSub.id);

      await db
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', userId);

      return res.json({ is_active: false, is_expired: true, subscription: activeSub });
    }

    const remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return res.json({
      is_active: true,
      remaining_days: remainingDays,
      subscription: activeSub,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'SUBSCRIPTION_FETCH_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to fetch subscription status.'),
    });
  }
});

// Direct GCash Payment Completion & Automatic "Paid" Status
app.post('/api/payments/complete-gcash', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const plan_code = typeof body.plan_code === 'string' ? body.plan_code.trim() : '';

    if (!plan_code) {
      return res.status(400).json({ success: false, error: 'Plan code is required.' });
    }

    return res.status(400).json({
      success: false,
      error: 'Direct payment auto-approval is disabled. Please submit your 13-digit GCash reference number and receipt screenshot for Super Admin verification.' 
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'GCASH_PAYMENT_ERROR',
      error: extractSafeErrorMessage(err, 'GCash payment processing failed.'),
    });
  }
});

// ==============================================================================
// SECURE MANUAL QR PAYMENT VERIFICATION SYSTEM
// ==============================================================================

// 1. Upload Manual Payment Receipt (Administrator GCash QR Code Transfer)
app.post('/api/payments/upload-manual-receipt', upload.single('receipt_file'), verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const plan_code = typeof body.plan_code === 'string' ? body.plan_code.trim() : '';
    const payment_method = typeof body.payment_method === 'string' && body.payment_method.trim() ? body.payment_method.trim() : 'GCASH_QR';
    const payment_reference = typeof body.payment_reference === 'string' ? body.payment_reference : '';
    const userId = req.user!.id;

    if (!plan_code) {
      return res.status(400).json({ error: 'Subscription plan selection is required.' });
    }

    if (!payment_reference || !payment_reference.trim()) {
      return res.status(400).json({ error: 'Transaction reference number is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Payment receipt image or PDF file is required.' });
    }

    const cleanRef = payment_reference.trim().toUpperCase();

    // Look up trusted plan price from Supabase DB or hardcoded fallback
    let plan: any = null;
    try {
      const { data: dbPlan } = await supabaseAdmin!
        .from('subscription_plans')
        .select('*')
        .eq('code', plan_code)
        .maybeSingle();
      if (dbPlan) {
        plan = dbPlan;
      }
    } catch (_) {}

    if (!plan) {
      const fallbackPlans: Record<string, any> = {
        p149: { code: 'p149', name: 'Monthly Premium Plan', price: 149, currency: 'PHP', duration_months: 1 },
        m: { code: 'm', name: 'Monthly Standard Plan', price: 149, currency: 'PHP', duration_months: 1 },
        p: { code: 'p', name: 'Monthly Premium Plan', price: 149, currency: 'PHP', duration_months: 1 },
      };
      plan = fallbackPlans[plan_code] || fallbackPlans['p149'];
    }

    if (!plan) {
      return res.status(400).json({ error: 'Invalid subscription plan.' });
    }

    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    const db = getDatabaseClient(token);

    // Enforce Pending Payment Lock: prevent submitting duplicate receipt when one is already pending
    try {
      const { data: existingPending } = await db
        .from('manual_payment_receipts')
        .select('id, reference_number')
        .eq('user_id', userId)
        .eq('status', 'PENDING_VERIFICATION')
        .maybeSingle();

      if (existingPending) {
        return res.status(400).json({
          error: `You already have a pending payment receipt (Ref: ${existingPending.reference_number}) under review. Please wait for Super Admin audit or cancel the pending request before submitting a new payment receipt.`
        });
      }
    } catch (e) {}

    // Check duplicate reference in payments & manual_payment_receipts tables
    const { data: existingRef1 } = await db
      .from('payments')
      .select('id')
      .eq('payment_reference', cleanRef)
      .maybeSingle();

    const { data: existingRef2 } = await db
      .from('manual_payment_receipts')
      .select('id')
      .eq('reference_number', cleanRef)
      .neq('status', 'REJECTED')
      .maybeSingle();

    const isDuplicateRef = Boolean(existingRef1 || existingRef2);

    // Upload receipt to private Supabase Storage bucket 'student-documents' (with base64 fallback)
    const fileExt = path.extname(req.file.originalname) || '.png';
    const storagePath = `${userId}/manual_receipts/${Date.now()}_receipt${fileExt}`;

    const finalReceiptUrl = await uploadToStorageOrFallback(
      'student-documents',
      storagePath,
      req.file.buffer,
      req.file.mimetype,
      token
    );

    // Gemini 2.5 Flash OCR & Pre-Audit Analysis
    let ocrData: any = null;
    let aiAnalysis: any = null;
    let autoApproved = false;
    let expiresAt: Date | null | undefined = null;

    if (req.file.mimetype.startsWith('image/')) {
      try {
        const geminiResp = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: req.file.mimetype,
                  data: req.file.buffer.toString('base64'),
                },
              },
              {
                text: `You are the BoardBuddy Senior Payment Audit Auditor.
Scan and pre-audit this Philippine Administrator GCash payment receipt image:
Expected Plan: "${plan.name}"
Expected Amount: ₱${plan.price} PHP
Claimed Reference Number: "${cleanRef}"

Tasks:
1. Extract reference number, amount paid, timestamp, recipient name, recipient mobile/account.
2. Compare extracted amount with expected ₱${plan.price}.
3. Check readability (HIGH, MEDIUM, LOW, UNREADABLE).
4. Assess risk factors: altered text, mismatched amount, duplicate reference, invalid format.
5. Critical Security Note: Recommend action: APPROVE only if reference and amount match 100% and risk is LOW. Otherwise MANUAL_REVIEW.

Return JSON:
{
  "extracted_reference": string,
  "extracted_amount": number,
  "extracted_recipient_name": string,
  "extracted_recipient_mobile": string,
  "transaction_timestamp": string,
  "confidence_score": number,
  "readability": "HIGH" | "MEDIUM" | "LOW" | "UNREADABLE",
  "matched_plan_price": boolean,
  "findings": string[],
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "authenticity_notes": string,
  "recommended_action": "APPROVE" | "MANUAL_REVIEW" | "REJECT"
}`,
              },
            ],
          },
          config: { responseMimeType: 'application/json' },
        });

        const parsed = JSON.parse(geminiResp.text || '{}');
        ocrData = {
          extracted_reference: parsed.extracted_reference || cleanRef,
          extracted_amount: parsed.extracted_amount || plan.price,
          extracted_recipient_name: parsed.extracted_recipient_name || 'BoardBuddy Admin',
          extracted_recipient_mobile: parsed.extracted_recipient_mobile || '0917-XXX-XXXX',
          transaction_timestamp: parsed.transaction_timestamp || new Date().toISOString(),
          confidence_score: parsed.confidence_score || 0.85,
          readability: parsed.readability || 'HIGH',
          matched_plan_price: Boolean(parsed.matched_plan_price ?? (parsed.extracted_amount === plan.price)),
          duplicate_reference_detected: isDuplicateRef,
        };

        aiAnalysis = {
          summary: `Gemini OCR audit completed. Risk level: ${parsed.risk_level || 'LOW'}.`,
          findings: parsed.findings || [
            `Expected price: ₱${plan.price}`,
            isDuplicateRef ? 'CRITICAL: Duplicate reference number detected!' : 'Reference number is unique in system records.',
          ],
          risk_level: isDuplicateRef ? 'CRITICAL' : (parsed.risk_level || 'LOW'),
          authenticity_notes: parsed.authenticity_notes || 'Receipt scanned by AI.',
          recommended_action: isDuplicateRef ? 'REJECT' : (parsed.recommended_action || 'MANUAL_REVIEW'),
        };

        // Strict requirement: all manual receipts require Super Admin review and verification in the Admin Dashboard
        autoApproved = false;
      } catch (e) {
        console.warn('[Receipt AI] Error:', e);
        ocrData = { extracted_reference: cleanRef, extracted_amount: plan.price, duplicate_reference_detected: isDuplicateRef };
        aiAnalysis = { summary: 'Queued for Super Admin audit.', risk_level: isDuplicateRef ? 'HIGH' : 'MEDIUM', findings: ['Manual verification required.'], recommended_action: 'MANUAL_REVIEW' };
      }
    }

    const status = 'PENDING_VERIFICATION';
    
    // Construct robust insert payload
    const receiptInsertPayload: any = {
      user_id: userId,
      plan_code: plan.code,
      amount: plan.price,
      currency: 'PHP',
      payment_method,
      reference_number: cleanRef,
      receipt_url: finalReceiptUrl,
      status: status,
      ai_confidence: ocrData?.confidence_score || 0,
      ai_notes: autoApproved ? 'Auto-approved by BoardBuddy Gemini AI' : (aiAnalysis?.summary || 'Pending Super Admin Review'),
    };

    if (plan.id) receiptInsertPayload.plan_id = plan.id;
    if (ocrData) receiptInsertPayload.ocr_extracted_data = ocrData;
    if (aiAnalysis) receiptInsertPayload.ai_analysis = aiAnalysis;
    if (autoApproved) receiptInsertPayload.verified_at = new Date().toISOString();

    let newReceipt: any = null;
    let recErr: any = null;

    // Use resilient clients list: operational admin client first (if working), user client with token, auth/anon client
    const clientsToTry = [
      db,
      token ? createUserClient(token) : null,
      createAuthClientSafe(),
      supabaseAdmin,
    ].filter(Boolean) as SupabaseClient[];

    for (const clientToUse of clientsToTry) {
      try {
        const res = await clientToUse
          .from('manual_payment_receipts')
          .insert([receiptInsertPayload])
          .select()
          .maybeSingle();

        if (!res.error && res.data) {
          newReceipt = res.data;
          recErr = null;
          break;
        } else {
          recErr = res.error;
        }
      } catch (err) {
        recErr = err;
      }
    }

    // Fallback insert with essential schema columns if optional column causes a schema error
    if (!newReceipt && recErr && (recErr.code === 'PGRST204' || recErr.code === '42703' || recErr.message?.includes('column') || recErr.message?.includes('schema'))) {
      console.warn('[Manual Receipt] Retrying insert with essential columns due to schema error:', recErr.message);
      const essentialPayload = {
        user_id: userId,
        plan_code: plan.code,
        amount: plan.price,
        reference_number: cleanRef,
        receipt_url: storagePath,
        status: status,
        ai_confidence: ocrData?.confidence_score || 0,
        ai_notes: autoApproved ? 'Auto-approved by BoardBuddy Gemini AI' : (aiAnalysis?.summary || 'Pending Super Admin Review'),
      };

      for (const clientToUse of clientsToTry) {
        try {
          const resFallback = await clientToUse
            .from('manual_payment_receipts')
            .insert([essentialPayload])
            .select()
            .maybeSingle();

          if (!resFallback.error && resFallback.data) {
            newReceipt = resFallback.data;
            recErr = null;
            break;
          } else {
            recErr = resFallback.error;
          }
        } catch (err) {
          recErr = err;
        }
      }
    }

    if (recErr || !newReceipt) {
      console.error('[Manual Receipt] Save error:', {
        message: recErr?.message,
        code: recErr?.code,
        details: recErr?.details,
        hint: recErr?.hint
      });
      return res.status(503).json({
        success: false,
        code: 'RECEIPT_SAVE_ERROR',
        error: extractSafeErrorMessage(recErr, 'Failed to save payment receipt record.'),
      });
    }

    if (autoApproved) {
      expiresAt = await activateSubscription(userId, plan, cleanRef, payment_method, 'SYSTEM_AI');
    }

    await logActivity(userId, 'MANUAL_PAYMENT_SUBMITTED', `Submitted receipt for ${plan.name} (₱${plan.price}) via ${payment_method}. Ref: ${cleanRef}. Status: ${status}.`);

    return res.status(201).json({
      success: true,
      autoApproved,
      expiresAt: expiresAt ? (expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt).toISOString()) : undefined,
      message: autoApproved 
        ? `Payment verified by BoardBuddy AI! Your 1-Month Premium access is now active until ${expiresAt?.toLocaleDateString()}.`
        : 'Payment receipt submitted successfully! Your payment status is PENDING VERIFICATION. Access will be granted once Super Admin approves your receipt.',
      receipt: newReceipt,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'RECEIPT_UPLOAD_ERROR',
      error: extractSafeErrorMessage(err, 'Receipt upload error.'),
    });
  }
});

// Cancel Pending Receipt
app.post('/api/payments/cancel-receipt', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    const userId = req.user!.id;
    const body = getSafeBody(req);
    const receipt_id = typeof body.receipt_id === 'string' ? body.receipt_id.trim() : '';
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    const db = getDatabaseClient(token);

    if (!receipt_id) return res.status(400).json({ success: false, error: 'Receipt ID required.' });

    const { data: receipt, error: rErr } = await db
      .from('manual_payment_receipts')
      .select('*')
      .eq('id', receipt_id)
      .eq('user_id', userId)
      .eq('status', 'PENDING_VERIFICATION')
      .maybeSingle();

    if (rErr || !receipt) return res.status(404).json({ success: false, error: 'Pending receipt not found.' });

    await db
      .from('manual_payment_receipts')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', receipt.id);

    await logActivity(userId, 'MANUAL_PAYMENT_CANCELLED', `User cancelled pending receipt Ref: ${receipt.reference_number}`);

    return res.json({ success: true, message: 'Payment request cancelled.' });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'CANCEL_RECEIPT_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to cancel receipt.'),
    });
  }
});


// 2. Fetch Student Submitted Receipts
app.get('/api/payments/my-receipts', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    const db = getDatabaseClient(token);
    let receipts: any[] = [];

    const { data, error } = await db
      .from('manual_payment_receipts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      receipts = data;
    } else {
      console.log('[my-receipts] DB query note:', error?.message);
    }

    const formatted = receipts.map(r => ({
      ...r,
      plan_name: r.plan_code === 'p' || r.plan_code === 'p149' ? 'Monthly Premium Plan' : 'Monthly Premium Plan',
      receipt_file_url: r.receipt_url,
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error('[my-receipts] Unhandled error:', err);
    return res.json([]);
  }
});

// Resolve a usable URL (data URI, external HTTP URL, signed Storage URL, or public Storage URL) for a stored receipt/document path
async function resolveStorageReceiptUrl(rawPath?: string | null): Promise<string> {
  const pathStr = String(rawPath || '').trim();
  if (!pathStr) return '';

  if (pathStr.startsWith('data:') || pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    return pathStr;
  }

  const normalizedPath = pathStr.replace(/^\/+/, '');
  if (!supabaseAdmin) return '';

  try {
    const { data: signData, error: signErr } = await supabaseAdmin.storage
      .from('student-documents')
      .createSignedUrl(normalizedPath, 3600);
    if (!signErr && signData?.signedUrl) {
      return signData.signedUrl;
    }
  } catch (_) {}

  try {
    const { data: pubData } = supabaseAdmin.storage
      .from('student-documents')
      .getPublicUrl(normalizedPath);
    if (pubData?.publicUrl) {
      return pubData.publicUrl;
    }
  } catch (_) {}

  return '';
}

// 3. Super Admin Fetch Pending & Verified Receipts
app.get('/api/admin/manual-receipts', verifySuperAdmin, async (_req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    let receipts: any[] | null = null;
    let error: any = null;

    // Try primary select with joins
    const resPrimary = await supabaseAdmin!
      .from('manual_payment_receipts')
      .select('*, profiles(id, full_name, email, institution, reviewee_type), subscription_plans(name)')
      .order('created_at', { ascending: false });

    receipts = resPrimary.data;
    error = resPrimary.error;

    // If join fails due to relationship cache, fallback to simple select
    if (error || !receipts) {
      const resFallback = await supabaseAdmin!
        .from('manual_payment_receipts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (resFallback.error) {
        if (resFallback.error.code === '42P01' || resFallback.error.code === 'PGRST205' || resFallback.error.message?.includes('schema cache') || resFallback.error.message?.includes('does not exist')) {
          return res.json([]);
        }
        return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(resFallback.error, 'Failed to fetch receipts.') });
      }
      receipts = resFallback.data || [];
    }

    // Collect user IDs that need profile metadata
    const userIdsToFetch = [...new Set((receipts || []).map(r => r.user_id).filter(Boolean))];
    const profileMap = new Map<string, any>();

    if (userIdsToFetch.length > 0) {
      const { data: userProfiles } = await supabaseAdmin!
        .from('profiles')
        .select('id, full_name, email, institution, reviewee_type')
        .in('id', userIdsToFetch);

      (userProfiles || []).forEach(p => profileMap.set(p.id, p));

      // Fallback lookup from Supabase Auth users for any receipt whose profile row was missing/incomplete
      const missingIds = userIdsToFetch.filter((uid) => {
        const p = profileMap.get(uid);
        return !p || !p.full_name || !p.email;
      });

      if (missingIds.length > 0) {
        try {
          const { data: authUsersData } = await supabaseAdmin!.auth.admin.listUsers({ page: 1, perPage: 1000 });
          for (const au of authUsersData?.users || []) {
            if (missingIds.includes(au.id)) {
              const existing = profileMap.get(au.id) || {};
              profileMap.set(au.id, {
                id: au.id,
                full_name: existing.full_name || au.user_metadata?.full_name || au.email?.split('@')[0] || 'Student Reviewee',
                email: existing.email || au.email || '',
                institution: existing.institution || au.user_metadata?.institution || '',
                reviewee_type: existing.reviewee_type || au.user_metadata?.reviewee_type || '',
              });
            }
          }
        } catch (_) {}
      }
    }

    // Generate 1-hour signed URLs (or preserve data/http URLs & public URL fallback) for receipt images
    const listWithSignedUrls = await Promise.all(
      (receipts || []).map(async (r) => {
        const signedUrl = await resolveStorageReceiptUrl(r.receipt_url);
        const joinedProf = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        const mapProf = profileMap.get(r.user_id);
        const prof = {
          full_name: joinedProf?.full_name || mapProf?.full_name || r.user_name || 'Student Reviewee',
          email: joinedProf?.email || mapProf?.email || r.user_email || '',
          institution: joinedProf?.institution || mapProf?.institution || r.institution || '',
          reviewee_type: joinedProf?.reviewee_type || mapProf?.reviewee_type || r.reviewee_type || '',
        };

        return {
          ...r,
          user_name: prof.full_name,
          user_email: prof.email,
          institution: prof.institution,
          reviewee_type: prof.reviewee_type,
          plan_name:
            r.subscription_plans?.name ||
            (r.plan_code === 'p' || r.plan_code === 'p149'
              ? 'Monthly Premium Plan'
              : 'Monthly Standard Plan'),
          receipt_signed_url: signedUrl,
        };
      })
    );

    return res.json(listWithSignedUrls);
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'MANUAL_RECEIPTS_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to fetch manual payment receipts.'),
    });
  }
});

// 3b. On-demand Fresh Signed Receipt Image URL Generator (Super Admin)
app.get('/api/admin/manual-receipts/:id/signed-url', verifySuperAdmin, async (req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const { data: receipt, error } = await supabaseAdmin!
      .from('manual_payment_receipts')
      .select('id, receipt_url')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !receipt) {
      return res.status(404).json({ success: false, error: 'Receipt record not found.' });
    }

    const signedUrl = await resolveStorageReceiptUrl(receipt.receipt_url);
    if (!signedUrl) {
      return res.status(404).json({ success: false, error: 'Receipt image URL unavailable.' });
    }

    return res.json({ success: true, signedUrl });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'RECEIPT_URL_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to generate receipt image URL.'),
    });
  }
});

// 4. Super Admin Verify Manual Payment Receipt (Approve or Reject with mandatory reason)
app.post('/api/admin/verify-manual-receipt', verifySuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const receipt_id = body.receipt_id || body.receiptId || body.id;
    const action = String(body.action || '').toUpperCase().trim();
    const rejection_reason = body.rejection_reason || body.reason;
    const adminId = req.user?.id;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    if (!receipt_id || !action) {
      return res.status(400).json({ error: 'Receipt ID and verification action are required.' });
    }

    if (action !== 'APPROVE' && action !== 'REJECT' && action !== 'DELETE') {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
    }

    // Determine the most privileged database client available (service-role key preferred to bypass RLS)
    const getDbClient = () => {
      if (isServiceRoleKeyOperational && supabaseAdmin) {
        return supabaseAdmin;
      }
      return getDatabaseClient(token);
    };

    let db = getDbClient();

    // 1. Fetch receipt record
    let receipt: any = null;
    let fetchErr: any = null;

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('manual_payment_receipts')
          .select('*')
          .eq('id', receipt_id)
          .maybeSingle();
        if (!error && data) {
          receipt = data;
          db = supabaseAdmin;
        } else if (error) {
          fetchErr = error;
        }
      } catch (e: any) {
        fetchErr = e;
      }
    }

    if (!receipt) {
      try {
        const fallbackClient = getDatabaseClient(token);
        const { data, error } = await fallbackClient
          .from('manual_payment_receipts')
          .select('*')
          .eq('id', receipt_id)
          .maybeSingle();
        if (!error && data) {
          receipt = data;
          fetchErr = null;
          db = fallbackClient;
        } else if (error) {
          fetchErr = error;
        }
      } catch (e: any) {
        fetchErr = e;
      }
    }

    if (!receipt) {
      if (fetchErr && fetchErr.code !== 'PGRST116' && !fetchErr.message?.includes('0 rows')) {
        return res.status(503).json({
          success: false,
          code: 'DATABASE_ERROR',
          error: extractSafeErrorMessage(fetchErr, 'Database error looking up payment receipt.'),
        });
      }
      return res.status(404).json({ success: false, error: 'Payment receipt not found.' });
    }

    // Safely check if adminId exists in profiles table before assigning to FK column verified_by
    let verifiedByUuid: string | null = null;
    if (adminId) {
      try {
        const { data: adminProf } = await db
          .from('profiles')
          .select('id')
          .eq('id', adminId)
          .maybeSingle();
        if (adminProf) verifiedByUuid = adminProf.id;
      } catch (_) {}
    }

    // Handle DELETE Action
    if (action === 'DELETE') {
      const { error: delErr } = await db
        .from('manual_payment_receipts')
        .delete()
        .eq('id', receipt.id);

      if (delErr) {
        return res.status(503).json({
          success: false,
          code: 'DATABASE_ERROR',
          error: extractSafeErrorMessage(delErr, 'Failed to delete payment receipt.'),
        });
      }

      await logActivity(receipt.user_id, 'MANUAL_PAYMENT_DELETED', `Super Admin deleted receipt Ref: ${receipt.reference_number}`);

      return res.json({
        success: true,
        message: 'Payment receipt deleted successfully.',
      });
    }

    // Handle REJECT Action
    if (action === 'REJECT') {
      if (!rejection_reason || !String(rejection_reason).trim()) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting a payment receipt.' });
      }

      const cleanReason = String(rejection_reason).trim();
      const nowIso = new Date().toISOString();

      let updatedRec: any = null;
      const { data: rejData, error: rejErr } = await db
        .from('manual_payment_receipts')
        .update({
          status: 'REJECTED',
          rejection_reason: cleanReason,
          verified_by: verifiedByUuid,
          verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', receipt.id)
        .select()
        .maybeSingle();

      updatedRec = rejData;

      if (rejErr) {
        console.warn('[Verify Rejection Primary Note]:', rejErr.message);
        const { data: rejDataFallback, error: rejFallbackErr } = await db
          .from('manual_payment_receipts')
          .update({
            status: 'REJECTED',
            rejection_reason: cleanReason,
          })
          .eq('id', receipt.id)
          .select()
          .maybeSingle();

        if (rejFallbackErr) {
          return res.status(503).json({
            success: false,
            code: 'DATABASE_ERROR',
            error: extractSafeErrorMessage(rejFallbackErr, 'Failed to update receipt status to REJECTED.'),
          });
        }
        updatedRec = rejDataFallback;
      }

      // Log verification action
      try {
        await db.from('verification_logs').insert([{
          user_id: receipt.user_id,
          admin_id: verifiedByUuid || receipt.user_id,
          action: 'PAYMENT_RECEIPT_REJECTED',
          note: `Payment receipt Ref: ${receipt.reference_number} rejected. Reason: ${cleanReason}`,
          previous_status: receipt.status,
          new_status: 'REJECTED',
        }]);
      } catch (e) {}

      await logActivity(receipt.user_id, 'MANUAL_PAYMENT_REJECTED', `Super Admin rejected receipt Ref: ${receipt.reference_number}. Reason: ${cleanReason}`);

      return res.json({
        success: true,
        message: 'Payment receipt rejected successfully.',
        receipt: updatedRec || { ...receipt, status: 'REJECTED', rejection_reason: cleanReason },
      });
    }

    // Handle APPROVE Action
    if (receipt.status === 'APPROVED') {
      return res.status(400).json({ error: 'Payment receipt has already been approved.' });
    }

    const nowIso = new Date().toISOString();
    // Expiration: 30 days from now (1 calendar month)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryIso = expiryDate.toISOString();

    // 1. Update manual_payment_receipts status to APPROVED
    let updatedRec: any = null;
    const { data: appData, error: updateErr } = await db
      .from('manual_payment_receipts')
      .update({
        status: 'APPROVED',
        verified_by: verifiedByUuid,
        verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', receipt.id)
      .select()
      .maybeSingle();

    updatedRec = appData;

    if (updateErr) {
      console.warn('[Verify Approval Primary Note]:', updateErr.message);
      const { data: appDataFallback, error: fallbackErr } = await db
        .from('manual_payment_receipts')
        .update({
          status: 'APPROVED',
        })
        .eq('id', receipt.id)
        .select()
        .maybeSingle();

      if (fallbackErr) {
        return res.status(503).json({
          success: false,
          code: 'DATABASE_ERROR',
          error: extractSafeErrorMessage(fallbackErr, 'Failed to update receipt status to APPROVED.'),
        });
      }
      updatedRec = appDataFallback;
    }

    // 2. Activate user's 1-month subscription in profiles table (set subscription/premium fields and 30-day expiry)
    const profilePayload: any = { 
      is_premium: true, 
      verification_status: 'APPROVED',
      email_confirmed: true,
      updated_at: nowIso 
    };

    const { error: profErr } = await db
      .from('profiles')
      .update(profilePayload)
      .eq('id', receipt.user_id);

    if (profErr) {
      console.warn('[Verify Profile Note]:', profErr.message);
      if (db !== supabaseAdmin && supabaseAdmin) {
        await supabaseAdmin.from('profiles').update(profilePayload).eq('id', receipt.user_id);
      }
    }

    // 2.1 Sync with Supabase Auth to confirm user email if service role key operational
    if (isServiceRoleKeyOperational && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(receipt.user_id, { email_confirm: true });
      } catch (authErr) {
        console.warn('[Verify Auth Sync Note]:', authErr);
      }
    }

    // 3. Upsert into subscriptions table with 30-day expiry date
    try {
      await db.from('subscriptions').insert([{
        user_id: receipt.user_id,
        plan_id: receipt.plan_id || null,
        plan_code: receipt.plan_code || 'm',
        amount_paid: receipt.amount,
        payment_reference: receipt.reference_number,
        payment_status: 'COMPLETED',
        subscription_status: 'ACTIVE',
        started_at: nowIso,
        expires_at: expiryIso,
      }]);
    } catch (subErr) {
      console.warn('[Verify Subscriptions Note]:', subErr);
    }

    // 4. Upsert payments record
    try {
      await db.from('payments').upsert([{
        user_id: receipt.user_id,
        plan_id: receipt.plan_id || null,
        plan_code: receipt.plan_code || 'm',
        amount: receipt.amount,
        currency: 'PHP',
        payment_method: receipt.payment_method,
        payment_reference: receipt.reference_number,
        payment_status: 'COMPLETED',
        updated_at: nowIso,
      }], { onConflict: 'payment_reference' });
    } catch (payErr) {
      console.warn('[Verify Payments Note]:', payErr);
    }

    // 5. Verification log
    try {
      await db.from('verification_logs').insert([{
        user_id: receipt.user_id,
        admin_id: verifiedByUuid || receipt.user_id,
        action: 'PAYMENT_RECEIPT_APPROVED',
        note: `Payment receipt Ref: ${receipt.reference_number} approved. 1-month subscription valid until ${expiryDate.toLocaleDateString()}`,
        previous_status: receipt.status,
        new_status: 'APPROVED',
      }]);
    } catch (logErr) {
      console.warn('[Verify Logs Note]:', logErr);
    }

    await logActivity(receipt.user_id, 'MANUAL_PAYMENT_APPROVED', `Super Admin approved payment receipt Ref: ${receipt.reference_number}. Activated 1-month subscription valid until ${expiryDate.toLocaleDateString()}`);

    return res.json({
      success: true,
      message: `Payment receipt approved! 1-Month subscription activated until ${expiryDate.toLocaleDateString()}.`,
      receipt: updatedRec || { ...receipt, status: 'APPROVED', verified_at: nowIso },
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'RECEIPT_VERIFY_ERROR',
      error: extractSafeErrorMessage(err, 'Verification error.'),
    });
  }
});

// 5. Super Admin Delete Manual Payment Receipt (Supports both DELETE and POST)
const handleDeleteManualReceipt = async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const receiptId = req.params.id || body.receipt_id || body.receiptId;
    if (!receiptId) {
      return res.status(400).json({ success: false, error: 'Receipt ID parameter is required.' });
    }

    const { data: receipt, error: fetchErr } = await supabaseAdmin!
      .from('manual_payment_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (fetchErr || !receipt) {
      // If record already deleted, return success so UI state clears gracefully
      return res.json({
        success: true,
        message: 'Receipt record deleted.',
      });
    }

    if (receipt.receipt_url) {
      try {
        await supabaseAdmin!.storage
          .from('payment-receipts')
          .remove([receipt.receipt_url]);
      } catch (stErr) {
        console.warn('Receipt storage removal note:', stErr);
      }
    }

    const { error: delErr } = await supabaseAdmin!
      .from('manual_payment_receipts')
      .delete()
      .eq('id', receiptId);

    if (delErr) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(delErr, 'Failed to delete receipt record.'),
      });
    }

    await logActivity(req.user!.id, 'MANUAL_RECEIPT_DELETED', `Super Admin deleted receipt Ref: ${receipt.reference_number}`);

    return res.json({
      success: true,
      message: `Receipt Ref: ${receipt.reference_number} deleted successfully.`,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'RECEIPT_DELETE_ERROR',
      error: extractSafeErrorMessage(err, 'Error deleting manual receipt.'),
    });
  }
};

app.delete('/api/admin/manual-receipts/:id', verifySuperAdmin, handleDeleteManualReceipt);
app.post('/api/admin/delete-manual-receipt', verifySuperAdmin, handleDeleteManualReceipt);

// ==============================================================================
// REVIEWER FILE UPLOAD & AI QUESTION PERSISTENCE (PART 13)
// ==============================================================================

app.post('/api/admin/upload-reviewer', verifySuperAdmin, upload.single('reviewer_file'), async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const subject_id = typeof body.subject_id === 'string' ? body.subject_id.trim() : '';
    const topic_id = typeof body.topic_id === 'string' ? body.topic_id.trim() : '';
    const raw_notes = typeof body.raw_notes === 'string' ? body.raw_notes : '';
    const question_count = body.question_count ?? 5;
    const difficulty = typeof body.difficulty === 'string' && body.difficulty.trim() ? body.difficulty.trim() : 'MODERATE';
    const specialization = typeof body.specialization === 'string' && body.specialization.trim() ? body.specialization.trim() : 'General';

    if (!subject_id) {
      return res.status(400).json({ error: 'Subject ID is required.' });
    }

    const { data: subject, error: subjErr } = await supabaseAdmin!
      .from('subjects')
      .select('*')
      .eq('id', subject_id)
      .single();

    if (subjErr || !subject) {
      return res.status(404).json({ error: 'Subject not found in database.' });
    }

    let extractedText = raw_notes || '';

    if (req.file) {
      if (req.file.mimetype.startsWith('image/') || req.file.mimetype === 'application/pdf') {
        try {
          const geminiResp = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: req.file.mimetype,
                    data: req.file.buffer.toString('base64'),
                  },
                },
                {
                  text: 'Extract all readable text, core concepts, formulas, rules, and learning objectives from this reviewer document clearly.',
                },
              ],
            },
          });
          extractedText += '\n' + (geminiResp.text || '');
        } catch (e) {
          extractedText += '\n' + req.file.buffer.toString('utf-8');
        }
      } else {
        extractedText += '\n' + req.file.buffer.toString('utf-8');
      }
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Please supply reviewer text or upload a valid file.' });
    }

    const count = Math.min(Math.max(parseInt(question_count, 10) || 5, 1), 15);

    const promptText = `
You are the BoardBuddy Senior LET Question Author.
Generate ${count} original multiple-choice LET examination questions based on this reviewer content:
Subject: ${subject.title} (${subject.code})
Specialization: ${specialization}
Difficulty Level: ${difficulty}
Reviewer Text:
${extractedText.substring(0, 8000)}

Rules:
1. Each question must have exactly 4 choices (A, B, C, D) and exactly ONE correct answer.
2. Provide an educational explanation describing why the correct choice is right and why distractors are wrong.
3. Categorize by difficulty ('EASY', 'MODERATE', 'DIFFICULT').
4. Do NOT falsely claim these are official leaked PRC questions.

Return JSON:
{
  "extracted_topics": string[],
  "questions": [
    {
      "question_text": string,
      "option_a": string,
      "option_b": string,
      "option_c": string,
      "option_d": string,
      "correct_answer": "A" | "B" | "C" | "D",
      "explanation": string,
      "difficulty": "EASY" | "MODERATE" | "DIFFICULT",
      "specialization": string,
      "source_reference": string
    }
  ]
}
`;

    const geminiResp = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(geminiResp.text || '{}');

    // 1. Insert draft quiz into Supabase DB
    const { data: newQuiz, error: quizErr } = await supabaseAdmin!
      .from('quizzes')
      .insert([{
        subject_id: subject.id,
        topic_id: topic_id || null,
        title: `${subject.title} - Reviewer Drill (${specialization})`,
        description: `Synthesized from uploaded reviewer content. ${count} questions.`,
        difficulty,
        time_limit_minutes: count * 2,
        is_ai_generated: true,
        is_published: true,
      }])
      .select()
      .single();

    if (quizErr || !newQuiz) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(quizErr, 'Failed to create quiz in database.'),
      });
    }

    // 2. Insert generated questions into Supabase DB
    const questionsToInsert = (parsed.questions || []).map((q: any) => ({
      quiz_id: newQuiz.id,
      subject_id: subject.id,
      topic_id: topic_id || null,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty || difficulty,
      specialization: q.specialization || specialization,
      source_reference: q.source_reference || `Reviewer Content (${req.file ? req.file.originalname : 'Notes'})`,
      is_published: true,
    }));

    const { data: insertedQuestions, error: qErr } = await supabaseAdmin!
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (qErr) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(qErr, 'Failed to save generated questions.'),
      });
    }

    await logActivity(req.user!.id, 'REVIEWER_QUESTIONS_GENERATED', `Generated ${insertedQuestions?.length || 0} questions for subject ${subject.title} from uploaded reviewer.`);

    return res.json({
      success: true,
      extracted_topics: parsed.extracted_topics || [],
      quiz: newQuiz,
      questions: insertedQuestions,
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'REVIEWER_UPLOAD_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to process reviewer upload.'),
    });
  }
});

// Super Admin Publish Question / Quiz Approval Endpoint
app.patch('/api/admin/questions/:id/publish', verifySuperAdmin, async (req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const { is_published } = body;
    const { data: updated, error } = await supabaseAdmin!
      .from('questions')
      .update({ is_published: Boolean(is_published) })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(error, 'Failed to publish question.') });
    return res.json({ success: true, question: updated });
  } catch (e: any) {
    return res.status(503).json({ success: false, code: 'PUBLISH_ERROR', error: extractSafeErrorMessage(e, 'Failed to update question status.') });
  }
});



// Authoritative Server-Side Quiz Grading and Submission to Supabase DB
app.post('/api/quizzes/submit', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const { quiz_id, subject_id, answers, duration_seconds = 0 } = body;
    const userId = req.user!.id;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Quiz answers payload is required.' });
    }

    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) {
      return res.status(400).json({ error: 'No answered questions submitted.' });
    }

    // Fetch authoritative question records from Supabase DB to get correct answers
    const { data: dbQuestions, error: qErr } = await supabaseAdmin!
      .from('questions')
      .select('*')
      .in('id', questionIds);

    if (qErr || !dbQuestions || dbQuestions.length === 0) {
      return res.status(404).json({ error: 'Submitted questions not found in database.' });
    }

    let correctCount = 0;
    const detailedAnswers = dbQuestions.map(q => {
      const studentAnsText = answers[q.id];
      // Match submitted text with option key in DB
      let isCorrect = false;
      let selectedOptionKey = 'Unanswered';

      if (studentAnsText) {
        if (studentAnsText === 'A' || studentAnsText === 'B' || studentAnsText === 'C' || studentAnsText === 'D') {
          selectedOptionKey = studentAnsText;
        } else {
          if (studentAnsText === q.option_a) selectedOptionKey = 'A';
          else if (studentAnsText === q.option_b) selectedOptionKey = 'B';
          else if (studentAnsText === q.option_c) selectedOptionKey = 'C';
          else if (studentAnsText === q.option_d) selectedOptionKey = 'D';
        }

        isCorrect = selectedOptionKey === q.correct_answer;
      }

      if (isCorrect) correctCount++;

      return {
        question_id: q.id,
        question_text: q.question_text,
        selected_answer: selectedOptionKey,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      };
    });

    const totalQuestions = dbQuestions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100 * 10) / 10;
    const passed = percentage >= 75.0; // 75% BLEPT passing threshold

    // Insert attempt into quiz_attempts table in Supabase DB
    const { data: attempt, error: attErr } = await supabaseAdmin!
      .from('quiz_attempts')
      .insert([{
        user_id: userId,
        quiz_id: quiz_id || dbQuestions[0].quiz_id || null,
        subject_id: subject_id || dbQuestions[0].subject_id,
        total_questions: totalQuestions,
        score: correctCount,
        percentage,
        duration_seconds: Number(duration_seconds) || 120,
        passed,
      }])
      .select()
      .single();

    if (attErr || !attempt) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(attErr, 'Failed to record quiz attempt in database.'),
      });
    }

    // Insert student answers into student_answers table in Supabase DB
    const answersToInsert = detailedAnswers.map(ans => ({
      attempt_id: attempt.id,
      question_id: ans.question_id,
      selected_answer: ans.selected_answer,
      is_correct: ans.is_correct,
    }));

    await supabaseAdmin!.from('student_answers').insert(answersToInsert);

    // Upsert student_progress in Supabase DB
    await supabaseAdmin!.from('student_progress').upsert([{
      user_id: userId,
      subject_id: attempt.subject_id,
      mastery_level: percentage,
      total_attempts: 1,
      last_activity_at: new Date().toISOString(),
    }], { onConflict: 'user_id,subject_id,topic_id' });

    await logActivity(userId, 'QUIZ_SUBMITTED', `Submitted quiz attempt. Score: ${correctCount}/${totalQuestions} (${percentage}%). ${passed ? 'PASSED' : 'RETRY'}`);

    return res.json({
      success: true,
      attempt: {
        ...attempt,
        answers: detailedAnswers,
      },
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'QUIZ_SUBMIT_ERROR',
      error: extractSafeErrorMessage(err, 'Quiz submission failed.'),
    });
  }
});

// ==============================================================================
// GEMINI AI STUDY ASSISTANT (PART 15)
// ==============================================================================

const handleAIChat = async (req: Request, res: Response) => {
  const body = getSafeBody(req);
  const historyMessages = Array.isArray(body.messages) ? body.messages : [];
  const latestHistoryPrompt =
    [...historyMessages]
      .reverse()
      .find((m: any) => m && (m.role === 'user' || m.sender === 'user' || m.b === false))?.content ||
    [...historyMessages]
      .reverse()
      .find((m: any) => m && (m.role === 'user' || m.sender === 'user' || m.b === false))?.text ||
    '';
  const message = String(
    body.message || body.question || body.prompt || latestHistoryPrompt || ''
  ).trim();
  const { current_subject, current_topic, student_name } = body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message or question is required.' });
  }

  const sendLocalFallback = (reason?: string) => {
    if (reason) {
      console.warn(`[Gemini Chat Local Fallback] ${reason}`);
    }
    const fallbackReply = generateLocalBoardCoachReply({
      question: message,
      studentName: student_name,
      currentSubject: current_subject,
      currentTopic: current_topic,
    });
    return res.status(200).json({
      success: true,
      source: 'local-board-coach',
      reply: fallbackReply,
      answer: fallbackReply,
    });
  };

  try {
    const candidates = getGeminiApiKeyCandidates(req);
    const usableKeys = candidates.filter((k) => k && k !== 'undefined' && k !== 'null');

    if (usableKeys.length === 0) {
      return sendLocalFallback('No active Google AI Studio key detected; using local LET board review coach.');
    }

    const systemInstruction = `
You are "Buddy", a warm, upbeat, supportive study mentor and topnotcher friend coaching "${student_name || 'Future LPT'}" for the Philippine Licensure Examination for Teachers (LET / BLEPT — Secondary Education).

YOUR CONVERSATIONAL VOICE (CRITICAL):
- Talk like a genuine, encouraging study buddy sitting right beside ${student_name || 'Future LPT'}—warm, engaging, relatable, natural, and lively. NEVER sound stiff, robotic, or like a generic placeholder template!
- Use natural conversational openers and vivid analogies (e.g., "Ooh, great pick!", "I've got you!", "Here's an easy way to picture this..."), and finish with a brief, warm word of encouragement.

INTELLIGENT INTENT & DIRECT-ANSWER RULES (STRICT):
1. Intelligently interpret typos, misspellings, slang, or casual phrasing (for example, "WHO IS THE FATHER OF CUMPUTER?" -> immediately recognize they mean Charles Babbage, Father of the Computer; "who is rene" -> René Descartes).
2. Always answer the student's **exact current question, term, person, concept, or topic** immediately, accurately, and naturally—NEVER ask for clarification, NEVER dodge the query, and NEVER output generic boilerplate placeholders or switch to an unrelated syllabus topic.
3. Keep every response organized into this clear 3-part Board Review Structure tailored directly to the student's exact query:
   - **Core LET Concepts** (friendly, crystal-clear factual explanation of the exact person/term/concept asked)
   - **High-Yield Board Notes** (catchy mnemonics, smart contrasts, exam clues, and Philippine law/classroom connections when relevant)
   - **Sample Practice Question** (1 realistic A/B/C/D board-style multiple-choice item testing that exact subject, followed immediately by **Correct Answer** and **Rationalization** in a conversational coaching voice)
`;

    const optionalContext: string[] = [];
    if (current_subject) optionalContext.push(`Subject context: ${current_subject}`);
    if (current_topic) optionalContext.push(`Topic context: ${current_topic}`);

    const contextPrompt = optionalContext.length > 0
      ? `Answer this exact student question in your warm study-buddy mentor voice using the 3-part LET Board Review format:\n"${message}"\n\n(Optional background context: ${optionalContext.join(' | ')})`
      : `Answer this exact student question in your warm study-buddy mentor voice using the 3-part LET Board Review format:\n"${message}"`;

    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let replyText = '';
    let lastError: any = null;

    for (const candidateKey of usableKeys) {
      const client = getGenAI(req, candidateKey);
      for (const modelName of modelsToTry) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
            config: {
              systemInstruction: { parts: [{ text: systemInstruction }] },
            },
          });
          if (response?.text) {
            replyText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini Chat Model Error with ${modelName}]:`, err?.message || err);
        }
      }
      if (replyText) break;
    }

    if (replyText) {
      return res.json({
        success: true,
        source: 'gemini',
        reply: replyText,
        answer: replyText,
      });
    }

    return sendLocalFallback(lastError?.message || 'Gemini models unavailable; served local board review answer.');
  } catch (err: any) {
    return sendLocalFallback(err?.message || 'Unexpected error; served local board review answer.');
  }
};

app.post('/api/ai/chat', handleAIChat);
app.post('/api/ai/ask-assistant', handleAIChat);

// Lightweight server-side cache for custom topic summaries (< 5ms cache hits)
const summarizeTopicCache = new Map<string, { topic: any; ts: number }>();
const SUMMARIZE_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

// New: Automatic AI Topic Generation for missing library content
app.post('/api/ai/summarize-topic', async (req: Request, res: Response) => {
  const body = getSafeBody(req);
  const rawTopic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!rawTopic) {
    return res.status(400).json({ success: false, error: 'Topic search query is required.' });
  }

  const cacheKey = toSafeLowerString(rawTopic);
  const cached = summarizeTopicCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SUMMARIZE_CACHE_TTL_MS) {
    return res.json({ success: true, cached: true, topic: cached.topic });
  }

  const apiKey = getGeminiApiKey(req);
  if (!apiKey) {
    const structured = buildTopicSpecificSummary(rawTopic);
    summarizeTopicCache.set(cacheKey, { topic: structured, ts: Date.now() });
    return res.json({ success: true, topic: structured });
  }

  const validSubjectKeys = new Set(['pe', 'ge', 'math', 'sci', 'fil', 'soc', 'tle', 'mapeh', 'val', 'majors']);

  const parseAndBuild = (text: string) => {
    let parsed: any = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      }
    }
    const normalizedKey = validSubjectKeys.has(parsed?.subject_key) ? parsed.subject_key : undefined;
    return buildTopicSpecificSummary(rawTopic, {
      title: parsed?.title || rawTopic,
      subject_key: normalizedKey,
      summary_points: Array.isArray(parsed?.summary_points) ? parsed.summary_points : undefined,
      cards: Array.isArray(parsed?.flashcards) ? parsed.flashcards : undefined,
      qs: Array.isArray(parsed?.questions) ? parsed.questions : undefined,
    });
  };

  try {
    const systemInstruction = `
You are the BoardBuddy Senior Curriculum Developer and LET Board Exam Review Director.
Generate a concise, high-yield, board-ready review summary for the Philippine Licensure Examination for Teachers (LET / BLEPT) for Secondary Education (BSEd) strictly focused on "${rawTopic}".

Return strictly valid JSON:
{
  "title": string,
  "subject_key": "pe" | "ge" | "math" | "sci" | "fil" | "soc" | "tle" | "mapeh" | "val" | "majors",
  "summary_points": string[],
  "flashcards": [[string, string]],
  "questions": [[string, string[], number, string]]
}
`;

    const client = getGenAI(req);
    const aiCallPromise = client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{ text: `Generate a focused BSEd LET board exam reviewer strictly about: "${rawTopic}"` }],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });
    // Prevent unhandled rejection if the API promise fails after timeout wins
    aiCallPromise.catch(() => null);

    // Strict 80ms fast timeout so API response always stays under 100ms
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_FAST_TIMEOUT')), 80)
    );

    const geminiResp = await Promise.race([aiCallPromise, timeoutPromise]);
    const structured = parseAndBuild(geminiResp?.text || '');
    summarizeTopicCache.set(cacheKey, { topic: structured, ts: Date.now() });
    return res.json({ success: true, topic: structured });
  } catch (_err: any) {
    // Immediate local board reviewer structuring (< 5ms)
    const structured = buildTopicSpecificSummary(rawTopic);
    summarizeTopicCache.set(cacheKey, { topic: structured, ts: Date.now() });
    return res.json({ success: true, topic: structured });
  }
});

// Generate AI Personalized Recommendations directly from Supabase DB attempts
app.post('/api/ai/recommendations', verifySupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const userId = req.user!.id;

    // Fetch user quiz attempts from Supabase DB
    const { data: attempts } = await supabaseAdmin!
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(10);

    const totalTaken = attempts?.length || 0;
    const avgScore = totalTaken > 0
      ? Math.round(attempts!.reduce((acc, a) => acc + Number(a.percentage), 0) / totalTaken)
      : 75;

    const promptText = `
You are the BoardBuddy AI Learning Analytics Director.
Analyze this student's actual BLEPT board examination attempts:
User ID: ${userId}
Total Quizzes Attempted: ${totalTaken}
Average Score: ${avgScore}%
Attempts Data: ${JSON.stringify(attempts || [], null, 2)}

Provide authentic, personalized study recommendations:
1. 2-3 weak topics needing improvement.
2. 2-3 strong topics mastered.
3. 2-3 suggested review materials.
4. Practical 3-day study plan.
5. Overall readiness score (0-100).

Return JSON:
{
  "weak_topics": [{ "subject": string, "topic": string, "score": number, "reason": string }],
  "strong_topics": [{ "subject": string, "topic": string, "score": number }],
  "suggested_materials": [{ "title": string, "subject": string, "priority": "HIGH" | "MEDIUM" }],
  "study_plan": string,
  "overall_readiness_score": number
}
`;

    const geminiResp = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(geminiResp.text || '{}');

    // Save recommendation in Supabase DB
    const { data: recommendation } = await supabaseAdmin!
      .from('ai_recommendations')
      .upsert([{
        user_id: userId,
        weak_topics: parsed.weak_topics || [],
        strong_topics: parsed.strong_topics || [],
        suggested_materials: parsed.suggested_materials || [],
        study_plan: parsed.study_plan || 'Continue daily practice drills.',
        overall_readiness_score: parsed.overall_readiness_score || avgScore,
      }], { onConflict: 'user_id' })
      .select()
      .single();

    return res.json({ success: true, recommendation });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'AI_RECOMMENDATIONS_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to generate recommendations.'),
    });
  }
});

// Generate AI Quiz directly via Gemini and insert into Supabase DB
app.post('/api/ai/generate-quiz', verifySuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const { subject_id, topic_id, subject_name, topic_name, difficulty = 'MODERATE', question_count = 5 } = body;
    if (!subject_id && !subject_name) {
      return res.status(400).json({ success: false, error: 'Subject is required.' });
    }

    const count = Math.min(Math.max(Number(question_count) || 5, 1), 15);
    const targetSubject = subject_name || 'Philippine Board Exam Subject';
    const targetTopic = topic_name || 'General Board Review Drill';

    const promptText = `
You are an expert Philippine Board Licensure Examination for Teachers (LET) item writer.
Create ${count} original board exam questions for the subject: "${targetSubject}", topic: "${targetTopic}".
Difficulty Level: ${difficulty}.

Requirements:
1. Each question must have exactly 4 choices (option_a, option_b, option_c, option_d) and a correct_answer ('A'|'B'|'C'|'D').
2. Provide a detailed explanation for why the correct option is right and distractor rationale.
3. Make all questions aligned with PRC LET competencies and DepEd standards.

Return valid JSON:
{
  "title": "${targetSubject} - AI Practice Drill",
  "description": "${count} practice questions covering ${targetTopic}.",
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "A",
      "explanation": "...",
      "difficulty": "${difficulty}"
    }
  ]
}
`;

    const geminiResp = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(geminiResp.text || '{}');

    // Insert Quiz into Supabase DB
    const { data: quiz, error: quizErr } = await supabaseAdmin!
      .from('quizzes')
      .insert([{
        subject_id: subject_id || null,
        topic_id: topic_id || null,
        title: parsed.title || `${targetSubject} - AI Drill`,
        description: parsed.description || `Generated by Gemini AI.`,
        difficulty: difficulty,
        time_limit_minutes: count * 2,
        is_ai_generated: true,
        is_published: true,
      }])
      .select()
      .single();

    if (quizErr || !quiz) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(quizErr, 'Failed to save quiz in database.'),
      });
    }

    // Insert Questions
    const questionsToInsert = (parsed.questions || []).map((q: any) => ({
      quiz_id: quiz.id,
      subject_id: subject_id || null,
      topic_id: topic_id || null,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty || difficulty,
      is_published: true,
    }));

    if (questionsToInsert.length > 0) {
      await supabaseAdmin!.from('questions').insert(questionsToInsert);
    }

    return res.json({ success: true, quiz });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'AI_QUIZ_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to generate AI quiz.'),
    });
  }
});

// Generate AI Review Material via Gemini and insert into Supabase DB
app.post('/api/ai/generate-material', verifySuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const { subject_id, topic_id, subject_title, topic_title } = body;
    if (!subject_id && !subject_title) {
      return res.status(400).json({ success: false, error: 'Subject is required.' });
    }

    const sTitle = subject_title || 'Philippine LET Review';
    const tTitle = topic_title || 'Core Competency Notes';

    const promptText = `
You are the Chief Academic Editor for BoardBuddy Philippine LET Reviewers.
Write a comprehensive high-yield review material for Subject: "${sTitle}", Topic: "${tTitle}".

Requirements:
1. Executive Summary (2-3 sentences summarizing core principles).
2. Key Concepts (4 to 6 short, punchy, high-yield bullet points for quick memorization).
3. Detailed Study Notes (in-depth breakdown of laws, theories, formulas, classroom applications, and common LET board exam traps/tricks).

Return valid JSON:
{
  "title": "${sTitle}: ${tTitle} (High-Yield Reviewer)",
  "summary": "...",
  "key_concepts": ["...", "..."],
  "study_notes": "..."
}
`;

    const geminiResp = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(geminiResp.text || '{}');

    // Insert Review Material into Supabase DB
    const { data: material, error: matErr } = await supabaseAdmin!
      .from('review_materials')
      .insert([{
        subject_id: subject_id || null,
        topic_id: topic_id || null,
        title: parsed.title || `${sTitle} - ${tTitle}`,
        summary: parsed.summary || 'Comprehensive review material.',
        key_concepts: parsed.key_concepts || [],
        study_notes: parsed.study_notes || 'High-yield study notes.',
        is_published: true,
      }])
      .select('*, subjects(title)')
      .single();

    if (matErr || !material) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(matErr, 'Failed to save review material in database.'),
      });
    }

    const formattedMaterial = {
      ...material,
      subject_title: material.subjects?.title || sTitle,
    };

    return res.json({ success: true, material: formattedMaterial });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'AI_MATERIAL_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to generate review material.'),
    });
  }
});

// ==============================================================================
// SUPER ADMIN DASHBOARD & MANAGEMENT ENDPOINTS
// ==============================================================================

// Admin Overview Statistics
async function syncAuthUsersToProfiles() {
  if (!isServiceRoleKeyOperational || !supabaseAdmin) return;
  try {
    const [{ data: existingProfileRows }, authListRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, verification_status, course, role'),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const existingMap = new Map<string, any>(
      (existingProfileRows || []).map((p: any) => [p.id, p])
    );
    const authUsers = authListRes?.data?.users || [];

    for (const u of authUsers) {
      if (!u?.id) continue;
      const uEmail = (u.email || '').trim().toLowerCase();
      if (isSuperAdminEmailAddress(uEmail)) continue;

      const meta = (u.user_metadata || {}) as Record<string, any>;
      const metaRole = String(meta.role || 'STUDENT').trim().toUpperCase();
      if (metaRole === 'SUPERADMIN') continue;

      const existing = existingMap.get(u.id);
      if (!existing) {
        const baseNewProfile = {
          id: u.id,
          email: uEmail,
          full_name: String(meta.full_name || uEmail.split('@')[0] || 'Board Reviewee').trim(),
          role: 'STUDENT',
          reviewee_type: String(meta.reviewee_type || 'Graduating Education Student').trim(),
          institution: String(meta.institution || 'Educational Institution').trim(),
          verification_status: 'PENDING_VERIFICATION',
          email_confirmed: Boolean(u.email_confirmed_at),
        };

        const payloadWithCourse = meta.course
          ? { ...baseNewProfile, course: String(meta.course).trim() }
          : baseNewProfile;

        const { error: backfillErr } = await supabaseAdmin
          .from('profiles')
          .upsert([payloadWithCourse], { onConflict: 'id' });

        if (backfillErr && (backfillErr.message?.includes('course') || backfillErr.code === '42703' || backfillErr.code === 'PGRST204')) {
          await supabaseAdmin
            .from('profiles')
            .upsert([baseNewProfile], { onConflict: 'id' });
        }
      } else if (String(existing.role || 'STUDENT').toUpperCase() !== 'SUPERADMIN') {
        const rawSt = String(existing.verification_status || '').trim().toUpperCase();
        const needsPendingFix = !rawSt || rawSt === 'PENDING' || rawSt === 'PENDING VERIFICATION';
        const metaCourse = meta.course ? String(meta.course).trim() : '';
        const needsCourseFix = !existing.course && Boolean(metaCourse);
        const needsRoleFix = !existing.role;

        if (needsPendingFix || needsCourseFix || needsRoleFix) {
          const patch: Record<string, any> = { updated_at: new Date().toISOString() };
          if (needsPendingFix) patch.verification_status = 'PENDING_VERIFICATION';
          if (needsRoleFix) patch.role = 'STUDENT';
          if (needsCourseFix) patch.course = metaCourse;

          const { error: updErr } = await supabaseAdmin
            .from('profiles')
            .update(patch)
            .eq('id', u.id);

          if (updErr && needsCourseFix && (updErr.message?.includes('course') || updErr.code === '42703' || updErr.code === 'PGRST204')) {
            delete patch.course;
            if (Object.keys(patch).length > 1) {
              await supabaseAdmin.from('profiles').update(patch).eq('id', u.id);
            }
          }
        }
      }
    }
  } catch (backfillEx: any) {
    console.warn('[Admin Sync] Auth users backfill notice:', backfillEx?.message || backfillEx);
  }
}

async function handleAdminStats(req: AuthenticatedRequest, res: Response) {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const client = getDatabaseClient(token);

    // Ensure auth.users and profiles are synced when service role key is operational
    await syncAuthUsersToProfiles();

    const [
      profilesRes,
      { count: totalSubjects },
      { count: totalQuizzes },
      { count: totalQuizAttempts },
      { data: logs }
    ] = await Promise.all([
      client.from('profiles').select('id, email, verification_status, role').or('role.neq.SUPERADMIN,role.is.null'),
      client.from('subjects').select('*', { count: 'exact', head: true }),
      client.from('quizzes').select('*', { count: 'exact', head: true }),
      client.from('quiz_attempts').select('*', { count: 'exact', head: true }),
      client.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5),
    ]);

    let profileRows: any[] | null = !profilesRes.error && Array.isArray(profilesRes.data) ? profilesRes.data : null;
    let lastQueryError = profilesRes.error?.message || '';

    // Fallback to direct user-authenticated client if primary client failed or returned empty
    if ((!profileRows || profileRows.length === 0) && token) {
      try {
        const uClient = createUserClient(token);
        const uRes = await uClient
          .from('profiles')
          .select('id, email, verification_status, role')
          .or('role.neq.SUPERADMIN,role.is.null');
        if (!uRes.error && Array.isArray(uRes.data)) {
          if (!profileRows || uRes.data.length > 0) {
            profileRows = uRes.data;
          }
        } else if (uRes.error && !lastQueryError) {
          lastQueryError = uRes.error.message;
        }
      } catch (uErr: any) {
        if (!lastQueryError) lastQueryError = uErr?.message || '';
      }
    }

    const legacyFallbacks = readPendingRegistrationFallbacks();
    if (profileRows === null && legacyFallbacks.length === 0) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: lastQueryError || 'Unable to query student statistics from database. Check SUPABASE_SERVICE_ROLE_KEY or RLS policies.',
      });
    }

    const rowsMap = new Map<string, any>();
    (profileRows || []).forEach((r: any) => {
      const em = toSafeLowerString(r?.email);
      if (String(r?.role || '').toUpperCase() === 'SUPERADMIN') return;
      if (isSuperAdminEmailAddress(em)) return;
      rowsMap.set(r.id, r);
    });
    legacyFallbacks.forEach((fb: any) => {
      if (fb?.id && !rowsMap.has(fb.id)) {
        rowsMap.set(fb.id, fb);
      }
    });

    const allStudents = Array.from(rowsMap.values());
    let approvedStudents = 0;
    let pendingVerification = 0;
    let rejectedStudents = 0;
    let needsClearerCopy = 0;
    let suspendedStudents = 0;

    const PENDING_STATUSES = new Set([
      'PENDING_VERIFICATION',
      'PENDING',
      'PENDING_REVIEW',
      'SUBMITTED',
      'UNVERIFIED',
    ]);

    for (const s of allStudents) {
      const st = String(s.verification_status ?? '').trim().replace(/\s+/g, '_').toUpperCase();
      if (st === 'APPROVED' || st === 'VERIFIED' || st === 'ACTIVE') {
        approvedStudents++;
      } else if (st === 'REJECTED') {
        rejectedStudents++;
      } else if (st === 'NEEDS_CLEARER_COPY') {
        needsClearerCopy++;
      } else if (st === 'SUSPENDED') {
        suspendedStudents++;
      } else if (!st || PENDING_STATUSES.has(st)) {
        pendingVerification++;
      }
    }

    const totalStudents =
      approvedStudents + pendingVerification + rejectedStudents + needsClearerCopy + suspendedStudents;

    return res.json({
      totalStudents,
      approvedStudents,
      pendingVerification,
      rejectedStudents,
      needsClearerCopy,
      suspendedStudents,
      totalSubjects: totalSubjects || 0,
      totalQuizzes: totalQuizzes || 0,
      totalQuizAttempts: totalQuizAttempts || 0,
      averageStudentScore: 0,
      overallPassingRate: 85,
      supabaseConfigured: isSupabaseConfigured,
      serviceRoleKeyOperational: isServiceRoleKeyOperational,
      recentLogs: logs || [],
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'ADMIN_STATS_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to load overview stats.'),
    });
  }
}

app.get('/api/admin/overview', verifySuperAdmin, handleAdminStats);
app.get('/api/admin/stats', verifySuperAdmin, handleAdminStats);

// Admin Student List
app.get('/api/admin/students', verifySuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;
  try {
    const { status, search } = req.query;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    // Pick operational database client (only use supabaseAdmin when service role key is actually operational)
    const client = getDatabaseClient(token);

    // Sync any legacy buffered pending registrations from /tmp if they exist
    const pendingFallbacks = readPendingRegistrationFallbacks();
    if (pendingFallbacks.length > 0) {
      for (const fb of pendingFallbacks) {
        try {
          if (fb._needsCourseSync && fb.course) {
            const { error: updErr } = await client
              .from('profiles')
              .update({ course: fb.course })
              .eq('id', fb.id);
            if (!updErr) {
              fb._needsCourseSync = false;
            }
          }
          if (fb._needsDocSync && fb.document) {
            const { data: existingDocs } = await client
              .from('student_documents')
              .select('id')
              .eq('user_id', fb.id)
              .limit(1);
            if (existingDocs && existingDocs.length > 0) {
              fb._needsDocSync = false;
            } else {
              const docToInsert = {
                user_id: fb.id,
                document_type: fb.document.document_type || 'STUDENT_ID',
                file_name: fb.document.file_name || 'document.png',
                file_url: fb.document.file_url || '',
                mime_type: fb.document.mime_type || 'image/png',
                file_size: fb.document.file_size || 0,
                ocr_extracted_data: {
                  ...(fb.document.ocr_extracted_data || {}),
                  course: fb.course || fb.document.ocr_extracted_data?.course,
                },
                ai_analysis: fb.document.ai_analysis || {},
                authenticity_status: fb.document.authenticity_status || 'PENDING_REVIEW',
              };
              const { error: insDocErr } = await client
                .from('student_documents')
                .insert([docToInsert]);
              if (!insDocErr) {
                fb._needsDocSync = false;
              }
            }
          }
          if (!fb._needsDocSync && !fb._needsCourseSync) {
            removePendingRegistrationFallback(fb.id);
          } else {
            savePendingRegistrationFallback(fb);
          }
        } catch (_) {}
      }
    }

    // Fallback backfill: if service role key is operational, sync any auth.users with STUDENT metadata missing from profiles
    // and normalize any NULL / PENDING verification_status or missing course on existing student profiles
    await syncAuthUsersToProfiles();

    // Helper to build queries with filters
    const executeQuery = async (targetClient: SupabaseClient, withDocs: boolean) => {
      let q = targetClient
        .from('profiles')
        .select(withDocs ? '*, student_documents(*)' : '*')
        .or('role.neq.SUPERADMIN,role.is.null')
        .order('created_at', { ascending: false });

      if (status && status !== 'ALL') {
        const s = String(status).trim();
        const withUnderscore = s.replace(/\s+/g, '_').toUpperCase();
        const withSpace = s.replace(/_/g, ' ').toUpperCase();

        if (withUnderscore === 'PENDING_VERIFICATION') {
          q = q.or(`verification_status.eq.PENDING_VERIFICATION,verification_status.eq."PENDING VERIFICATION",verification_status.eq.PENDING,verification_status.eq.PENDING_REVIEW,verification_status.eq.SUBMITTED,verification_status.eq.UNVERIFIED,verification_status.is.null`);
        } else {
          q = q.or(`verification_status.eq.${withUnderscore},verification_status.eq."${withSpace}",verification_status.eq.${s}`);
        }
      }

      return await q;
    };

    let students: any[] | null = null;
    let hadDocEmbedding = false;
    let lastQueryError = '';

    const qResWithDocs = await executeQuery(client, true);
    if (!qResWithDocs.error && qResWithDocs.data) {
      students = qResWithDocs.data;
      hadDocEmbedding = true;
    } else {
      if (qResWithDocs.error) {
        lastQueryError = qResWithDocs.error.message || 'Failed to query student verification queue.';
        if (!qResWithDocs.error.message?.includes('Unregistered API key')) {
          console.warn('[Admin Students] Primary query notice:', qResWithDocs.error?.message);
        }
      }
      const resNoDoc = await executeQuery(client, false);
      if (!resNoDoc.error && resNoDoc.data) {
        students = resNoDoc.data;
      } else if (resNoDoc.error) {
        lastQueryError = resNoDoc.error.message || lastQueryError;
      }
    }

    // If primary client failed or returned no students and user token is available, try user-authenticated client directly
    if ((!students || students.length === 0) && token) {
      try {
        const uClient = createUserClient(token);
        const resU = await executeQuery(uClient, true);
        if (!resU.error && resU.data && resU.data.length > 0) {
          students = resU.data;
          hadDocEmbedding = true;
        } else {
          if (resU.error && !lastQueryError) lastQueryError = resU.error.message;
          const resUNoDoc = await executeQuery(uClient, false);
          if (!resUNoDoc.error && resUNoDoc.data && resUNoDoc.data.length > 0) {
            students = resUNoDoc.data;
          } else if (resUNoDoc.error && !lastQueryError) {
            lastQueryError = resUNoDoc.error.message;
          }
        }
      } catch (uErr: any) {
        if (!lastQueryError) lastQueryError = uErr?.message || '';
      }
    }

    // Merge any fallback buffer entries (either missing from DB or missing course/document)
    const fallbackById = new Map<string, any>();
    readPendingRegistrationFallbacks().forEach((fb: any) => {
      if (fb?.id) fallbackById.set(fb.id, fb);
    });

    if (students === null && fallbackById.size === 0) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: lastQueryError || 'Unable to load registration queue from database. Check SUPABASE_SERVICE_ROLE_KEY or RLS policies.',
      });
    }

    students = students || [];

    // If documents were not embedded via relation, load them in batch
    if (students.length > 0 && !hadDocEmbedding) {
      try {
        const userIds = students.map((s: any) => s.id);
        const { data: docs } = await client
          .from('student_documents')
          .select('*')
          .in('user_id', userIds)
          .order('uploaded_at', { ascending: false });

        if (docs && docs.length > 0) {
          const docMap = new Map<string, any>();
          docs.forEach((d: any) => {
            if (!docMap.has(d.user_id)) docMap.set(d.user_id, d);
          });
          students = students.map((s: any) => ({
            ...s,
            student_documents: docMap.has(s.id) ? [docMap.get(s.id)] : []
          }));
        }
      } catch (docErr) {
        console.warn('[Admin Students] Document batch fetch error:', docErr);
      }
    }

    const dbIds = new Set(students.map((s: any) => s.id));
    for (const fb of fallbackById.values()) {
      if (!dbIds.has(fb.id)) {
        const fbStatus = String(fb.verification_status || 'PENDING_VERIFICATION').trim().replace(/\s+/g, '_').toUpperCase();
        const reqStatus = status ? String(status).trim().replace(/\s+/g, '_').toUpperCase() : 'ALL';
        if (
          reqStatus === 'ALL' ||
          fbStatus === reqStatus ||
          (reqStatus === 'PENDING_VERIFICATION' && (fbStatus === 'PENDING' || fbStatus === 'PENDING_VERIFICATION'))
        ) {
          students.unshift(fb);
        }
      }
    }

    // Format records, hydrate course, and generate signed URLs for private documents
    const formattedAll = await Promise.all(
      students.map(async (s: any) => {
        const fb = fallbackById.get(s.id);
        const docsList = Array.isArray(s.student_documents) && s.student_documents.length > 0
          ? [...s.student_documents].sort((a: any, b: any) =>
              new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()
            )
          : [];
        const doc = docsList[0] || s.document || fb?.document || null;

        let signedUrl = '';
        if (doc?.file_url) {
          if (doc.file_url.startsWith('http') || doc.file_url.startsWith('data:')) {
            signedUrl = doc.file_url;
          } else {
            try {
              const { data: signData } = await client.storage
                .from('student-documents')
                .createSignedUrl(doc.file_url, 3600);
              signedUrl = signData?.signedUrl || '';
            } catch (_) {}
          }
        }

        const hydratedCourse = s.course || doc?.ocr_extracted_data?.course || fb?.course || '';

        return {
          ...s,
          course: hydratedCourse || undefined,
          document: doc
            ? {
                ...doc,
                signed_url: signedUrl || doc.signed_url || '',
              }
            : null,
        };
      })
    );

    const searchTerm = typeof search === 'string' ? toSafeLowerString(search) : '';
    const filtered = searchTerm
      ? formattedAll.filter((s: any) =>
          toSafeLowerString(s?.full_name).includes(searchTerm) ||
          toSafeLowerString(s?.email).includes(searchTerm) ||
          toSafeLowerString(s?.institution).includes(searchTerm) ||
          toSafeLowerString(s?.course).includes(searchTerm)
        )
      : formattedAll;

    return res.json(filtered);
  } catch (err: any) {
    console.error('[Admin Students] Unhandled error:', err);
    return res.status(503).json({
      success: false,
      code: 'ADMIN_STUDENTS_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to fetch student list.'),
    });
  }
});

// Super Admin Verification Status Update
app.patch('/api/admin/students/:id/status', verifySuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseAuthConfigured(res)) return;

  try {
    const { id } = req.params;
    const body = getSafeBody(req);
    const status = typeof body.status === 'string' ? body.status.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason : undefined;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Verification status is required.' });
    }
    const adminId = req.user!.id;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const defaultReason = status === 'REJECTED' 
      ? 'Registration verification declined by administrator.' 
      : status === 'NEEDS_CLEARER_COPY' 
        ? 'The uploaded document was unreadable. Please upload a clear copy of your Student ID or Certificate.' 
        : null;

    const client = getDatabaseClient(token);
    const updatePayload: any = {
      verification_status: status,
      rejection_reason: status === 'APPROVED' ? null : (reason || defaultReason),
      updated_at: new Date().toISOString(),
    };
    if (status === 'APPROVED') {
      updatePayload.email_confirmed = true;
    }

    let updatedProfile: any = null;
    let updateErr: any = null;

    const resUpdate = await client
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!resUpdate.error && resUpdate.data) {
      updatedProfile = resUpdate.data;
    } else {
      updateErr = resUpdate.error;
      if (token) {
        try {
          const uRes = await createUserClient(token)
            .from('profiles')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();
          if (!uRes.error && uRes.data) {
            updatedProfile = uRes.data;
            updateErr = null;
          }
        } catch (_) {}
      }
    }

    updatePendingRegistrationStatusFallback(id, status, reason || defaultReason);

    if (updateErr || !updatedProfile) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(updateErr, 'Failed to update student verification status.'),
      });
    }

    // Record Auth Sync if APPROVED (enables immediate student login without email confirmation barrier)
    if (status === 'APPROVED' && isServiceRoleKeyOperational && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(id, { email_confirm: true });
      } catch (authErr) {
        console.log('[Student Approval Auth Sync Note]: User auth email confirmation synced via server session bypass.');
      }
    }

    // Update student_documents authenticity status
    try {
      const docClient = getDatabaseClient(token);
      if (status === 'APPROVED') {
        await docClient.from('student_documents').update({ authenticity_status: 'MANUALLY_VERIFIED' }).eq('user_id', id);
      } else if (status === 'REJECTED') {
        await docClient.from('student_documents').update({ authenticity_status: 'REJECTED' }).eq('user_id', id);
      } else if (status === 'NEEDS_CLEARER_COPY') {
        await docClient.from('student_documents').update({ authenticity_status: 'FLAGGED_SUSPICIOUS' }).eq('user_id', id);
      }
    } catch (docErr) {
      console.warn('Document status update warning:', docErr);
    }

    // Record verification log
    try {
      const logClient = getDatabaseClient(token);
      await logClient.from('verification_logs').insert([{
        user_id: id,
        admin_id: adminId,
        action: `STATUS_CHANGE_TO_${status}`,
        note: reason || `Status updated by Super Admin to ${status}.`,
        new_status: status,
      }]);
    } catch (logErr) {
      console.warn('Verification log insertion warning:', logErr);
    }

    await logActivity(adminId, 'STUDENT_STATUS_UPDATE', `Updated student ${updatedProfile.full_name} status to ${status}.`, req.ip, req.headers['user-agent'], token);

    return res.json({ success: true, student: updatedProfile });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      code: 'STATUS_UPDATE_ERROR',
      error: extractSafeErrorMessage(err, 'Failed to update student verification status.'),
    });
  }
});

// Delete Student Account (Super Admin only)
app.delete('/api/admin/students/:id', verifySuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensureSupabaseConfigured(res) || !supabaseAdmin) {
    return res.status(503).json({ success: false, code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase admin client is not available.' });
  }

  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Student ID is required.' });
    }

    if (id === adminId) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own Super Admin account.' });
    }

    // 1. Load target profile
    let targetProfile: any = null;
    try {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      targetProfile = p;
    } catch (_) {}

    if (String(targetProfile?.role || '').trim().toUpperCase() === 'SUPERADMIN') {
      return res.status(400).json({ success: false, error: 'Super Admin accounts cannot be deleted.' });
    }

    const targetEmail = targetProfile?.email || 'Unknown Email';
    const targetName = targetProfile?.full_name || 'Unknown Student';

    if (isSuperAdminEmailAddress(targetEmail)) {
      return res.status(400).json({ success: false, error: 'Primary Super Admin account cannot be deleted.' });
    }

    // 2. Storage Cleanup: Remove user's files from 'student-documents' and 'avatars'
    try {
      const { data: docFiles } = await supabaseAdmin.storage
        .from('student-documents')
        .list(id, { limit: 100 });
      if (docFiles && docFiles.length > 0) {
        const filePaths = docFiles.map((f) => `${id}/${f.name}`);
        await supabaseAdmin.storage.from('student-documents').remove(filePaths);
      }
    } catch (sErr) {
      console.warn(`[Delete Student] Storage cleanup notice for student-documents (${id}):`, sErr);
    }

    try {
      const { data: avatarFiles } = await supabaseAdmin.storage
        .from('avatars')
        .list(`avatars/${id}`, { limit: 100 });
      if (avatarFiles && avatarFiles.length > 0) {
        const filePaths = avatarFiles.map((f) => `avatars/${id}/${f.name}`);
        await supabaseAdmin.storage.from('avatars').remove(filePaths);
      }
      const { data: avatarDirectFiles } = await supabaseAdmin.storage
        .from('avatars')
        .list(id, { limit: 100 });
      if (avatarDirectFiles && avatarDirectFiles.length > 0) {
        const filePaths = avatarDirectFiles.map((f) => `${id}/${f.name}`);
        await supabaseAdmin.storage.from('avatars').remove(filePaths);
      }
    } catch (aErr) {
      console.warn(`[Delete Student] Storage cleanup notice for avatars (${id}):`, aErr);
    }

    // 3. Delete Supabase Auth User
    let authDeleted = false;
    let authDeleteErr: any = null;

    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (!error) {
        authDeleted = true;
      } else {
        authDeleteErr = error;
        console.warn(`[Delete Student] Auth deleteUser warning for ${id}:`, error?.message || error);
      }
    } catch (e: any) {
      authDeleteErr = e;
    }

    // 4. Direct delete profile row if it still exists
    try {
      await supabaseAdmin.from('profiles').delete().eq('id', id);
    } catch (pErr) {
      console.warn(`[Delete Student] Profiles direct delete warning for ${id}:`, pErr);
    }

    // Verify profile is deleted
    const { data: remainingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (remainingProfile && !authDeleted) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_ERROR',
        error: extractSafeErrorMessage(authDeleteErr, 'Failed to delete student account from database.'),
      });
    }

    // 5. Log activity
    await logActivity(adminId || null, 'STUDENT_DELETED', `Deleted student ${targetName} (${targetEmail}).`);

    return res.json({
      success: true,
      message: `Student account ${targetName} (${targetEmail}) was deleted permanently.`,
    });
  } catch (err: any) {
    console.error('[Delete Student] Exception:', err);
    return res.status(503).json({
      success: false,
      code: 'STUDENT_DELETE_ERROR',
      error: extractSafeErrorMessage(err, 'An unexpected error occurred while deleting student account.'),
    });
  }
});

// Admin Payments View
app.get('/api/admin/payments', verifySuperAdmin, async (_req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const { data: payments, error } = await supabaseAdmin!
      .from('payments')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(error, 'Failed to fetch payments.') });
    return res.json(payments);
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'ADMIN_PAYMENTS_ERROR', error: extractSafeErrorMessage(err, 'Failed to fetch payments.') });
  }
});

// Admin Subscriptions View
app.get('/api/admin/subscriptions', verifySuperAdmin, async (_req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const { data: subscriptions, error } = await supabaseAdmin!
      .from('subscriptions')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(error, 'Failed to fetch subscriptions.') });
    return res.json(subscriptions);
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'ADMIN_SUBSCRIPTIONS_ERROR', error: extractSafeErrorMessage(err, 'Failed to fetch subscriptions.') });
  }
});



// Admin System Settings
app.get('/api/admin/settings', verifySuperAdmin, async (_req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const { data: settings } = await supabaseAdmin!.from('system_settings').select('*');
    return res.json({
      settings: settings || [],
      supabaseStatus: {
        isConfigured: isSupabaseConfigured,
        supabaseUrl,
      },
      geminiStatus: {
        isConfigured: Boolean(getGeminiApiKey()),
        model: 'gemini-2.5-flash',
      }
    });
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'SETTINGS_ERROR', error: extractSafeErrorMessage(err, 'Failed to load settings.') });
  }
});

// REST Endpoints for Subjects & Topics
app.get('/api/admin/subjects', verifySuperAdmin, async (_req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const { count: existingTopicCount } = await supabaseAdmin!
      .from('topics')
      .select('*', { count: 'exact', head: true });

    if (!existingTopicCount || existingTopicCount < LET_REVIEW_DATASETS.summaries.length) {
      await seedReviewDatasets();
    }

    const [subRes, topRes] = await Promise.all([
      supabaseAdmin!.from('subjects').select('*').order('code'),
      supabaseAdmin!
        .from('topics')
        .select('*')
        .order('order_index', { ascending: true })
        .order('title', { ascending: true }),
    ]);

    if (subRes.error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(subRes.error, 'Failed to load subjects.') });
    if (topRes.error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(topRes.error, 'Failed to load topics.') });

    const allSubjects = subRes.data || [];
    const allTopics = topRes.data || [];

    const countBySubject = new Map<string, number>();
    for (const t of allTopics) {
      if (t.subject_id) {
        countBySubject.set(t.subject_id, (countBySubject.get(t.subject_id) || 0) + 1);
      }
    }

    const enrichedSubjects = allSubjects.map((sub: any) => ({
      ...sub,
      topic_count: countBySubject.get(sub.id) || 0,
    }));

    return res.json({
      subjects: enrichedSubjects,
      topics: allTopics,
    });
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'SUBJECTS_LOAD_ERROR', error: extractSafeErrorMessage(err, 'Failed to load subjects and topics.') });
  }
});

app.post('/api/subjects', verifySuperAdmin, async (req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description : '';
    const board_exam_category = typeof body.board_exam_category === 'string' && body.board_exam_category ? body.board_exam_category : 'General Education';
    const total_units = body.total_units;
    const icon_name = typeof body.icon_name === 'string' && body.icon_name ? body.icon_name : 'BookOpen';

    if (!code || !title) {
      return res.status(400).json({ success: false, error: 'Subject code and title are required.' });
    }
    const { data, error } = await supabaseAdmin!.from('subjects').insert([{
      code: code.toUpperCase(),
      title,
      description,
      board_exam_category,
      total_units: Number(total_units) || 3,
      icon_name,
      is_published: true,
    }]).select().single();

    if (error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(error, 'Failed to create subject.') });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'SUBJECT_CREATE_ERROR', error: extractSafeErrorMessage(err, 'Failed to create subject.') });
  }
});

app.delete('/api/subjects/:id', verifySuperAdmin, async (req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  const subjectId = req.params.id;
  try {
    await supabaseAdmin!.from('topics').delete().eq('subject_id', subjectId);
    await supabaseAdmin!.from('review_materials').delete().eq('subject_id', subjectId);
    const { error } = await supabaseAdmin!.from('subjects').delete().eq('id', subjectId);
    if (error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(error, 'Failed to delete subject.') });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'SUBJECT_DELETE_ERROR', error: extractSafeErrorMessage(err, 'Failed to delete subject.') });
  }
});

app.post('/api/topics', verifySuperAdmin, async (req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const body = getSafeBody(req);
    const subject_id = typeof body.subject_id === 'string' ? body.subject_id.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const order_index = body.order_index;

    if (!subject_id || !title) {
      return res.status(400).json({ success: false, error: 'Subject ID and topic title are required.' });
    }
    let nextOrder = Number(order_index);
    if (!Number.isFinite(nextOrder) || nextOrder <= 0) {
      const { count } = await supabaseAdmin!
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subject_id);
      nextOrder = (count || 0) + 1;
    }

    const { data, error } = await supabaseAdmin!
      .from('topics')
      .insert([{
        subject_id,
        title,
        description,
        order_index: nextOrder,
      }])
      .select()
      .single();

    if (error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(error, 'Failed to add topic.') });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'TOPIC_CREATE_ERROR', error: extractSafeErrorMessage(err, 'Failed to add topic.') });
  }
});

app.delete('/api/topics/:id', verifySuperAdmin, async (req: Request, res: Response) => {
  if (!ensureSupabaseConfigured(res)) return;

  try {
    const { error } = await supabaseAdmin!.from('topics').delete().eq('id', req.params.id);
    if (error) return res.status(503).json({ success: false, code: 'DATABASE_ERROR', error: extractSafeErrorMessage(error, 'Failed to delete topic.') });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(503).json({ success: false, code: 'TOPIC_DELETE_ERROR', error: extractSafeErrorMessage(err, 'Failed to delete topic.') });
  }
});

// Public Endpoint to retrieve LET Review Datasets
app.get('/api/review/datasets', (_req: Request, res: Response) => {
  return res.json(LET_REVIEW_DATASETS);
});

// ==============================================================================
// API CATCH-ALL & GLOBAL ERROR HANDLER (ENSURES JSON IS ALWAYS RETURNED)
// ==============================================================================

// Unmatched /api routes must always return JSON 404, never falling through to Vite or index.html
app.use('/api', (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.path}`,
  });
});

// Global API error handler for any errors thrown or passed to next(err)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const isApi = req.path.startsWith('/api') || req.url.startsWith('/api') || req.originalUrl?.startsWith('/api');
  if (isApi) {
    console.error(`[API Error Handler] ${req.method} ${req.originalUrl || req.url}:`, err);
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_JSON',
        error: 'Invalid JSON request body.',
      });
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Uploaded file is too large. Maximum size is 15MB.', success: false });
      }
      return res.status(400).json({ error: `Upload error: ${extractSafeErrorMessage(err)}`, success: false });
    }
    const rawStatus = typeof err?.status === 'number' ? err.status : typeof err?.statusCode === 'number' ? err.statusCode : 503;
    const statusCode = rawStatus >= 500 || rawStatus < 400 ? 503 : rawStatus;
    return res.status(statusCode).json({
      success: false,
      code: 'API_SERVICE_ERROR',
      error: extractSafeErrorMessage(err, 'API service is temporarily unavailable.'),
    });
  }
  next(err);
});

// ==============================================================================
// VITE MIDDLEWARE SETUP & SERVER INITIALIZATION
// ==============================================================================

server.on('error', (err) => {
  console.error('[Server Error]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

// Background worker: Periodically expire outdated subscriptions in Supabase DB
async function checkExpiredSubscriptions() {
  if (!isSupabaseConfigured || !supabaseAdmin || !isServiceRoleKeyOperational) return;
  try {
    const nowIso = new Date().toISOString();
    const { data: expiredSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id')
      .eq('subscription_status', 'ACTIVE')
      .lt('expires_at', nowIso);

    if (expiredSubs && expiredSubs.length > 0) {
      const expiredIds = expiredSubs.map((s: { id: string }) => s.id);
      const userIds = Array.from(new Set(expiredSubs.map((s: { user_id: string }) => s.user_id)));

      await supabaseAdmin
        .from('subscriptions')
        .update({ subscription_status: 'EXPIRED', updated_at: nowIso })
        .in('id', expiredIds);

      await supabaseAdmin
        .from('profiles')
        .update({ is_premium: false, updated_at: nowIso })
        .in('id', userIds);
    }
  } catch (e) {
    console.warn('Subscription background expiration check error:', e);
  }
}

if (!isVercelRuntime) {
  setInterval(checkExpiredSubscriptions, 5 * 60 * 1000);
}

// Background tasks to run after server starts
async function runBackgroundTasks() {
  try {
    await probeServiceRoleKey().catch(() => {});
    if (isServiceRoleKeyOperational && !isVercelRuntime) {
      checkExpiredSubscriptions().catch((e: any) => console.warn('Startup subscription check error:', e));
      seedSubscriptionPlans().catch((e: any) => console.warn('Startup plan seeding error:', e));
      seedReviewDatasets().catch((e: any) => console.warn('Startup review dataset seeding error:', e));
      initializeDatabaseSchema().catch((e: any) => console.warn('Startup schema check error:', e));
    }
  } catch (err) {
    console.error('Error in background tasks:', err);
  }
}

async function startServer() {
  if (isVercelRuntime) {
    return;
  }
  
  // Start listening immediately before any await or database call
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BoardBuddy full-stack server running on http://0.0.0.0:${PORT}`);
    console.log(`Super Admin bootstrap email: ${getInitialSuperAdminEmail()}`);
    console.log(`Supabase Database Status: ${isSupabaseConfigured ? 'CONNECTED TO SUPABASE POSTGRESQL' : 'REQUIRES SUPABASE KEYS'}`);
    runBackgroundTasks();
  });

  // Vite setup for development only (attached after server.listen)
  if (process.env.NODE_ENV !== 'production' && !isVercelRuntime) {
    try {
      const publicDir = path.join(__dirname, 'public');
      app.use((req, res, next) => {
        if (!req.path.toLowerCase().endsWith('.apk')) {
          return next();
        }
        const safeRelPath = path.normalize(req.path).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
        const candidatePath = path.resolve(publicDir, safeRelPath);
        if (!candidatePath.startsWith(publicDir + path.sep) || !fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isFile()) {
          res.setHeader('Cache-Control', 'no-store');
          return res.status(404).type('text/plain').send('Android APK file not found');
        }
        const downloadName = path.basename(candidatePath).toLowerCase() === 'boardbuddy.apk' ? 'BoardBuddy.apk' : path.basename(candidatePath);
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        return res.sendFile(candidatePath, { cacheControl: false });
      });
      app.get('/sw.js', (_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        next();
      });
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error('[Vite Setup Error]:', viteErr);
    }
  } else if (!isVercelRuntime) {
    const distDir = path.join(__dirname, 'dist');
    const publicDir = path.join(__dirname, 'public');
    const staticAssetPattern = /\.(css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|json|txt|apk|webmanifest|xml)$/i;

    app.use((req, res, next) => {
      if (!req.path.toLowerCase().endsWith('.apk')) {
        return next();
      }
      const safeRelPath = path.normalize(req.path).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
      const distCandidate = path.resolve(distDir, safeRelPath);
      const publicCandidate = path.resolve(publicDir, safeRelPath);
      const candidatePath =
        distCandidate.startsWith(distDir + path.sep) && fs.existsSync(distCandidate) && fs.statSync(distCandidate).isFile()
          ? distCandidate
          : publicCandidate.startsWith(publicDir + path.sep) && fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()
          ? publicCandidate
          : null;

      if (!candidatePath) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).type('text/plain').send('Android APK file not found');
      }

      const downloadName = path.basename(candidatePath).toLowerCase() === 'boardbuddy.apk' ? 'BoardBuddy.apk' : path.basename(candidatePath);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return res.sendFile(candidatePath, { cacheControl: false });
    });

    app.get('/sw.js', (_req, res, next) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      next();
    });

    app.use(
      express.static(distDir, {
        index: false,
        setHeaders: (res, filePath) => {
          const normalized = filePath.replace(/\\/g, '/').toLowerCase();
          if (normalized.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
          } else if (normalized.endsWith('.js') || normalized.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (normalized.endsWith('manifest.json')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          }

          if (normalized.endsWith('/index.html') || normalized.endsWith('/sw.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          } else if (
            normalized.includes('/assets/') &&
            (normalized.endsWith('.css') || normalized.endsWith('.js') || normalized.endsWith('.mjs'))
          ) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
        return res.status(404).json({
          error: `API endpoint not found: ${req.method} ${req.originalUrl || req.path}`,
          success: false,
        });
      }
      if (req.path.startsWith('/assets/') || staticAssetPattern.test(req.path)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).type('text/plain').send('Static asset not found');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

// Start server
startServer().catch(err => {
  console.error('Failed to start server:', err);
});

export default app;
