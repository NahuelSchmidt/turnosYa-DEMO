import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 md:px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-black mb-2 font-headline">Política de Privacidad</h1>
        <p className="text-muted-foreground text-sm mb-10">Última actualización: junio 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-bold mb-2">1. Información que recopilamos</h2>
            <p>Al usar Turnify, podemos recopilar la siguiente información:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Datos del negocio:</strong> nombre, dirección, número de WhatsApp, servicios y profesionales registrados</li>
              <li><strong>Datos de clientes:</strong> nombre y número de teléfono de las personas que reservan turnos</li>
              <li><strong>Datos de uso:</strong> turnos reservados, fechas, horarios e ingresos registrados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Cómo usamos la información</h2>
            <p>Usamos los datos recopilados para:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Gestionar las reservas y turnos del negocio</li>
              <li>Enviar recordatorios automáticos por WhatsApp a los clientes</li>
              <li>Generar estadísticas y métricas para el negocio</li>
              <li>Mejorar el funcionamiento de la plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Compartir información</h2>
            <p>No vendemos ni compartimos tus datos personales con terceros. Los datos se utilizan exclusivamente para el funcionamiento del servicio.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Almacenamiento de datos</h2>
            <p>Los datos se almacenan de forma segura en Firebase (Google Cloud). Aplicamos medidas de seguridad estándar para proteger tu información.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Tus derechos</h2>
            <p>Tenés derecho a solicitar el acceso, corrección o eliminación de tus datos en cualquier momento. Para hacerlo, contactanos por WhatsApp a través del botón de Soporte en el footer.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Cookies</h2>
            <p>Turnify utiliza cookies técnicas necesarias para el funcionamiento de la plataforma, como mantener tu sesión iniciada. No usamos cookies de seguimiento publicitario.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">7. Contacto</h2>
            <p>Si tenés preguntas sobre esta política, contactanos por WhatsApp a través del botón de Soporte en el footer.</p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
