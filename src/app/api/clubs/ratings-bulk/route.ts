import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('clubIds');
  if (!raw) return NextResponse.json({});

  const clubIds = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (clubIds.length === 0) return NextResponse.json({});

  const svc = serviceClient();
  if (!svc) return NextResponse.json({});

  const { data, error } = await svc
    .from('club_ratings')
    .select('club_id, rating')
    .in('club_id', clubIds);

  if (error) return NextResponse.json({});

  const result: Record<string, { average: number | null; count: number }> = {};
  for (const id of clubIds) result[id] = { average: null, count: 0 };

  for (const row of data ?? []) {
    const cid = row.club_id as string;
    if (!result[cid]) result[cid] = { average: null, count: 0 };
    result[cid].count += 1;
  }

  for (const id of clubIds) {
    const rows = (data ?? []).filter(r => r.club_id === id);
    if (rows.length > 0) {
      const avg = rows.reduce((s, r) => s + (r.rating as number), 0) / rows.length;
      result[id].average = Math.round(avg * 10) / 10;
    }
  }

  return NextResponse.json(result);
}
