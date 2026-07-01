'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { saGetSession } from '@/lib/superadmin-auth';
import { DEFAULT_TEMPLATES, PREVIEW_VARS, applyVars } from '@/lib/email-templates-defaults';
import { buildEmailHTML, VISUAL_DEFAULTS, type VisualFields } from '@/lib/email-template-builder';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DBTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  variables: string[];
  is_active: boolean;
  updated_by?: string;
  updated_at: string;
  heading:   string;
  body_text: string;
  cta_text:  string;
  cta_url:   string;
  image_url: string;
  logo_url:  string;
}

type Tab = 'visual' | 'edit' | 'preview';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  welcome:                 'Bienvenida',
  invite:                  'Invitación a Partido',
  subscription_confirmed:  'Suscripción Confirmada',
  subscription_cancelled:  'Suscripción Cancelada',
  payment_failed:          'Pago Fallido',
  join_request_received:   'Solicitud Recibida',
  join_request_approved:   'Solicitud Aprobada',
  join_request_rejected:   'Solicitud Rechazada',
  tournament_reminder:     'Recordatorio Torneo',
  friend_request:          'Solicitud de Amistad',
};

const TYPE_ICON: Record<string, string> = {
  welcome:                '👋',
  invite:                 '🎾',
  subscription_confirmed: '✅',
  subscription_cancelled: '❌',
  payment_failed:         '⚠️',
  join_request_received:  '📥',
  join_request_approved:  '✓',
  join_request_rejected:  '✕',
  tournament_reminder:    '⏰',
  friend_request:         '🤝',
};

