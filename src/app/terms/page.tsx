import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — PadelMGT',
  description: 'Términos de uso de la plataforma PadelMGT.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos y Condiciones" updated="11 de junio de 2026">
      <p>
        Estos términos regulan el uso de PadelMGT (operado por Automatable). Al crear una cuenta o
        usar la plataforma, aceptás estas condiciones.
      </p>

      <h2>1. Uso de la plataforma</h2>
      <p>
        PadelMGT te permite crear y gestionar torneos, ligas y juegos de pádel, así como llevar tu
        ranking y conectar con otros jugadores. Te comprometés a usar el servicio de forma lícita y
        a no alterar resultados de forma fraudulenta.
      </p>

      <h2>2. Cuentas</h2>
      <p>
        Sos responsable de mantener la confidencialidad de tu cuenta y de toda la actividad que
        ocurra bajo ella. Debés proporcionar información veraz al registrarte.
      </p>

      <h2>3. Planes y pagos</h2>
      <p>
        Algunos planes son de pago. Los precios y límites de cada plan se muestran en la página de{' '}
        <a href="/pricing">Planes</a>. Las suscripciones se renuevan automáticamente salvo
        cancelación previa.
      </p>

      <h2>4. Contenido</h2>
      <p>
        El contenido que generás (resultados, perfiles, clubes sugeridos) sigue siendo tuyo, pero
        nos otorgás permiso para mostrarlo dentro de la plataforma con el fin de operar el servicio.
      </p>

      <h2>5. Limitación de responsabilidad</h2>
      <p>
        PadelMGT se ofrece "tal cual". No garantizamos disponibilidad ininterrumpida y no somos
        responsables de daños indirectos derivados del uso del servicio.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Para consultas sobre estos términos, escribinos a{' '}
        <a href="mailto:soporte@padelmgt.com">soporte@padelmgt.com</a>.
      </p>
    </LegalPage>
  );
}
