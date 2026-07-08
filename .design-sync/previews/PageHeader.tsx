import { PageHeader } from 'padelmgt-design-system';

export function Default() {
  return <PageHeader title="Torneos" subtitle="Encontrá y competí en los mejores torneos de pádel cerca tuyo." />;
}

export function TitleOnly() {
  return <PageHeader title="Ranking" />;
}
