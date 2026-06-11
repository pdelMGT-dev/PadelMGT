import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Política de Cookies — PadelMGT',
  description: 'Cómo PadelMGT usa cookies y almacenamiento local.',
};

export default function CookiesPage() {
  return (
    <LegalPage title="Política de Cookies" updated="11 de junio de 2026">
      <p>
        PadelMGT utiliza cookies y almacenamiento local del navegador para que la plataforma
        funcione correctamente y para recordar tu sesión.
      </p>

      <h2>1. Cookies esenciales</h2>
      <p>
        Usamos cookies de sesión para mantenerte autenticado mientras navegás. Sin ellas, no podrías
        iniciar sesión ni usar las funciones de tu cuenta.
      </p>

      <h2>2. Almacenamiento local</h2>
      <p>
        Guardamos cierta información en el almacenamiento local de tu navegador (como tus
        preferencias y datos de juego en caché) para una experiencia más rápida. Esta información no
        se comparte con terceros.
      </p>

      <h2>3. Cómo gestionarlas</h2>
      <p>
        Podés borrar las cookies y el almacenamiento local desde la configuración de tu navegador en
        cualquier momento. Tené en cuenta que esto cerrará tu sesión.
      </p>

      <h2>4. Contacto</h2>
      <p>
        Para consultas sobre cookies, escribinos a{' '}
        <a href="mailto:soporte@padelmgt.com">soporte@padelmgt.com</a>.
      </p>
    </LegalPage>
  );
}
