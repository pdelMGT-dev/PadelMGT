// email.ts — client-side helpers that fire-and-forget to /api/email/send
// Non-blocking: failures are logged but never throw to the caller.

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'welcome', to, name }),
    });
  } catch (err) {
    console.warn('[Email] sendWelcomeEmail failed:', err);
  }
}

export async function sendInviteEmail(params: {
  to: string;
  toName: string;
  fromName: string;
  gameName: string;
  gameDate: string;
  gameCity: string;
  joinUrl: string;
}): Promise<void> {
  try {
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invite', ...params }),
    });
  } catch (err) {
    console.warn('[Email] sendInviteEmail failed:', err);
  }
}
