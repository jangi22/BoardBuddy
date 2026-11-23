const DISPOSABLE_OR_DUMMY_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'fake.com',
  'dummy.com',
  'invalid.com',
  'sample.com',
  'none.com',
  'noemail.com',
  'localhost',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  '10minutemail.com',
  '10minutemail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'getnada.com',
  'nada.email',
  'fakeinbox.com',
  'dispostable.com',
  'maildrop.cc',
  'mohmal.com',
  'emailondeck.com',
  'mintemail.com',
  'burnermail.io',
  'mailnesia.com',
  'tempr.email',
  'discard.email',
  'spamgourmet.com',
  'getairmail.com',
  'tempinbox.com',
  'harakirimail.com',
  'mailcatch.com',
  'mytemp.email',
  'incognitomail.org',
  'instant-mail.de',
  'dropmail.me',
  'moakt.com',
  'tmail.ws',
  'tmpmail.org',
  'tmpmail.net',
  'spambox.us',
  'tempail.com',
  'burner.kiwi',
  'crazymailing.com',
  'emailfake.com',
  'fakemailgenerator.com',
  'generator.email',
  'inboxkitten.com',
  'mailexpire.com',
  'mailnull.com',
  'meltmail.com',
  'nomail.xl.cx',
  'spam4.me',
  'spambog.com',
  'trash-mail.at',
  'wegwerfmail.de',
]);

const RESERVED_TLDS = new Set([
  'test',
  'example',
  'invalid',
  'localhost',
  'local',
  'internal',
  'lan',
  'home',
  'arpa',
]);

const DOMAIN_TYPO_SUGGESTIONS: Record<string, string> = {
  'gmil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.ph': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yaoo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'protonmal.com': 'protonmail.com',
};

const DUMMY_LOCAL_PARTS = new Set([
  'test',
  'testing',
  'tester',
  'dummy',
  'fake',
  'sample',
  'example',
  'asdf',
  'asdfg',
  'asdfgh',
  'asdfghj',
  'asdfghjkl',
  'qwerty',
  'qwert',
  'qwertyuiop',
  'zxcv',
  'zxcvb',
  'zxcvbn',
  'zxcvbnm',
  'hjkl',
  'fghj',
  'sdfg',
  'none',
  'null',
  'void',
  'noreply',
  'no-reply',
  'nobody',
  'unknown',
  'anon',
  'anonymous',
  'guest',
  'temp',
  'temporary',
  'spam',
  'trash',
  'junk',
  'throwaway',
  'abc',
  'abcd',
  'abcde',
  'abcdef',
  'abcdefg',
  'xyz',
  'foobar',
  'foo',
  'bar',
  'baz',
  'jiji',
  'jijiie',
  'jijiji',
  'hehe',
  'hehehe',
  'haha',
  'hahaha',
  'blabla',
  'blah',
  'blahblah',
  'user',
  'admin',
  'root',
  'demo',
  'trial',
]);

const KEYBOARD_WALK_PATTERNS = [
  'qwerty',
  'werty',
  'asdfg',
  'sdfgh',
  'dfghj',
  'fghjk',
  'ghjkl',
  'zxcvb',
  'xcvbn',
  'qazwsx',
  '1qaz',
  '2wsx',
];

const PUBLIC_WEBMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.com.ph',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
]);

