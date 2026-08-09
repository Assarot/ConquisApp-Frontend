# Manual de Integración API, Tecnologías y Diseño Web — Sistema de Gestión del Club de Conquistadores (Angular + Tailwind v4)

Este manual contiene las especificaciones y pautas para desarrollar el **apartado web (Frontend)** del sistema. Detalla el stack tecnológico basado en **Angular**, **Tailwind CSS v4** y **Flowbite**, la guía completa de endpoints de la API expuesta por el Backend Spring Boot, la explicación del comportamiento de los modelos y las pautas para un diseño moderno, interactivo y de estética premium.

---

## 1. Stack Tecnológico del Frontend

Para mantener consistencia con tus flujos de trabajo establecidos en *Ambientes Académicos (EnviromentUPEU)*, se utilizarán las siguientes tecnologías:

### A. Core y Tooling
*   **Angular (v17 o superior):** Framework para el desarrollo de la Single Page Application (SPA), usando modularidad por componentes y tipado seguro con TypeScript.
*   **TypeScript:** Mapeo tipado de todos los DTOs y respuestas JSON del backend.

### B. Comunicación y Estado
*   **HttpClient (`provideHttpClient`):** Para el consumo de los recursos de la API REST.
*   **HTTP Interceptors:** Para inyectar de manera transparente la cabecera `Authorization: Bearer <JWT_TOKEN>` en cada request HTTP y capturar códigos de error de sesión (401) para redirección.
*   **RxJS / Angular Signals:** Servicios inyectables reactivos para difundir el estado de sesión del usuario logueado (`usuario`, `token`, `idClub`, `rol`).

### C. Diseño de Interfaz y Estilos
*   **Tailwind CSS v4:** Motor de estilos utility-first integrado de forma nativa a través de directivas CSS (sin necesidad de archivo `tailwind.config.js`).
*   **Flowbite (v3.x):** Biblioteca de componentes interactivos (modals, dropdowns, sidebars, tablas, alertas) construida sobre Tailwind.
*   **SweetAlert2:** Para diálogos y alertas emergentes (modals de confirmación de eliminación o guardado exitoso).

---

## 2. Configuración e Integración en Angular

### A. Configuración de Estilos Globales (`src/styles.css`)
Para integrar Tailwind v4 y Flowbite en tu proyecto Angular, el archivo de estilos globales debe incluir las siguientes importaciones:

```css
/* src/styles.css */
@import "tailwindcss";
@import "flowbite/src/themes/default";
@plugin "flowbite/plugin";
@source "../node_modules/flowbite";

/* Colores personalizados del tema EcoQuest/Conquistadores */
:root {
  --color-primary-green: #14532d; /* HSL Verde bosque profundo */
  --color-accent-gold: #eab308;    /* HSL Oro conquistador */
  --color-dark-bg: #0b0f19;        /* Fondo oscuro Slate */
}

body {
  background-color: var(--color-dark-bg);
  color: #f3f4f6;
  font-family: 'Inter', sans-serif;
}
```

### B. Inicialización de Componentes de Flowbite (`app.component.ts`)
Para que los componentes dinámicos de Flowbite (dropdowns, colapsables de menú, modales) respondan correctamente en Angular al cambiar de rutas, debemos inicializarlos en la carga del componente raíz:

```typescript
import { Component, OnInit } from '@angular/core';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  ngOnInit(): void {
    initFlowbite(); // Inicializa listeners de comportamiento de Flowbite
  }
}
```

---

## 3. Guía de Endpoints de la API REST

Todas las peticiones deben incluir la cabecera `Authorization: Bearer <JWT_TOKEN>` (excepto login y registro).

### A. Módulo de Autenticación (`/api/v1/auth`)

*   **`POST /login`:** Inicia sesión.
    *   **Body:**
        ```json
        { "email": "usuario@club.com", "password": "contrasenaSecret" }
        ```
    *   **Response (200 OK):**
        ```json
        { "token": "eyJhbGciOiJIUzI1Ni...", "tokenType": "Bearer" }
        ```