const btnBase: React.CSSProperties = {
  padding: '9px 18px', border: 'none', borderRadius: 4, fontWeight: 600,
  fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase',
};

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
  textTransform: 'uppercase', color: '#6b7280', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb',
  borderRadius: 4, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', color: '#111',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const [dbTemplates, setDbTemplates]     = useState<DBTemplate[]>([]);
  const [loading, setLoading]             = useState(true);
  const [seeding, setSeeding]             = useState(false);
  const [selected, setSelected]           = useState<string | null>(null);
  const [tab, setTab]                     = useState<Tab>('visual');

  // Shared edit state
  const [editSubject, setEditSubject]     = useState('');
  const [editBody, setEditBody]           = useState('');
  const [editActive, setEditActive]       = useState(true);
  const [dirty, setDirty]                 = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState('');

  // Visual fields
  const [visual, setVisual]               = useState<VisualFields>(VISUAL_DEFAULTS);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImg, setUploadingImg]   = useState(false);
  const logoFileRef                       = useRef<HTMLInputElement>(null);
  const imgFileRef                        = useRef<HTMLInputElement>(null);

  // Test send modal
  const [testOpen, setTestOpen]           = useState(false);
  const [testEmail, setTestEmail]         = useState('');
  const [testSending, setTestSending]     = useState(false);
  const [testMsg, setTestMsg]             = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Load templates ──────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/sa/email-templates');
      const json = await res.json() as { templates?: DBTemplate[] };
      setDbTemplates(json.templates ?? []);
    } catch {
      setDbTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    const session = saGetSession();
    if (session?.email) setTestEmail(session.email);
  }, []);

  // ── Preview sync ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tab !== 'preview' || !iframeRef.current || !selected) return;
    const srcHtml = tab === 'preview'
      ? applyVars(editBody, PREVIEW_VARS)
      : '';
    iframeRef.current.srcdoc = srcHtml;
  }, [tab, editBody, selected]);

  // ── Merge defaults + DB ─────────────────────────────────────────────────────

  function getTemplate(type: string) {
    const db = dbTemplates.find(d => d.type === type);
    if (db) {
      return {
        subject:   db.subject,
        html_body: db.html_body,
        variables: db.variables,
        is_active: db.is_active,
        inDb:      true,
        visual: {
          heading:   db.heading   ?? '',
          body_text: db.body_text ?? '',
          cta_text:  db.cta_text  ?? '',
          cta_url:   db.cta_url   ?? '',
          image_url: db.image_url ?? '',
          logo_url:  db.logo_url  ?? '',
        } satisfies VisualFields,
      };
    }
    const def = DEFAULT_TEMPLATES.find(d => d.type === type)!;
    return {
      subject:   def.subject,
      html_body: def.html_body,
      variables: def.variables,
      is_active: def.is_active,
      inDb:      false,
      visual:    { ...VISUAL_DEFAULTS },
    };
  }

  // ── Select template ─────────────────────────────────────────────────────────

  function selectTemplate(type: string) {
    const t = getTemplate(type);
    setSelected(type);
    setEditSubject(t.subject);
    setEditBody(t.html_body);
    setEditActive(t.is_active);
    setVisual(t.visual);
    setDirty(false);
    setSaveMsg('');
    setTab('visual');
  }

  // ── Update a visual field (also regenerates html_body) ─────────────────────

  function setV<K extends keyof VisualFields>(key: K, value: VisualFields[K]) {
    setVisual(prev => {
      const next = { ...prev, [key]: value };
      setEditBody(buildEmailHTML(next));
      return next;
    });
    setDirty(true);
  }

  // ── Switch tabs ─────────────────────────────────────────────────────────────

  function switchTab(t: Tab) {
    if (t === 'visual') {
      // Regenerate html from visual fields when entering visual mode
      setEditBody(buildEmailHTML(visual));
    }
    setTab(t);
  }

  // ── Seed defaults ───────────────────────────────────────────────────────────

  async function seedDefaults() {
    setSeeding(true);
    const session = saGetSession();
    for (const def of DEFAULT_TEMPLATES) {
      await fetch('/api/sa/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...def, updated_by: session?.email ?? 'superadmin' }),
      });
    }
    await loadTemplates();
    setSeeding(false);
  }

  // ── Upload image ────────────────────────────────────────────────────────────

  async function uploadFile(file: File, field: 'logo_url' | 'image_url') {
    const setUploading = field === 'logo_url' ? setUploadingLogo : setUploadingImg;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res  = await fetch('/api/sa/email-assets', { method: 'POST', body: form });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) {
        setV(field, json.url);
      } else {
        alert(json.error ?? 'Error al subir imagen');
      }
    } catch {
      alert('Error de red al subir imagen');
    } finally {
      setUploading(false);
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveMsg('');
    const session = saGetSession();
    const def = DEFAULT_TEMPLATES.find(d => d.type === selected)!;
    const finalHtml = tab === 'visual' ? buildEmailHTML(visual) : editBody;

    const res = await fetch('/api/sa/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        selected,
        name:        def.name,
        description: def.description,
        subject:     editSubject,
        html_body:   finalHtml,
        variables:   def.variables,
        is_active:   editActive,
        updated_by:  session?.email ?? 'superadmin',
        heading:     visual.heading,
        body_text:   visual.body_text,
        cta_text:    visual.cta_text,
        cta_url:     visual.cta_url,
        image_url:   visual.image_url,
        logo_url:    visual.logo_url,
      }),
    });
    const json = await res.json() as { template?: DBTemplate; error?: string };
    if (json.error) {
      setSaveMsg(`Error: ${json.error}`);
    } else {
      setSaveMsg('Guardado ✓');
      setDirty(false);
      await loadTemplates();
      setTimeout(() => setSaveMsg(''), 3000);
    }
    setSaving(false);
  }

  // ── Restore default ─────────────────────────────────────────────────────────

  function handleRestore() {
    if (!selected) return;
    const def = DEFAULT_TEMPLATES.find(d => d.type === selected)!;
    const newVisual = { ...VISUAL_DEFAULTS };
    setEditSubject(def.subject);
    setEditBody(def.html_body);
    setEditActive(def.is_active);
    setVisual(newVisual);
    setDirty(true);
  }

  // ── Test send ───────────────────────────────────────────────────────────────

  async function handleTestSend() {
    if (!selected || !testEmail.trim()) return;
    setTestSending(true);
    setTestMsg('');
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selected, ...PREVIEW_VARS, to: testEmail.trim() }),
    });
    const json = await res.json() as { sent?: boolean; error?: string; reason?: string };
    if (json.sent) {
      setTestMsg(`✓ Email enviado a ${testEmail}`);
    } else if (json.reason === 'not_configured') {
      setTestMsg('⚠ Resend no está configurado (RESEND_API_KEY)');
    } else {
      setTestMsg(`Error: ${json.error ?? 'desconocido'}`);
    }
    setTestSending(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const selectedDef = selected ? DEFAULT_TEMPLATES.find(d => d.type === selected) : null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafafa' }}>

      {/* ── Left panel: template list ──────────────────────────────────────── */}
      <div style={{
        width: 280, background: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-.01em' }}>
            Templates de Email
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
            {dbTemplates.length} en Supabase · {DEFAULT_TEMPLATES.length} tipos
          </p>
        </div>

        {dbTemplates.length < DEFAULT_TEMPLATES.length && (
          <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
              {dbTemplates.length === 0
                ? 'Ningún template en Supabase.'
                : `${DEFAULT_TEMPLATES.length - dbTemplates.length} templates pendientes.`}{' '}
              Inicializá los defaults para empezar.
            </p>
            <button
              onClick={seedDefaults}
              disabled={seeding}
              style={{ ...btnBase, background: '#f59e0b', color: '#fff', opacity: seeding ? 0.6 : 1 }}
            >
              {seeding ? 'Inicializando...' : 'Inicializar defaults'}
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {DEFAULT_TEMPLATES.map(def => {
            const db       = dbTemplates.find(d => d.type === def.type);
            const isActive = db ? db.is_active : def.is_active;
            const isSel    = selected === def.type;
            return (
              <button
                key={def.type}
                onClick={() => selectTemplate(def.type)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  border: 'none', borderBottom: '1px solid #f3f4f6',
                  background:  isSel ? '#f0fdf4' : '#fff',
                  borderLeft:  isSel ? '3px solid #22c55e' : '3px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{TYPE_ICON[def.type] ?? '✉️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.3 }}>
                      {TYPE_LABELS[def.type] ?? def.name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                      background: isActive ? '#dcfce7' : '#f3f4f6',
                      color:      isActive ? '#166534' : '#9ca3af',
                      flexShrink: 0,
                    }}>
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {def.type}
                  </div>
                  {db && <div style={{ fontSize: 10, color: '#a3e635', marginTop: 2 }}>● En Supabase</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: editor ────────────────────────────────────────────── */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#9ca3af' }}>
          <span style={{ fontSize: 40 }}>✉️</span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Seleccioná un template para editar</p>
          <p style={{ margin: 0, fontSize: 13 }}>Los cambios se guardan en Supabase y se usan en el próximo envío</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{TYPE_ICON[selected] ?? '✉️'}</span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
                  {TYPE_LABELS[selected] ?? selected}
                </h2>
                {dirty && (
                  <span style={{ fontSize: 11, padding: '2px 8px', background: '#fef9c3', color: '#854d0e', borderRadius: 10, fontWeight: 600 }}>
                    Sin guardar
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
                {selectedDef?.description ?? ''}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {saveMsg && (
                <span style={{ fontSize: 12, color: saveMsg.startsWith('Error') ? '#dc2626' : '#166534', fontWeight: 600 }}>
                  {saveMsg}
                </span>
              )}
              <button onClick={() => setTestOpen(true)} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>
                Enviar prueba
              </button>
              <button onClick={handleRestore} style={{ ...btnBase, background: '#fef2f2', color: '#dc2626' }}>
                Restaurar default
              </button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnBase, background: '#111', color: '#c8f135', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ padding: '12px 28px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={editActive}
                onChange={e => { setEditActive(e.target.checked); setDirty(true); }}
                style={{ width: 16, height: 16, accentColor: '#22c55e' }}
              />
              Template activo (se usa al enviar este tipo de email)
            </label>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
            {(['visual', 'edit', 'preview'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  padding: '11px 20px', border: 'none', background: 'transparent',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color:        tab === t ? '#111' : '#9ca3af',
                  borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t === 'visual' ? 'Campos' : t === 'edit' ? 'HTML' : 'Vista Previa'}
              </button>
            ))}
          </div>

          {/* ── VISUAL tab ──────────────────────────────────────────────────── */}
          {tab === 'visual' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* Subject */}
              <div>
                <label style={fieldLabel}>Asunto del email</label>
                <input
                  value={editSubject}
                  onChange={e => { setEditSubject(e.target.value); setDirty(true); }}
                  style={inputStyle}
                  placeholder="Asunto del email..."
                />
              </div>

              {/* Logo */}
              <div>
                <label style={fieldLabel}>Logo (opcional)</label>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af' }}>
                  Aparece en la barra oscura del encabezado. Si lo dejás vacío se muestra el texto "PadelMGT".
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={visual.logo_url}
                    onChange={e => setV('logo_url', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="https://... o subí un archivo"
                  />
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'logo_url'); e.target.value = ''; }}
                  />
                  <button
                    onClick={() => logoFileRef.current?.click()}
                    disabled={uploadingLogo}
                    style={{ ...btnBase, background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap', opacity: uploadingLogo ? 0.6 : 1 }}
                  >
                    {uploadingLogo ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                </div>
                {visual.logo_url && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#0a0a0a', display: 'inline-block', borderRadius: 4 }}>
                    <img src={visual.logo_url} alt="Logo" style={{ height: 36, display: 'block' }} />
                  </div>
                )}
              </div>

              {/* Header image */}
              <div>
                <label style={fieldLabel}>Imagen de cabecera (opcional)</label>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af' }}>
                  Se muestra debajo del logo, antes del texto. Recomendado: 1200 × 400 px.
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={visual.image_url}
                    onChange={e => setV('image_url', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="https://... o subí un archivo"
                  />
                  <input
                    ref={imgFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'image_url'); e.target.value = ''; }}
                  />
                  <button
                    onClick={() => imgFileRef.current?.click()}
                    disabled={uploadingImg}
                    style={{ ...btnBase, background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap', opacity: uploadingImg ? 0.6 : 1 }}
                  >
                    {uploadingImg ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                </div>
                {visual.image_url && (
                  <img
                    src={visual.image_url}
                    alt="Header"
                    style={{ marginTop: 10, maxWidth: '100%', maxHeight: 160, display: 'block', border: '1px solid #e5e7eb', borderRadius: 4 }}
                  />
                )}
              </div>

              {/* Heading */}
              <div>
                <label style={fieldLabel}>Título principal (opcional)</label>
                <input
                  value={visual.heading}
                  onChange={e => setV('heading', e.target.value)}
                  style={inputStyle}
                  placeholder="Ej: Bienvenido a PadelMGT"
                />
              </div>

              {/* Body text */}
              <div>
                <label style={fieldLabel}>Texto del email</label>
                {selectedDef && selectedDef.variables.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '.06em', textTransform: 'uppercase', marginRight: 4 }}>Variables:</span>
                    {selectedDef.variables.map(v => (
                      <code
                        key={v}
                        onClick={() => setV('body_text', visual.body_text + `{{${v}}}`)}
                        title="Click para insertar al final"
                        style={{ fontSize: 11, padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace' }}
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                )}
                <textarea
                  value={visual.body_text}
                  onChange={e => setV('body_text', e.target.value)}
                  rows={8}
                  style={{
                    ...inputStyle, resize: 'vertical', lineHeight: 1.6,
                    fontFamily: 'inherit', fontSize: 14,
                  }}
                  placeholder={'Hola {{name}},\n\nEscribí el cuerpo del email acá.\n\nDoble enter = párrafo nuevo. Enter simple = salto de línea dentro del párrafo.'}
                />
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9ca3af' }}>
                  Doble enter = nuevo párrafo · Enter simple = salto de línea. Hacé click en una variable para insertarla.
                </p>
              </div>

              {/* CTA button */}
              <div style={{ padding: '20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                <label style={{ ...fieldLabel, marginBottom: 12 }}>Botón de acción (opcional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ ...fieldLabel, fontSize: 10 }}>Texto del botón</label>
                    <input
                      value={visual.cta_text}
                      onChange={e => setV('cta_text', e.target.value)}
                      style={inputStyle}
                      placeholder="VER MÁS"
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabel, fontSize: 10 }}>URL del botón</label>
                    <input
                      value={visual.cta_url}
                      onChange={e => setV('cta_url', e.target.value)}
                      style={inputStyle}
                      placeholder="https://padelmgt.com/dashboard"
                    />
                  </div>
                </div>
                {visual.cta_text && visual.cta_url && (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Preview del botón:</span>
                    <span style={{
                      display: 'inline-block', padding: '10px 24px', background: '#c8f135', color: '#111',
                      fontWeight: 700, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase',
                    }}>
                      {visual.cta_text}
                    </span>
                  </div>
                )}
              </div>

              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', padding: '0 0 8px' }}>
                Usá "Vista Previa" para ver cómo queda el email antes de guardar. El tab "HTML" permite editar el código directamente.
              </p>
            </div>
          )}

          {/* ── HTML tab ─────────────────────────────────────────────────────── */}
          {tab === 'edit' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={fieldLabel}>Asunto del email</label>
                <input
                  value={editSubject}
                  onChange={e => { setEditSubject(e.target.value); setDirty(true); }}
                  style={inputStyle}
                  placeholder="Asunto del email..."
                />
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9ca3af' }}>
                  Podés usar variables como {`{{name}}`} en el asunto.
                </p>
              </div>

              {selectedDef && (
                <div style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '.06em', textTransform: 'uppercase', marginRight: 4 }}>Variables:</span>
                  {selectedDef.variables.map(v => (
                    <code
                      key={v}
                      onClick={() => { setEditBody(b => b + `{{${v}}}`); setDirty(true); }}
                      title="Click para insertar al final"
                      style={{ fontSize: 11, padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace' }}
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              )}

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={fieldLabel}>Cuerpo HTML</label>
                <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, marginBottom: 8, fontSize: 11, color: '#92400e' }}>
                  Editando HTML directamente. Al volver al tab "Campos", el HTML se regenerará desde esos campos.
                </div>
                <textarea
                  value={editBody}
                  onChange={e => { setEditBody(e.target.value); setDirty(true); }}
                  spellCheck={false}
                  style={{
                    flex: 1, minHeight: 460, width: '100%', padding: '12px 14px',
                    border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    outline: 'none', resize: 'vertical', lineHeight: 1.6,
                    color: '#111', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Preview tab ──────────────────────────────────────────────────── */}
          {tab === 'preview' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f3f4f6' }}>
              <div style={{ padding: '10px 28px', background: '#fff', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
                Preview con datos de ejemplo. Asunto: <strong>{applyVars(editSubject, PREVIEW_VARS)}</strong>
              </div>
              <iframe
                ref={iframeRef}
                style={{ flex: 1, border: 'none', width: '100%' }}
                sandbox="allow-same-origin"
                title="Email preview"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Test send modal ─────────────────────────────────────────────────── */}
      {testOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setTestOpen(false); setTestMsg(''); } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div style={{ background: '#fff', borderRadius: 8, padding: '28px 32px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Enviar email de prueba</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
              Se enviará el template <strong>{TYPE_LABELS[selected!] ?? selected}</strong> con datos de ejemplo.
            </p>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
              Email destinatario
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="tu@email.com"
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            {testMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 4, marginBottom: 16, fontSize: 13, fontWeight: 600,
                background: testMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2',
                color:      testMsg.startsWith('✓') ? '#166534' : '#dc2626',
              }}>
                {testMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setTestOpen(false); setTestMsg(''); }} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>
                Cerrar
              </button>
              <button onClick={handleTestSend} disabled={testSending || !testEmail.trim()} style={{ ...btnBase, background: '#111', color: '#c8f135', opacity: testSending ? 0.7 : 1 }}>
                {testSending ? 'Enviando...' : 'Enviar prueba'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
