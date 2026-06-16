import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase-server';
import type { FamilyMember } from '@/lib/family-store';

/**
 * POST — create or update a family member in Supabase.
 * Body: { action: 'create'|'update', ownerId: string, member: FamilyMember }
 *
 * When action=update AND member.email is set for the first time AND
 * member.invitationStatus === 'none', we send a platform invite email and
 * flip invitationStatus to 'invited'.
 *
 * DELETE — remove a family member.
 * Body: { action: 'delete', ownerId: string, memberId: string }
 */

function memberToRow(m: FamilyMember): Record<string, unknown> {
  return {
    id: m.id,
    owner_id: m.ownerId,
    full_name: m.fullName,
    relation_type: m.relationType,
    sex: m.sex,
    birth_date: m.birthDate,
    email: m.email ?? null,
    linked_player_id: m.linkedPlayerId ?? null,
    invitation_status: m.invitationStatus,
    created_at: m.createdAt,
  };
}

export async function POST(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { action?: string; ownerId?: string; member?: FamilyMember };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { action, ownerId, member } = body;

  if (!action || !ownerId || !member) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  if (action === 'create' || action === 'update') {
    let memberToSave = { ...member };

    // If updating and email is newly set with invitationStatus === 'none', send invite
    if (action === 'update' && member.email && member.invitationStatus === 'none') {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/register?ref=family`;
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'family_platform_invite',
            to: member.email,
            toName: member.fullName,
            guardianName: ownerId, // will be substituted by display name at call site if needed
            inviteUrl,
          }),
        });
      } catch (e) {
        console.warn('[Family] sendFamilyPlatformInviteEmail:', e);
      }
      memberToSave = { ...memberToSave, invitationStatus: 'invited' };
    }

    const { error } = await svc
      .from('family_members')
      .upsert(memberToRow(memberToSave), { onConflict: 'id' });

    if (error) {
      console.warn('[Family] upsert member:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, member: memberToSave });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });

  let body: { action?: string; ownerId?: string; memberId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const { memberId, ownerId } = body;
  if (!memberId || !ownerId) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const { error } = await svc
    .from('family_members')
    .delete()
    .eq('id', memberId)
    .eq('owner_id', ownerId);

  if (error) {
    console.warn('[Family] delete member:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
