// Default email templates — used for initial Supabase seeding and as fallbacks.
// Variables use {{variableName}} syntax.

export interface EmailTemplateDefault {
  type: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  variables: string[];
  is_active: boolean;
}

// ── Shared layout helpers ─────────────────────────────────────────────────────

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;">
<tr><td style="background:#111;padding:24px 40px;"><span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:.06em;text-transform:uppercase;"><span style="background:#c8f135;color:#111;padding:2px 8px;margin-right:8px;font-size:18px;">P</span>PADELMGT</span></td></tr>
${content}
<tr><td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;"><p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Este email fue enviado por PadelMGT. Si no lo solicitaste, podés ignorarlo.<br/>© {{currentYear}} PadelMGT. Todos los derechos reservados.</p></td></tr>
</table></td></tr></table></body></html>`;
}

function btn(label: string, url: string, dark = false): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="background:${dark ? '#111' : '#c8f135'};"><a href="${url}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:${dark ? '#c8f135' : '#111'};text-decoration:none;letter-spacing:.06em;text-transform:uppercase;">${label} →</a></td></tr></table>`;
}

function detail(rows: [string, string][]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;margin-bottom:32px;">
<tr><td style="padding:24px 28px;">${rows.map(([k, v]) => `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;">${k}</p><p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111;">${v}</p>`).join('')}</td></tr>
</table>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: EmailTemplateDefault[] = [

  // 1 ─ Welcome
  {
    type: 'welcome',
    name: 'Bienvenida',
    description: 'Se envía al jugador al crear su cuenta.',
    subject: '¡Bienvenido a PadelMGT, {{name}}!',
    variables: ['name', 'dashboardUrl', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<h1 style="margin:0 0 8px;font-size:32px;font-weight:700;color:#111;letter-spacing:-.02em;text-transform:uppercase;">Bienvenido, {{name}}</h1>
<p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">Tu cuenta en PadelMGT está activa. Ya podés crear torneos, invitar amigos y llevar tu ranking.</p>
${btn('Ir a mi Dashboard', '{{dashboardUrl}}')}
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;"><p style="margin:0;font-size:14px;font-weight:700;color:#111;">Crea un torneo</p><p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Americano, Express, Champions League y más</p></td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;"><p style="margin:0;font-size:14px;font-weight:700;color:#111;">Invita amigos</p><p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Por QR, link o búsqueda en la plataforma</p></td></tr>
<tr><td style="padding:12px 0;"><p style="margin:0;font-size:14px;font-weight:700;color:#111;">Sube tu ranking</p><p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Cada partido suma puntos a tu ranking LATAM</p></td></tr>
</table>
</td></tr>`),
  },

  // 2 ─ Invite
  {
    type: 'invite',
    name: 'Invitación a Partido',
    description: 'Se envía cuando un jugador invita a otro a un juego rápido o torneo.',
    subject: '{{fromName}} te invita a jugar: {{gameName}}',
    variables: ['toName', 'fromName', 'gameName', 'gameDate', 'gameCity', 'joinUrl', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;">Invitación a partido</p>
<h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;line-height:1.1;">{{fromName}} te invita a jugar</h1>
${detail([['Partido', '{{gameName}}'], ['Fecha', '{{gameDate}}'], ['Ciudad', '{{gameCity}}']])}
${btn('Aceptar invitación', '{{joinUrl}}', true)}
<p style="margin:0;font-size:13px;color:#9ca3af;">Si no conoces a {{fromName}} o no querés jugar, podés ignorar este email.</p>
</td></tr>`),
  },

  // 3 ─ Subscription confirmed
  {
    type: 'subscription_confirmed',
    name: 'Suscripción Confirmada',
    description: 'Se envía cuando un pago de suscripción es procesado correctamente.',
    subject: '✓ Tu suscripción {{planDisplay}} está activa',
    variables: ['name', 'plan', 'planDisplay', 'dashboardUrl', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#166534;">Suscripción activa</p>
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">¡Gracias, {{name}}!</h1>
<p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">Tu suscripción <strong>{{planDisplay}}</strong> está activa. Ya tenés acceso a todas las funciones premium de PadelMGT.</p>
${detail([['Plan', '{{planDisplay}}'], ['Estado', 'Activo']])}
${btn('Ir a mi Dashboard', '{{dashboardUrl}}')}
</td></tr>`),
  },

  // 4 ─ Subscription cancelled
  {
    type: 'subscription_cancelled',
    name: 'Suscripción Cancelada',
    description: 'Se envía cuando una suscripción es cancelada (por el usuario o por falta de pago).',
    subject: 'Tu suscripción {{planDisplay}} ha sido cancelada',
    variables: ['name', 'plan', 'planDisplay', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">Suscripción cancelada</h1>
<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">Hola {{name}}, tu suscripción <strong>{{planDisplay}}</strong> ha sido cancelada. Seguís teniendo acceso hasta el fin del período facturado.</p>
<p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">Si fue un error o querés reactivar tu plan, podés hacerlo desde tu dashboard.</p>
${btn('Reactivar suscripción', '{{appUrl}}/pricing')}
<p style="margin:0;font-size:13px;color:#9ca3af;">Si cancelaste intencionalmente, podés ignorar este email.</p>
</td></tr>`),
  },

  // 5 ─ Payment failed
  {
    type: 'payment_failed',
    name: 'Pago Fallido',
    description: 'Se envía cuando no se puede procesar el cobro de la suscripción.',
    subject: '⚠️ No pudimos procesar tu pago en PadelMGT',
    variables: ['name', 'email', 'billingUrl', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#dc2626;">Acción requerida</p>
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">Problema con tu pago</h1>
<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">Hola {{name}}, intentamos cobrar tu suscripción pero el pago no fue procesado. Para no perder el acceso a tu plan, actualizá tu método de pago.</p>
<div style="background:#fef2f2;border:1px solid #fecaca;padding:16px 20px;margin-bottom:28px;">
<p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">Cuenta afectada: {{email}}</p>
</div>
${btn('Actualizar método de pago', '{{billingUrl}}', true)}
<p style="margin:0;font-size:13px;color:#9ca3af;">Reintentaremos el cobro en los próximos días. Si el problema persiste, tu plan será cancelado.</p>
</td></tr>`),
  },

  // 6 ─ Join request received (to organizer)
  {
    type: 'join_request_received',
    name: 'Solicitud de Unión Recibida',
    description: 'Se envía al organizador cuando alguien solicita unirse a su torneo o juego.',
    subject: '{{playerName}} solicita unirse a {{eventName}}',
    variables: ['organizerName', 'playerName', 'playerEmail', 'eventName', 'approveUrl', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;">Nueva solicitud</p>
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">{{playerName}} quiere unirse</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">Hola {{organizerName}}, tienes una nueva solicitud para <strong>{{eventName}}</strong>.</p>
${detail([['Jugador', '{{playerName}}'], ['Email', '{{playerEmail}}'], ['Evento', '{{eventName}}']])}
${btn('Gestionar solicitudes', '{{approveUrl}}')}
</td></tr>`),
  },

  // 7 ─ Join request approved (to player)
  {
    type: 'join_request_approved',
    name: 'Solicitud Aprobada',
    description: 'Se envía al jugador cuando su solicitud de unirse es aprobada.',
    subject: '✓ ¡Fuiste aceptado en {{eventName}}!',
    variables: ['playerName', 'eventName', 'eventUrl', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<div style="width:56px;height:56px;background:rgba(200,241,53,.15);border:2px solid #c8f135;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:24px;font-size:24px;">✓</div>
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">¡Solicitud aprobada!</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">Hola {{playerName}}, tu solicitud para unirte a <strong>{{eventName}}</strong> fue aprobada. ¡Ya eres parte del evento!</p>
${btn('Ver el evento', '{{eventUrl}}')}
</td></tr>`),
  },

  // 8 ─ Join request rejected (to player)
  {
    type: 'join_request_rejected',
    name: 'Solicitud Rechazada',
    description: 'Se envía al jugador cuando su solicitud de unirse es rechazada.',
    subject: 'Actualización sobre tu solicitud a {{eventName}}',
    variables: ['playerName', 'eventName', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">Solicitud no aprobada</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">Hola {{playerName}}, lamentablemente tu solicitud para unirte a <strong>{{eventName}}</strong> no fue aprobada en esta ocasión.</p>
<p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">Podés buscar otros torneos y juegos disponibles en la plataforma.</p>
${btn('Explorar eventos', '{{appUrl}}/dashboard/player')}
</td></tr>`),
  },

  // 9 ─ Tournament reminder
  {
    type: 'tournament_reminder',
    name: 'Recordatorio de Torneo',
    description: 'Se envía el día antes de que comience un torneo.',
    subject: '⏰ Recordatorio: {{tournamentName}} es mañana',
    variables: ['playerName', 'tournamentName', 'date', 'city', 'url', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;">Recordatorio</p>
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">Tu torneo es mañana</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">Hola {{playerName}}, te recordamos que <strong>{{tournamentName}}</strong> comienza mañana. ¡Prepárate!</p>
${detail([['Torneo', '{{tournamentName}}'], ['Fecha', '{{date}}'], ['Ciudad', '{{city}}']])}
${btn('Ver detalles', '{{url}}')}
</td></tr>`),
  },

  // 10 ─ Friend request
  {
    type: 'friend_request',
    name: 'Solicitud de Amistad',
    description: 'Se envía cuando un jugador envía solicitud de amistad.',
    subject: '{{fromName}} quiere ser tu amigo en PadelMGT',
    variables: ['toName', 'fromName', 'profileUrl', 'appUrl', 'currentYear'],
    is_active: true,
    html_body: base(`
<tr><td style="padding:48px 40px 32px;">
<h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111;letter-spacing:-.02em;">Nueva solicitud de amistad</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">Hola {{toName}}, <strong>{{fromName}}</strong> quiere conectar contigo en PadelMGT.</p>
${btn('Ver perfil', '{{profileUrl}}')}
<p style="margin:0;font-size:13px;color:#9ca3af;">Si no conoces a {{fromName}}, podés ignorar este email.</p>
</td></tr>`),
  },
];

// Convenience map: type → default template
export const DEFAULT_TEMPLATE_MAP: Record<string, EmailTemplateDefault> = Object.fromEntries(
  DEFAULT_TEMPLATES.map(t => [t.type, t])
);

// Test variable values for SA preview
export const PREVIEW_VARS: Record<string, string> = {
  name:             'Carlos García',
  toName:           'Carlos García',
  playerName:       'Carlos García',
  organizerName:    'María López',
  fromName:         'María López',
  email:            'carlos@ejemplo.com',
  playerEmail:      'carlos@ejemplo.com',
  gameName:         'Americano del Sábado',
  eventName:        'Americano del Sábado',
  tournamentName:   'Copa PadelMGT 2025',
  gameDate:         'Sábado 14 de junio, 10:00',
  date:             'Sábado 14 de junio, 10:00',
  gameCity:         'Buenos Aires',
  city:             'Buenos Aires',
  plan:             'player_pro',
  planDisplay:      'Jugador Pro',
  joinUrl:          'https://padelmgt.com/join/abc123',
  approveUrl:       'https://padelmgt.com/dashboard/player',
  eventUrl:         'https://padelmgt.com/dashboard/player',
  url:              'https://padelmgt.com/dashboard/player',
  dashboardUrl:     'https://padelmgt.com/dashboard/player',
  billingUrl:       'https://padelmgt.com/billing',
  profileUrl:       'https://padelmgt.com/player/abc123',
  appUrl:           'https://padelmgt.com',
  currentYear:      String(new Date().getFullYear()),
};

/** Replace {{variable}} placeholders in a string. */
export function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
