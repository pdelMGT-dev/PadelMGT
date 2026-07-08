import { DashboardPageHeader, Button } from 'padelmgt-design-system';

export function Default() {
  return <DashboardPageHeader eyebrow="Competencias" title="Mis Ligas" />;
}

export function WithAction() {
  return (
    <DashboardPageHeader
      eyebrow="Competencias"
      title="Mis Ligas"
      action={<Button href="#">+ Crear Liga</Button>}
    />
  );
}
