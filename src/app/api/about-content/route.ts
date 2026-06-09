import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_TEAM = [
  { name: 'Martín Rodríguez', role: 'CEO & Co-Founder', country: '🇦🇷', bio: 'Ex-jugador profesional y fanático del pádel. Fundó PadelMGT para resolver los problemas que vivió como organizador.' },
  { name: 'Valentina Cruz', role: 'CTO & Co-Founder', country: '🇨🇴', bio: 'Ingeniera de software con 10 años de experiencia en plataformas deportivas a escala.' },
  { name: 'Diego Morales', role: 'Head of Product', country: '🇲🇽', bio: 'Diseñador y estratega de producto. Obsesionado con la experiencia de usuario en deportes.' },
  { name: 'Ana Fernández', role: 'Head of Growth', country: '🇨🇱', bio: 'Especialista en crecimiento de comunidades deportivas en América Latina.' },
];

const DEFAULT_MILESTONES = [
  { year: '2023', event: 'Fundación de PadelMGT en Buenos Aires con el primer torneo piloto.' },
  { year: '2024', event: 'Lanzamiento público. 1,000 jugadores registrados en el primer mes.' },
  { year: '2025', event: 'Expansión a 8 países de América Latina y España.' },
  { year: '2026', event: 'Más de 12,400 jugadores activos y 380 clubes en la plataforma.' },
];

export const revalidate = 300;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    return NextResponse.json({ team: DEFAULT_TEAM, milestones: DEFAULT_MILESTONES });
  }

  try {
    const sb = createClient(url, key);
    const { data } = await sb
      .from('platform_config')
      .select('value')
      .eq('key', 'about_content')
      .maybeSingle();

    const content = data?.value as { team?: typeof DEFAULT_TEAM; milestones?: typeof DEFAULT_MILESTONES } | null;
    return NextResponse.json({
      team: content?.team ?? DEFAULT_TEAM,
      milestones: content?.milestones ?? DEFAULT_MILESTONES,
    });
  } catch {
    return NextResponse.json({ team: DEFAULT_TEAM, milestones: DEFAULT_MILESTONES });
  }
}
