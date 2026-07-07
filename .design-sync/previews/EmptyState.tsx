import { EmptyState, Button } from 'padelmgt-design-system';

export function Default() {
  return (
    <EmptyState
      title="Sin ligas aún"
      description="Creá tu propia liga o unite a una existente, e indicaremos aquí tu rol en cada una."
      action={<Button href="#">Crear primera liga →</Button>}
    />
  );
}

export function WithoutAction() {
  return (
    <EmptyState
      title="Sin partidos programados"
      description="Cuando organices o te unas a un partido, va a aparecer acá."
    />
  );
}
