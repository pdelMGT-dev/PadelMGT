import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_TEMPLATE_MAP, applyVars } from '@/lib/email-templates-defaults';
import { rateLimitAllow, clientIp, EMAIL_SEND_RULE } from '@/lib/rate-limit';

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Fetch a template from Supabase; returns null if unavailable or not found. */
async function fetchTemplate(type: string): Promise<{ subject: string; html_body: string } | null> {
  try {
    const sb = supabaseAnon();
    if (!sb) return null;
    const { data } = await sb
      .from('email_templates')
      .select('subject, html_body')
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

// ── Abuse protections ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Escape user-supplied text before interpolating into HTML emails */
function esc(s: unknown): string {
  return String(s ?? '')
    .slice(0, 200)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow join URLs pointing at our own app */
function safeJoinUrl(raw: unknown): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com';
  const fallback = appUrl;
  if (typeof raw !== 'string') return fallback;
  try {
    const url = new URL(raw);
    const allowed = new URL(appUrl);
    if (url.origin === allowed.origin || url.hostname.endsWith('.vercel.app')) return url.href;
    return fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  const apiKey   = process.env.RESEND_API_KEY;
  const fromAddr = process.env.RESEND_FROM_EMAIL ?? 'PadelMGT <no-reply@padelmgt.com>';

  if (!apiKey || apiKey.startsWith('re_...')) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping email');
    return NextResponse.json({ sent: false, reason: 'not_configured' });
  }

  // Same-origin check: reject cross-site callers (weak CSRF/abuse barrier)
  const origin = request.headers.get('origin');
  if (origin) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com';
    try {
      const o = new URL(origin);
      const allowed = new URL(appUrl);
      const ok = o.origin === allowed.origin || o.hostname.endsWith('.vercel.app') || o.hostname === 'localhost';
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch { /* malformed origin — let it pass to validation below */ }
  }

  // Shared (Upstash-backed) rate limit: 20 emails / 10 min per IP.
  if (!(await rateLimitAllow(EMAIL_SEND_RULE, clientIp(request)))) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type as string;
  const to = typeof body.to === 'string' ? body.to.trim() : '';

  if (!type) return NextResponse.json({ error: 'Missing email type' }, { status: 400 });

  // Single valid email only — no arrays, no header injection
  if (!to || !EMAIL_RE.test(to) || to.length > 254) {
    return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
  }

  // Build variable map from request body. All user-supplied string fields are
  // HTML-escaped before interpolation (injection protection); URLs that end up
  // in href attributes are validated against our own origin.
  const baseVars: Record<string, string> = {
    appUrl:      process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com',
    currentYear: String(new Date().getFullYear()),
  };
  for (const [k, v] of Object.entries(body)) {
    if (typeof v !== 'string' || k === 'to' || k === 'type') continue;
    baseVars[k] = /url$/i.test(k) ? safeJoinUrl(v) : esc(v);
  }
  // Convenience: dashboardUrl default if not provided
  if (!baseVars.dashboardUrl) {
    baseVars.dashboardUrl = `${baseVars.appUrl}/dashboard/player`;
  }

  // Optional shareable schedule-card image (Juego Rápido rounds×courts) —
  // only embedded when the caller actually provided a (same-origin) URL, so
  // templates without a schedule to show render with an empty block instead
  // of a broken <img>.
  baseVars.scheduleCardBlock = baseVars.scheduleCardUrl
    ? `<div style="margin-bottom:24px;"><img src="${baseVars.scheduleCardUrl}" alt="Cronograma" width="460" style="width:100%;max-width:460px;display:block;border:1px solid #e5e7eb;"/></div>`
    : '';

  // Resolve template: Supabase first, then hardcoded default
  const dbTemplate = await fetchTemplate(type);
  let subjectRaw: string;
  let htmlRaw: string;

  if (dbTemplate) {
    subjectRaw = dbTemplate.subject;
    htmlRaw    = dbTemplate.html_body;
  } else {
    const def = DEFAULT_TEMPLATE_MAP[type];
    if (!def) {
      return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 });
    }
    subjectRaw = def.subject;
    htmlRaw    = def.html_body;
  }

  const subject = applyVars(subjectRaw, baseVars);
  const html    = applyVars(htmlRaw,    baseVars);

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: fromAddr, to, subject, html });
    if (error) {
      console.error('[Email] Resend error:', error);
      return NextResponse.json({ sent: false, error: 'Send failed' });
    }
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[Email] send exception:', err);
    return NextResponse.json({ sent: false, error: 'Send failed' }, { status: 500 });
  }
}
