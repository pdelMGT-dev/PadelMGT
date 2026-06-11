import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Política de Privacidad — PadelMGT',
  description: 'Cómo PadelMGT recopila, usa y protege tus datos personales.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidad" updated="11 de junio de 2026">
      <p>
        En PadelMGT (operado por Automatable) nos tomamos en serio la privacidad de tus datos.
        Esta política explica qué información recopilamos, cómo la usamos y qué derechos tenés.
      </p>

      <h2>1. Información que recopilamos</h2>
      <ul>
        <li><strong>Datos de cuenta:</strong> nombre, email, país, ciudad y sexo que ingresás al registrarte.</li>
        <li><strong>Datos de juego:</strong> resultados de partidos, ranking, nivel y estadísticas generadas en la plataforma.</li>
        <li><strong>Datos técnicos:</strong> tipo de dispositivo y datos de uso para mejorar el servicio.</li>
      </ul>

      <h2>2. Cómo usamos tu información</h2>
      <ul>
        <li>Para crear y gestionar tu cuenta y tu perfil de jugador.</li>
        <li>Para calcular rankings, estadísticas y emparejamientos.</li>
        <li>Para comunicarte novedades relevantes sobre torneos y la plataforma.</li>
      </ul>

      <h2>3. Con quién compartimos</h2>
      <p>
        No vendemos tus datos personales. Solo compartimos información con proveedores que nos
        ayudan a operar la plataforma (por ejemplo, alojamiento y procesamiento de pagos), bajo
        acuerdos de confidencialidad.
      </p>

      <h2>4. Tus derechos</h2>
      <p>
        Podés acceder, corregir o eliminar tus datos en cualquier momento desde tu perfil, o
        escribiéndonos a <a href="mailto:soporte@padelmgt.com">soporte@padelmgt.com</a>.
      </p>

      <h2>5. Contacto</h2>
      <p>
        Para cualquier consulta sobre privacidad, escribinos a{' '}
        <a href="mailto:soporte@padelmgt.com">soporte@padelmgt.com</a>.
      </p>
    </LegalPage>
  );
}