*   **`POST /register`:** Registro de cuentas de líderes/miembros.
    *   **Body:**
        ```json
        {
          "nombre": "Esteban",
          "apellido": "Quito",
          "email": "esteban.quito@club.com",
          "password": "contrasenaSecret",
          "idClub": "uuid-club-conquistadores",
          "idRol": "uuid-rol-instructor"
        }
        ```
*   **`GET /me`:** Obtiene la cuenta del usuario logueado en la sesión.

---

### B. Módulo de Plan Operativo Anual (`/api/v1/poa`)

*   **`GET /club/{idClub}`:** Obtiene el historial de POAs anuales del club.
*   **`GET /{idPoa}/actividades`:** Obtiene las actividades planificadas para un POA.
*   **`POST /club/{idClub}?anio=2026`:** Inicializa el POA de un año.
*   **`POST /{idPoa}/actividades`:** Agrega una actividad al POA.
*   **`PUT /actividades/{idActividad}/fecha?nuevaFecha=2026-09-18`:** Reprograma una fecha.

---

### C. Módulo de Miembros (`/api/v1/miembros`)

*   **`GET /club/{idClub}`:** Obtiene todos los conquistadores y líderes del club.
*   **`POST /importar`:** Envío multipart de un archivo CSV para actualizar el padrón.
    *   **Params:** `file` (MultipartFile), `idClub` (String).

---

### D. Módulo de Avances y Asistencia (`/api/v1/avances` y `/api/v1/asistencias`)

*   **`GET /avances/miembro/{idMiembro}`:** Obtiene el avance del conquistador en cada requisito de su cuadernillo.
*   **`PUT /avances/{id}/correccion?nuevoEstado=COMPLETADO`:** Modifica el estado del avance.
*   **`POST /asistencias`:** Registra asistencia masiva para una sesión de clase.

---

## 4. Pautas de Diseño e Interfaz Web (Rich Aesthetics con Tailwind)

Para lograr un acabado de calidad Premium usando las utilidades de **Tailwind CSS v4**:

*   **Glassmorphism para Tarjetas y Paneles:**
    Combina utilidades de fondo semi-transparente, bordes y desenfoques:
    ```html
    <div class="bg-gray-900/70 backdrop-blur-md border border-gray-800 rounded-xl p-6 shadow-xl">
      <!-- Contenido -->
    </div>
    ```
*   **Paso de Estados (Pendientes) con Badges dinámicos de Flowbite:**
    *   *0 Pendientes (Apto):* Badge verde brillante (`bg-green-900/30 text-green-400 border border-green-800`).
    *   *1-2 Pendientes (Advertencia):* Badge amarillo (`bg-yellow-900/30 text-yellow-400 border border-yellow-800`).
    *   *3+ Pendientes (Crítico):* Badge rojo (`bg-red-900/30 text-red-400 border border-red-800`).
*   **Matriz de Calificaciones Interactiva:**
    *   Usa tablas de Flowbite (`relative overflow-x-auto shadow-md sm:rounded-lg`).
    *   Diseña las celdas de selección rápida como pequeños interruptores o botones que cambian de color instantáneamente al hacer clic (utilizando Angular bindings `[ngClass]`).

---

## 5. Dockerización del Frontend (Angular + Nginx)

Para empaquetar e implementar el frontend de manera aislada, crea los siguientes archivos en la raíz del directorio `Front/`:

### A. Dockerfile
```dockerfile
# Fase 1: Compilación
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production

# Fase 2: Servidor Web
FROM nginx:1.25-alpine
# Copiar estáticos (ajustar la ruta dist según el nombre de tu proyecto Angular)
COPY --from=build /app/dist/gestion-club/browser /usr/share/nginx/html
# Copiar archivo de configuración para soportar rutas de Angular Router
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### B. Archivo nginx.conf
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```
