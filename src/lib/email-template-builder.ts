export interface VisualFields {
  heading:   string;
  body_text: string;
  cta_text:  string;
  cta_url:   string;
  image_url: string;
  logo_url:  string;
}

export const VISUAL_DEFAULTS: VisualFields = {
  heading: '', body_text: '', cta_text: '', cta_url: '', image_url: '', logo_url: '',
};

export function buildEmailHTML(f: VisualFields): string {
  const bodyHtml = f.body_text
    .split('\n\n')
    .filter(p => p.trim())
    .map(para =>
      `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${para.replace(/\n/g, '<br>')}</p>`
    )
    .join('') || '<p style="margin:0;font-size:15px;color:#374151;line-height:1.7;"></p>';

  const logo = f.logo_url
    ? `<img src="${f.logo_url}" alt="PadelMGT" height="36" style="display:block;">`
    : `<span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-.02em;"><span style="background:#c8f135;color:#111;padding:2px 8px;margin-right:2px;">PADEL</span>MGT</span>`;

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;">
<tr><td style="padding:28px 40px;background:#0a0a0a;">${logo}</td></tr>
${f.image_url ? `<tr><td><img src="${f.image_url}" alt="" width="600" style="display:block;max-width:100%;height:auto;"></td></tr>` : ''}
<tr><td style="padding:40px 40px 32px;">
${f.heading ? `<h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#111;letter-spacing:-.02em;line-height:1.2;">${f.heading}</h1>` : ''}
${bodyHtml}
${f.cta_text && f.cta_url ? `<table cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr><td><a href="${f.cta_url}" style="display:inline-block;padding:13px 30px;background:#c8f135;color:#111;font-weight:700;font-size:13px;text-decoration:none;letter-spacing:.08em;text-transform:uppercase;">${f.cta_text}</a></td></tr></table>` : ''}
</td></tr>
<tr><td style="padding:20px 40px 28px;border-top:1px solid #e5e7eb;background:#f9fafb;">
<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Este email fue enviado por PadelMGT. Si no lo solicitaste, podés ignorarlo.<br>© {{currentYear}} PadelMGT. Todos los derechos reservados.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}
