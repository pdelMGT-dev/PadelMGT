import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_TEMPLATE_MAP, applyVars } from '@/lib/email-templates-defaults';

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

export async function POST(request: NextRequest) {
  const apiKey   = process.env.RESEND_API_KEY;
  const fromAddr = process.env.RESEND_FROM_EMAIL ?? 'PadelMGT <no-reply@padelmgt.com>';

  if (!apiKey || apiKey.startsWith('re_...')) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping email');
    return NextResponse.json({ sent: false, reason: 'not_configured' });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type as string;
  const to   = body.to as string;

  if (!type) return NextResponse.json({ error: 'Missing email type' }, { status: 400 });
  if (!to)   return NextResponse.json({ error: 'Missing recipient' },   { status: 400 });

  // Build variable map from request body (all string fields become template vars)
  const baseVars: Record<string, string> = {
    appUrl:      process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com',
    currentYear: String(new Date().getFullYear()),
  };
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === 'string') baseVars[k] = v;
  }
  // Convenience: dashboardUrl default if not provided
  if (!baseVars.dashboardUrl) {
    baseVars.dashboardUrl = `${baseVars.appUrl}/dashboard/player`;
  }

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
      return NextResponse.json({ sent: false, error: (error as { message?: string }).message });
    }
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[Email] send exception:', err);
    return NextResponse.json({ sent: false, error: 'Send failed' }, { status: 500 });
  }
}
