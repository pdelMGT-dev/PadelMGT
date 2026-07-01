import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSARequest } from '@/lib/sa-session';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadFormData {
  get(name: string): { type: string; size: number; name: string; arrayBuffer(): Promise<ArrayBuffer> } | string | null;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  if (!(await requireSARequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const rawForm = await request.formData().catch(() => null) as UploadFormData | null;
  if (!rawForm) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const entry = rawForm.get('file');
  if (!entry || typeof entry === 'string') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const file = entry;

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Tipo no permitido. Solo PNG, JPEG, GIF, WebP, SVG.' }, { status: 415 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera los 5MB.' }, { status: 413 });
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const rnd = Math.random().toString(36).slice(2, 8);
  const filename = `${Date.now()}-${rnd}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error } = await sb.storage
    .from('email-assets')
    .upload(filename, bytes, { contentType: file.type, upsert: false });

  if (error) {
    console.error('[SA email-assets] upload error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = sb.storage.from('email-assets').getPublicUrl(filename);
  return NextResponse.json({ url: publicUrl });
}
