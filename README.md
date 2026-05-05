# TurnosYa - Sistema de Gestión de Citas Multi-Negocio

Esta es una plataforma completa para que profesionales y negocios gestionen sus turnos, servicios y clientes de forma independiente. Construida con Next.js 15, Tailwind CSS y Firebase.

## Características Principales

- **Multi-Tenant**: Cada negocio tiene su propio ID y link de reserva único.
- **Gestión de Servicios**: Configura nombres, precios y duraciones.
- **Gestión de Profesionales**: Administra tu equipo de trabajo.
- **Reserva en Tiempo Real**: Los clientes pueden agendar turnos basados en la disponibilidad real.
- **Dashboard de Administración**: Visualiza agendas, estadísticas y ajustes de negocio.

## Cómo levantar el servidor localmente

Si has exportado este código, sigue estos pasos para ejecutarlo en tu máquina:

### 1. Requisitos Previos
- Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).
- Tener una cuenta de [Firebase](https://firebase.google.com/) (opcional si ya usas la configuración incluida).

### 2. Instalación
En la raíz del proyecto, ejecuta el siguiente comando para instalar todas las dependencias necesarias:
```bash
npm install
```

### 3. Ejecución
Inicia el servidor de desarrollo:
```bash
npm run dev
```
El servidor se iniciará en [http://localhost:9002](http://localhost:9002).

## Estructura del Proyecto

- `src/app`: Rutas y páginas de la aplicación (App Router).
- `src/components`: Componentes de UI (usando ShadCN).
- `src/hooks`: Lógica personalizada para interactuar con Firebase (servicios, profesionales, turnos).
- `src/firebase`: Configuración y proveedores de Firebase.

## Despliegue

Este proyecto está preparado para ser desplegado en **Firebase App Hosting**. 

Para producción, asegúrate de configurar las variables de entorno de Firebase en tu proyecto de Google Cloud.
