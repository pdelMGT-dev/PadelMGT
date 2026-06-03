import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey  = process.env.RESEND_API_KEY;
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
  let to: string;
  let subject: string;
  let html: string;

  if (type === 'welcome') {
    to      = body.to as string;
    subject = '¡Bienvenido a PadelMGT!';
    html    = welcomeHtml(body.name as string);
  } else if (type === 'invite') {
    to      = body.to as string;
    subject = `${body.fromName as string} te invita a jugar: ${body.gameName as string}`;
    html    = inviteHtml({
      toName:   body.toName as string,
      fromName: body.fromName as string,
      gameName: body.gameName as string,
      gameDate: body.gameDate as string,
      gameCity: body.gameCity as string,
      joinUrl:  body.joinUrl as string,
    });
  } else {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
  }

  if (!to) {
    return NextResponse.json({ error: 'Missing recipient' }, { status: 400 });
  }

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

// ── Templates ─────────────────────────────────────────────────────────────────

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>PadelMGT</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;">
      <!-- Header -->
      <tr>
        <td style="background:#111111;padding:24px 40px;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.06em;text-transform:uppercase;">
            <span style="background:#c8f135;color:#111;padding:2px 8px;margin-right:8px;font-size:18px;">P</span>PADELMGT
          </span>
        </td>
      </tr>
      <!-- Content -->
      ${content}
      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Este email fue enviado por PadelMGT. Si no creaste esta cuenta, podés ignorar este mensaje.
            <br/>© ${new Date().getFullYear()} PadelMGT. Todos los derechos reservados.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function welcomeHtml(name: string): string {
  return base(`
      <tr>
        <td style="padding:48px 40px 32px;">
          <h1 style="margin:0 0 8px;font-size:32px;font-weight:700;color:#111111;letter-spacing:-0.02em;text-transform:uppercase;">
            Bienvenido, ${name ?? 'Jugador'}
          </h1>
          <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
            Tu cuenta en PadelMGT está activa. Ya podés crear torneos, invitar amigos y llevar tu ranking.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#c8f135;padding:0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelmgt.com'}/dashboard/player"
                   style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#111111;text-decoration:none;letter-spacing:0.06em;text-transform:uppercase;">
                  Ir a mi Dashboard →
                </a>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['Crea un torneo', 'Americano, Express, Champions League y más'],
              ['Invita amigos', 'Por QR, link o búsqueda en la plataforma'],
              ['Sube tu ranking', 'Cada partido suma puntos a tu ranking LATAM'],
            ].map(([t, d]) => `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:14px;font-weight:700;color:#111;">${t}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">${d}</p>
              </td>
            </tr>`).join('')}
          </table>
        </td>
      </tr>`);
}

function inviteHtml(p: {
  toName: string; fromName: string;
  gameName: string; gameDate: string;
  gameCity: string; joinUrl: string;
}): string {
  return base(`
      <tr>
        <td style="padding:48px 40px 32px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">
            Invitación a partido
          </p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#111111;letter-spacing:-0.02em;line-height:1.1;">
            ${p.fromName} te invita a jugar
          </h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;margin-bottom:32px;">
            <tr>
              <td style="padding:24px 28px;">
                <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111;letter-spacing:-0.01em;">
                  ${p.gameName}
                </p>
                <p style="margin:0;font-size:14px;color:#6b7280;">
                  ${p.gameDate}${p.gameCity ? ` · ${p.gameCity}` : ''}
                </p>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="background:#111111;padding:0;margin-right:12px;">
                <a href="${p.joinUrl}"
                   style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#c8f135;text-decoration:none;letter-spacing:0.06em;text-transform:uppercase;">
                  Aceptar invitación →
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            Si no conoces a ${p.fromName} o no querés jugar, podés ignorar este email.
          </p>
        </td>
      </tr>`);
}
