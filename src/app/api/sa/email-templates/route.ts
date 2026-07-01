import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET  — list all templates
export async function GET() {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('email_templates')
    .select('*')
    .order('type');

  if (error) {
    console.error('[SA email-templates] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

// POST — upsert a template (insert or update by type)
export async function POST(request: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, name, description, subject, html_body, variables, is_active, updated_by,
          heading, body_text, cta_text, cta_url, image_url, logo_url } = body;

  if (!type || !subject || !html_body) {
    return NextResponse.json({ error: 'Faltan campos requeridos: type, subject, html_body' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('email_templates')
    .upsert({
      type,
      name:        name ?? type,
      description: description ?? '',
      subject,
      html_body,
      variables:   variables ?? [],
      is_active:   is_active ?? true,
      updated_by:  updated_by ?? null,
      updated_at:  new Date().toISOString(),
      heading:     heading   ?? '',
      body_text:   body_text ?? '',
      cta_text:    cta_text  ?? '',
      cta_url:     cta_url   ?? '',
      image_url:   image_url ?? '',
      logo_url:    logo_url  ?? '',
    }, { onConflict: 'type' })
    .select()
    .single();

  if (error) {
    console.error('[SA email-templates] upsert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

// DELETE — deactivate a template by type (soft delete via is_active=false)
export async function DELETE(request: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (!type) return NextResponse.json({ error: 'Missing type param' }, { status: 400 });

  const { error } = await sb
    .from('email_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('type', type);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
