import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function TerminosPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 md:px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-black mb-2 font-headline">Términos de Uso</h1>
        <p className="text-muted-foreground text-sm mb-10">Última actualización: junio 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-bold mb-2">1. Aceptación de los términos</h2>
            <p>Al acceder y utilizar Turnify, aceptás estos Términos de Uso. Si no estás de acuerdo con alguna parte, no uses la plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Descripción del servicio</h2>
            <p>Turnify es una plataforma de gestión de turnos y reservas para profesionales independientes y negocios. Permite a los usuarios registrar su negocio, gestionar servicios, profesionales y recibir reservas de clientes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Uso del servicio</h2>
            <p>Te comprometés a usar Turnify de forma legal y responsable. Está prohibido:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Usar la plataforma para actividades ilegales o fraudulentas</li>
              <li>Compartir credenciales de acceso con terceros</li>
              <li>Intentar acceder a cuentas de otros usuarios</li>
              <li>Publicar contenido falso o engañoso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Cuentas de usuario</h2>
            <p>Sos responsable de mantener la confidencialidad de tu cuenta y contraseña. Cualquier actividad realizada desde tu cuenta es tu responsabilidad.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Disponibilidad del servicio</h2>
            <p>Nexary se esfuerza por mantener Turnify disponible las 24hs, pero no garantiza disponibilidad ininterrumpida. Podemos realizar mantenimientos o actualizaciones sin previo aviso.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Modificaciones</h2>
            <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a través de la plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">7. Contacto</h2>
            <p>Si tenés dudas sobre estos términos, contactanos por WhatsApp a través del botón de Soporte en el footer.</p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