export function validateRegistrationEmail(rawEmail: string): string | null {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  if (!email) {
    return 'Please enter your email address.';
  }

  if (/\s/.test(email)) {
    return 'Email address must not contain spaces.';
  }

  const atParts = email.split('@');
  if (atParts.length !== 2) {
    return 'Please enter a valid email address containing "@" (e.g. name@gmail.com).';
  }

  const [localPart, domainPart] = atParts;

  if (!localPart || localPart.length < 2 || localPart.length > 64) {
    return 'Please enter a valid email address (e.g. name@gmail.com).';
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return 'Please enter a valid email address before the "@" symbol.';
  }

  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)) {
    return 'Email address contains invalid characters.';
  }

  if (!domainPart || domainPart.length > 253 || !domainPart.includes('.')) {
    return 'Please enter a valid email domain (e.g. name@gmail.com).';
  }

  if (
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-') ||
    domainPart.includes('..')
  ) {
    return 'Please enter a valid email domain (e.g. name@gmail.com).';
  }

  const domainLabels = domainPart.split('.');
  if (domainLabels.length < 2) {
    return 'Please enter a valid email domain (e.g. name@gmail.com).';
  }

  for (const label of domainLabels) {
    if (
      !label ||
      label.length > 63 ||
      label.startsWith('-') ||
      label.endsWith('-') ||
      !/^[a-z0-9-]+$/i.test(label)
    ) {
      return 'Please enter a valid email domain (e.g. name@gmail.com).';
    }
  }

  const tld = domainLabels[domainLabels.length - 1];
  if (!/^[a-z]{2,24}$/i.test(tld) || RESERVED_TLDS.has(tld)) {
    return 'Please enter a valid active email domain extension (e.g. .com, .edu.ph, .org).';
  }

  if (DOMAIN_TYPO_SUGGESTIONS[domainPart]) {
    return `Invalid or mistyped email domain "${domainPart}". Did you mean @${DOMAIN_TYPO_SUGGESTIONS[domainPart]}?`;
  }

  const domainPartsToCheck: string[] = [];
  for (let i = 0; i < domainLabels.length - 1; i++) {
    domainPartsToCheck.push(domainLabels.slice(i).join('.'));
  }
  if (domainPartsToCheck.some((d) => DISPOSABLE_OR_DUMMY_DOMAINS.has(d))) {
    return 'Disposable, temporary, or placeholder email domains are not allowed. Please use an active personal or institutional email.';
  }

  // Strict anti-dummy / anti-gibberish local-part checks
  const baseLocal = localPart.split('+')[0];
  const alphaNum = baseLocal.replace(/[^a-z0-9]/g, '');
  const alphaOnly = baseLocal.replace(/[^a-z]/g, '');

  if (
    DUMMY_LOCAL_PARTS.has(baseLocal) ||
    DUMMY_LOCAL_PARTS.has(alphaNum) ||
    (alphaOnly.length > 0 && DUMMY_LOCAL_PARTS.has(alphaOnly) && baseLocal.length <= alphaOnly.length + 4)
  ) {
    return 'Dummy, placeholder, or random test email addresses are not permitted. Please enter your real email address.';
  }

  if ((domainPart === 'gmail.com' || domainPart === 'googlemail.com') && alphaNum.length < 6) {
    return 'Gmail usernames must contain at least 6 letters/digits before "@gmail.com".';
  }

  if (PUBLIC_WEBMAIL_DOMAINS.has(domainPart) && !/[a-z]/i.test(baseLocal)) {
    return 'Please enter a real email address containing your name or letters, not numbers only.';
  }

  // Reject keyboard walks or 3+ identical consecutive characters (e.g., aaa, iii)
  if (/(.)\1{2,}/i.test(alphaOnly) || KEYBOARD_WALK_PATTERNS.some((p) => alphaNum.includes(p))) {
    return 'Please enter a genuine email address (repeated or random keyboard-mash characters are not allowed).';
  }

  // Reject low-diversity gibberish or repeating-syllable random strings (e.g., jijiie, ababab)
  if (alphaOnly.length >= 5 && new Set(alphaOnly).size <= 2) {
    return 'This email address appears to be a random or dummy string. Please use your real email address.';
  }

  if (
    !/[._-]/.test(baseLocal) &&
    alphaOnly.length >= 6 &&
    /([a-z]{2})\1/i.test(alphaOnly) &&
    new Set(alphaOnly).size <= Math.ceil(alphaOnly.length / 2)
  ) {
    return 'This email address appears to be a dummy or random string. Please enter your real personal or school email.';
  }

  // Reject unpronounceable random consonant clusters or pure consonant strings on webmail
  if (PUBLIC_WEBMAIL_DOMAINS.has(domainPart)) {
    if (alphaOnly.length >= 4 && !/[aeiouy]/i.test(alphaOnly)) {
      return 'This email address appears invalid or random. Please enter your real email address.';
    }
    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(alphaOnly) || /[aeiou]{5,}/i.test(alphaOnly)) {
      return 'Please enter a valid, real email address without random character strings.';
    }
  }

  return null;
}

export function isValidRegistrationEmail(rawEmail: string): boolean {
  return validateRegistrationEmail(rawEmail) === null;
}

function extractVerifyErrorText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.error, obj.message, obj.msg, obj.details];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === 'object') {
      const nested = extractVerifyErrorText(candidate);
      if (nested) return nested;
    }
  }
  return '';
}

export async function verifyEmailWithServer(rawEmail: string): Promise<{
  valid: boolean;
  available?: boolean;
  exists?: boolean;
  error?: string;
  domain?: string;
  mxHost?: string;
}> {
  const safeEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const localErr = validateRegistrationEmail(safeEmail);
  if (localErr) {
    return { valid: false, available: false, error: localErr };
  }

  try {
    const resp = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email: safeEmail }),
    });

    // Never let transient server/gateway 5xx errors block the student's registration form
    if (resp.status >= 500) {
      return { valid: true, available: true };
    }

    const contentType = String(resp.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return { valid: true, available: true };
    }

    const data = await resp.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return { valid: true, available: true };
    }

    if (!resp.ok || data.valid === false || data.available === false) {
      const errMsg = extractVerifyErrorText(data) || 'Email domain does not exist or cannot accept mail.';
      return {
        valid: false,
        available: data.available === false ? false : undefined,
        exists: Boolean(data.exists),
        error: errMsg,
      };
    }

    return {
      valid: true,
      available: data.available !== false,
      domain: typeof data.domain === 'string' ? data.domain : undefined,
      mxHost: typeof data.mxHost === 'string' ? data.mxHost : undefined,
    };
  } catch {
    // Fail-open on transient network/verification errors so /api/auth/register remains authoritative
    return {
      valid: true,
      available: true,
    };
  }
}
