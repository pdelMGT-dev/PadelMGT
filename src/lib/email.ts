// email.ts — client-side helpers that fire-and-forget to /api/email/send
// All functions are non-blocking: failures are logged but never thrown to the caller.

async function send(payload: Record<string, string>): Promise<void> {
  try {
    await fetch('/api/email/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[Email] send failed:', err);
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  return send({ type: 'welcome', to, name });
}

export async function sendInviteEmail(params: {
  to: string; toName: string; fromName: string;
  gameName: string; gameDate: string; gameCity: string; joinUrl: string;
}): Promise<void> {
  return send({ type: 'invite', ...params });
}

export async function sendSubscriptionConfirmedEmail(
  to: string, name: string, plan: string, planDisplay: string
): Promise<void> {
  return send({ type: 'subscription_confirmed', to, name, plan, planDisplay });
}

export async function sendSubscriptionCancelledEmail(
  to: string, name: string, plan: string, planDisplay: string
): Promise<void> {
  return send({ type: 'subscription_cancelled', to, name, plan, planDisplay });
}

export async function sendPaymentFailedEmail(
  to: string, name: string, billingUrl: string
): Promise<void> {
  return send({ type: 'payment_failed', to, name, email: to, billingUrl });
}

export async function sendJoinRequestReceivedEmail(params: {
  to: string; organizerName: string; playerName: string;
  playerEmail: string; eventName: string; approveUrl: string;
}): Promise<void> {
  return send({ type: 'join_request_received', ...params });
}

export async function sendJoinRequestApprovedEmail(
  to: string, playerName: string, eventName: string, eventUrl: string
): Promise<void> {
  return send({ type: 'join_request_approved', to, playerName, eventName, eventUrl });
}

export async function sendJoinRequestRejectedEmail(
  to: string, playerName: string, eventName: string
): Promise<void> {
  return send({ type: 'join_request_rejected', to, playerName, eventName });
}

export async function sendTournamentReminderEmail(params: {
  to: string; playerName: string; tournamentName: string;
  date: string; city: string; url: string;
}): Promise<void> {
  return send({ type: 'tournament_reminder', ...params });
}

export async function sendFriendRequestEmail(
  to: string, toName: string, fromName: string, profileUrl: string
): Promise<void> {
  return send({ type: 'friend_request', to, toName, fromName, profileUrl });
}

export async function sendPersonalizadoRegistrationEmail(p: {
  to: string; toName: string; tournamentName: string; categoryName: string; date: string; locationName: string;
}): Promise<void> {
  return send({ type: 'personalizado_registration', ...p });
}

export async function sendPersonalizadoWaitlistedEmail(p: {
  to: string; toName: string; tournamentName: string; categoryName: string;
}): Promise<void> {
  return send({ type: 'personalizado_waitlisted', ...p });
}

export async function sendPersonalizadoStatusEmail(p: {
  to: string; toName: string; tournamentName: string; categoryName: string; statusMessage: string;
}): Promise<void> {
  return send({ type: 'personalizado_status', ...p });
}

export async function sendPartnerInvitationEmail(p: {
  to: string; toName: string; fromName: string;
  tournamentName: string; categoryName: string; dashboardUrl: string;
}): Promise<void> {
  return send({ type: 'partner_invitation', ...p });
}

export async function sendFamilyLinkRequestEmail(p: {
  to: string; toName: string; fromName: string; relationLabel: string; acceptUrl: string;
}): Promise<void> {
  return send({ type: 'family_link_request', ...p });
}

export async function sendFamilyPlatformInviteEmail(p: {
  to: string; toName: string; guardianName: string; inviteUrl: string;
}): Promise<void> {
  return send({ type: 'family_platform_invite', ...p });
}
