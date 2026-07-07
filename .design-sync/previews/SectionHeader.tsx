import { SectionHeader, Button } from 'padelmgt-design-system';

export function Default() {
  return <SectionHeader eyebrow="Torneos destacados" title="Próximos eventos" />;
}

export function WithAction() {
  return (
    <SectionHeader
      eyebrow="Ranking"
      title="Top jugadores"
      subtitle="Los jugadores mejor posicionados esta temporada."
      action={<Button variant="secondary" href="#">Ver todos</Button>}
    />
  );
}
