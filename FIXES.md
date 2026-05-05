# TurnosYa - Fixes Aplicados

## Bugs Corregidos

### 1. Anti doble-booking ✅
- `use-appointments.ts`: nueva función `getBookedSlotsForDate(professionalId, date)` que devuelve los horarios ya ocupados para un profesional en una fecha.
- `BookingFlow.tsx`: pasa `bookedSlots` al `TimeSlotPicker` y verifica antes de confirmar que el slot siga disponible.

### 2. TimeSlotPicker muestra slots ocupados ✅
- Los horarios ya reservados aparecen en gris tachado y deshabilitados.
- Punto rojo en la esquina del botón para indicar que está ocupado.
- Resetea el horario seleccionado cuando cambia la fecha o el profesional.

### 3. Métricas del Dashboard son datos reales ✅
- `StatsSection` en `dashboard/page.tsx` calcula métricas desde Firestore: ingresos totales, cantidad de turnos, clientes únicos (por teléfono), tasa de ocupación.
- Gráfico de tendencias con los últimos 6 meses reales.

### 4. UserAppointments sin hardcode ✅
- Ya no importa `adminUsers` (que tenía usuarios/contraseñas hardcodeadas).
- Muestra los turnos del `tenantId` que corresponde al usuario logueado.

### 5. Seguridad Firestore mejorada ✅
- Usuarios anónimos ya no pueden escribir en servicios o profesionales.
- Solo el admin del salón puede editar sus propios servicios/profesionales.
- Solo el cliente dueño del turno puede cancelar su propio turno.
- Separación entre usuarios anónimos y usuarios reales.

## Cómo deployar

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Actualizar Firestore Rules:**
   En Firebase Console → Firestore → Rules, pegá el contenido de `firestore.rules`

3. **Variables de entorno:**
   Creá `.env.local` con:
   ```
   # Las keys ya están en src/firebase/config.ts para desarrollo
   # Para producción, configuralas como variables de entorno en Vercel
   ```

4. **Correr en local:**
   ```bash
   npm run dev
   ```

5. **Build:**
   ```bash
   npm run build
   ```

## Próximos pasos sugeridos

- Integrar Mercado Pago real (reemplazar el setTimeout en register/page.tsx)
- Agregar notificaciones por email/WhatsApp automáticas (usando webhooks de Firebase Functions)
- Agregar bloqueo de días completos desde el panel del dueño
- Paginación en la agenda del super-admin cuando haya muchos negocios
