# PermisosScan — Arquitectura Actual

## Stack y dependencias

**Frontend (`client/`)**
- Angular `17.3.12` (paquetes `@angular/*` declarados en `^17.3.0`), Angular CLI `17.3.17`.
- TypeScript `5.4.5`, RxJS `7.8.2`, `zone.js ^0.14.3`.
- UI: **Tailwind CSS `3.4.19`** (con `autoprefixer` y `postcss`). No hay Angular Material, PrimeNG ni Bootstrap — todos los componentes usan clases utilitarias de Tailwind directamente en los templates, tema oscuro fijo (`bg-gray-950`, acentos `emerald`).
- Build: **Angular CLI** (`@angular-devkit/build-angular:application`, el nuevo builder basado en esbuild/Vite de Angular 17), no Vite ni Webpack configurado a mano. Salida en `client/dist/client`.
- Sin `angular.json` de rutas SCSS: los estilos son un único `src/styles.css` con directivas `@tailwind` y algunas utilidades custom (`bg-*-500/12`, `border-*-500/25`) para opacidades no generadas por Tailwind por defecto.

**Backend (`server/`)**
- Node.js (target de empaquetado `node18-win-x64`; el Node instalado en este entorno es `v24.18.0`, no verificado cuál usa el usuario final en producción).
- Express `4.22.1` (declarado `^4.18.2`), `cors 2.8.6`, `jsonwebtoken 9.0.3`, `uuid ^11.0.5` (IDs del Estructurador NAS).
- Sin ORM ni base de datos: persistencia 100% en archivos JSON en disco (ver sección Backend).

**Empaquetador**
- **`pkg`** (instalado globalmente vía `npm install -g pkg`, no es dependencia del proyecto). Config en `server/package.json`:
  - `"targets": ["node18-win-x64"]`
  - `"assets": ["../client/dist/client/browser/**/*"]` — embebe el build de Angular ya compilado dentro del `.exe`.
  - `"outputPath": "../"` → genera `PermisosScan.exe` en la raíz del proyecto.
  - Script: `npm run build:exe` → `pkg . --target node18-win-x64 --output ../PermisosScan.exe`.
- Flujo de construcción manual vía `CONSTRUIR_EXE.bat`: instala `pkg` global, instala deps de `server`, compila Angular (`npm run build` en `client`), y empaqueta.
- Distribución final: `PermisosScan.exe` + `ABRIR.bat` (el `.bat` solo lanza el exe y espera a que responda `http://localhost:7890`). `EJECUTAR.bat` es la variante para correr desde código fuente (sin exe): instala dependencias si faltan, compila Angular si falta el build, y arranca `node index.js`.

## Estructura de carpetas

```
permisos-scan/
├── client/                        Frontend Angular (SPA)
│   ├── src/app/
│   │   ├── core/                  Servicios, guards e interceptor transversales
│   │   ├── features/              Páginas/rutas (login, dashboard, historial, viewer, estructurador)
│   │   └── shared/                Componentes reutilizables entre features
│   ├── src/assets/                Estáticos servidos tal cual
│   ├── angular.json, tailwind.config.js, tsconfig.json, proxy.conf.json
│   └── dist/                      (build) — ignorado por git; lo generan EJECUTAR.bat y CONSTRUIR_EXE.bat
├── server/                        Backend Node/Express
│   ├── index.js                   API del lector de permisos, login, AD y lógica de scan
│   ├── estructurador.js           Módulo aislado del Estructurador NAS (registrado desde index.js)
│   ├── ad-groups.js               Datos AD hardcodeados de fallback (snapshot manual)
│   └── package.json               Deps + config de `pkg`
├── config/                        Config persistida en runtime
│   ├── ad-groups.json             Cache de grupos AD generada por el server (sobreescribe el fallback)
│   └── estructurador.json         Datos del Estructurador NAS (ignorado por git; se crea solo si no existe)
├── Permisos_Scan/                 Resultados de escaneos guardados como .json (uno por escaneo; ignorados por git)
├── setup/
│   └── instalar-node.ps1          Instalador automático de Node.js para el .bat
├── ABRIR.bat                      Lanza PermisosScan.exe (uso final, sin código fuente)
├── EJECUTAR.bat                   Lanza desde código fuente (instala deps/compila si falta)
├── CONSTRUIR_EXE.bat              Compila Angular + empaqueta con pkg → PermisosScan.exe
├── PermisosScan.exe               Ejecutable generado (binario, ignorado por git)
├── README.md                      Qué es la app, por qué existe y para qué sirve
├── GUIA_DE_USO.md                 Guía de uso y operación (instalación, pantallas, mantenimiento, problemas)
├── ARQUITECTURA_ACTUAL.md         Este documento
├── CONTEXTO_ESTRUCTURADOR_NAS_v2.md  Referencia del módulo Estructurador NAS
└── PermisosScan_Documentacion.pdf Versión PDF de ../PermisosScan_Documentacion.md (regenerada en octubre 2026)
```

**Nivel 2 relevante dentro de `client/src/app/`:**
```
core/
├── guards/       auth.guard.ts (CanActivateFn), auth.interceptor.ts (HttpInterceptorFn)
├── models/       models.ts — todas las interfaces TS del dominio
└── services/     auth.service.ts, scan.service.ts

features/
├── login/                    Formulario de login
├── dashboard/                Vista admin (protegida): sidebar, scan-modal, resultados
│   ├── sidebar/               Lista de unidades y escaneos guardados
│   └── scan-modal/            Modal de configuración/lanzamiento de un escaneo
├── historial/                 Listado público de escaneos guardados
├── results/                   Vista de resultados (usada por dashboard y viewer)
│   └── folder-tree/            Árbol de carpetas recursivo (se usa a sí mismo)
├── viewer/                    Vista de solo lectura de un escaneo (pública)
└── estructurador/             Módulo Estructurador NAS (independiente del lector de permisos,
                                 documentado en detalle en estructurador-nas.md)

shared/
├── group-members/    Miembros de un grupo AD (fetch propio vía HTTP)
├── perm-badge/        Badge de color según tipo de permiso
└── user-groups/       Grupos AD de un usuario (fetch propio vía HTTP)
```

## Backend

**Framework:** Express 4, un único archivo `server/index.js` (496 líneas) para el lector de permisos, más `server/estructurador.js` (557 líneas) para el Estructurador NAS; sin capas ni routers separados — todo el registro de rutas y lógica vive ahí.

**Endpoints REST existentes** (todos bajo `/api`, salvo el catch-all de SPA):

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/login` | No | Valida las credenciales configuradas en el equipo (`APP_USER`/`APP_PASS` o `config/credenciales.json`), devuelve JWT (expira en 8h) y dispara actualización de grupos AD en background. Bloquea 15 min tras 5 fallos por IP (429); sin administrador responde 503 |
| GET | `/api/setup/estado` | No | Indica si ya hay administrador y si esta petición puede crearlo (solo desde el propio equipo) |
| POST | `/api/setup` | No (solo `localhost`) | Asistente de primer uso: crea el administrador en `config/credenciales.json` (hash scrypt). 403 desde otra IP, 409 si ya existe |
| POST | `/api/cambiar-password` | Sí | Cambia la contraseña (pide la actual) y renueva el secreto JWT, cerrando las demás sesiones |
| GET | `/api/historial` | No | Lista archivos `.json` en `SCAN_DIR` con tamaño, fecha y label |
| GET | `/api/historial/:filename` | No | Devuelve el contenido completo de un escaneo guardado |
| DELETE | `/api/historial/:filename` | Sí | Elimina un archivo de escaneo guardado |
| GET | `/api/config` | No | Devuelve la ruta configurada de `SCAN_DIR` |
| GET | `/api/drives` | Sí | Lista unidades de red/locales vía PowerShell (`Get-PSDrive`) |
| POST | `/api/scan` | Sí | Ejecuta el escaneo de ACLs (PowerShell `Get-Acl` recursivo), guarda el resultado como JSON y lo devuelve |
| POST | `/api/quickscan` | Sí | Escaneo rápido (profundidad fija 3) solo para listar usuarios con acceso a una ruta, usado por el autocomplete del modal |
| GET | `/api/addata` | Sí | Devuelve `AD_USER_GROUPS` y `AD_GROUP_USERS` completos en memoria |
| POST | `/api/usergroups` | Sí | Grupos AD de un usuario (`sAMAccountName`) |
| POST | `/api/groupusers` | Sí | Miembros de un grupo AD |
| * | `/api/estructurador/*` | Sí | Módulo Estructurador NAS (Unidades/Áreas/Cargos/Procesos/Miembros), registrado desde `server/estructurador.js`. Endpoints detallados en [Estructurador NAS](./estructurador-nas.md) |
| GET | `*` | No | Sirve `index.html` del build de Angular (catch-all de SPA) |

**Organización del código:** no hay separación por capas ni por features; es un script único con: configuración de constantes → `loadADGroups`/`saveADGroups` → middlewares → handlers de ruta en orden de uso → `updateADGroups` (función standalone que llama LDAP) → `app.listen` → helper `runPS` al final del archivo (usado por `/api/drives`).

**Almacenamiento en JSON:**
- **`Permisos_Scan/*.json`** (ubicación: `SCAN_DIR`, por defecto `<raíz-proyecto>/Permisos_Scan`, configurable con env var `SCAN_DIR`): un archivo por escaneo ejecutado o re-ejecutado. Nombre generado como `{rutaLabel}_prof{N}_{usr-X|todos}_{fecha}_{admin}.json`. Esquema (ejemplo abreviado, tomado de un archivo real):
  ```json
  {
    "totalCarpetas": 9299,
    "totalRegistros": 24240,
    "errores": 25,
    "datos": [
      {
        "carpeta": "Z:\\",
        "nivel": 1,
        "usuario": "DOMINIO\\Admins. del dominio",
        "usuarioCorto": "Admins. del dominio",
        "tipo": "Control Total",
        "acceso": "Allow",
        "heredado": false
      }
    ],
    "ruta": "Z:\\",
    "profundidad": 4,
    "soloUsuario": "",
    "label": "Z_prof4_todos_2026-05-06_admin",
    "timestamp": "2026-05-06T..."
  }
  ```
- **`config/ad-groups.json`** (ubicación: `CONFIG_DIR`, por defecto `<raíz-proyecto>/config`): cache persistida de `{ AD_USER_GROUPS, AD_GROUP_USERS }` (mapas sam→grupos y grupo→sams). Se regenera automáticamente tras cada login (`updateADGroups`, con 2s de delay) y sobreescribe lo que haya. Si no existe al arrancar, se usa `server/ad-groups.js` como fallback estático y luego se persiste a este archivo. El módulo Estructurador NAS (`server/estructurador.js`) también **lee** este archivo (nunca lo escribe) para ofrecer la importación de personas reales de AD como Miembros.
- **`config/estructurador.json`**: datos propios del módulo Estructurador NAS (Unidades, Áreas, Cargos, Procesos, Miembros). Completamente aislado de los dos archivos anteriores. Ver [Estructurador NAS](./estructurador-nas.md) para el esquema completo.

**Integraciones externas:**
- **PowerShell:** no hay librería wrapper; se usa `child_process.spawn(PS_PATH, ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command', script], { timeout })` directamente, con `PS_PATH` resuelto a `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`. Los scripts se arman como texto dentro de JS, y los valores que vienen del usuario se pasan como variables de entorno con el helper `spawnPS` (ver "Riesgos y deuda técnica visible"). Se usa en: `/api/drives`, `/api/scan`, `/api/quickscan`, `runPS` (helper genérico) y `updateADGroups`. La salida se parsea limpiando caracteres de control y extrayendo la última línea que empieza con `{` o `[` antes de `JSON.parse`.
- **LDAP/Active Directory:** también vía PowerShell (no hay librería Node de LDAP). El script inyectado en `updateADGroups()` usa `[System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()` y `[ADSI]`/`DirectorySearcher` para recorrer usuarios (`objectClass=user`) y su atributo `memberOf`, reconstruyendo en el servidor los mapas usuario↔grupo. Se ejecuta automáticamente 2 segundos después de cada login exitoso.

## Frontend

**Estructura del "módulo" Angular:** el proyecto usa **standalone components** (sin `NgModule`); no hay `AppModule`. El bootstrap es `bootstrapApplication(AppComponent, appConfig)` en `main.ts`. `AppComponent` es solo un `<router-outlet />`.

- **Componentes principales:** `LoginComponent`, `DashboardComponent` (+ `SidebarComponent`, `ScanModalComponent`), `HistorialComponent`, `ViewerComponent`, `ResultsComponent` (+ `FolderTreeComponent` recursivo), y en `shared/`: `PermBadgeComponent`, `GroupMembersComponent`, `UserGroupsComponent`.
- **Servicios:** `AuthService` (login/logout, JWT en `sessionStorage`, expone `isAuth$`) y `ScanService` (estado central de escaneos vía `BehaviorSubject`s: `scans$`, `activeScanId$`, `loading$`; construye índices `byUser`/`byFolder`/`folderTree` en memoria a partir de la respuesta cruda del backend).

**Enrutamiento** (`app.config.ts`, `provideRouter`), **con lazy-loading** vía `loadComponent` en todas las rutas:
| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `HistorialComponent` | Pública |
| `/ver/:filename` | `ViewerComponent` | Pública (solo lectura) |
| `/login` | `LoginComponent` | Pública |
| `/admin` | `DashboardComponent` | Protegida por `authGuard` |
| `/estructurador` | `EstructuradorComponent` | Protegida por `authGuard` — módulo independiente, ver [Estructurador NAS](./estructurador-nas.md) |
| `**` | redirect a `/` | — |

**Estilos:** no hay SCSS ni preprocesador; un único `src/styles.css` con Tailwind (`@tailwind base/components/utilities`) más un puñado de utilidades custom con opacidad (`/12`, `/25`) definidas a mano porque Tailwind no las genera por defecto para esos colores. No hay archivo de "tema"/variables CSS (`:root { --... }`); los colores están hardcodeados como clases Tailwind repetidas en cada componente (p. ej. mapas `getBadgeClass`, `getAvatarColor` en varios componentes con paletas duplicadas).

**Comunicación con el backend:**
- `HttpClient` inyectado directamente en servicios (`AuthService`, `ScanService`) y también **directamente en varios componentes** (`DashboardComponent`, `ScanModalComponent`, `HistorialComponent`, `ViewerComponent`, `GroupMembersComponent`, `UserGroupsComponent`) — no todo pasa por `ScanService`.
- Un único interceptor funcional (`authInterceptor`): añade `Authorization: Bearer <token>` a toda request salvo `/login`, y en un 401 (excepto para `/api/historial`) hace `logout()` + redirect a `/login`.
- No hay un `environment.ts`/base URL configurable: las rutas son relativas (`/api/...`), dependiendo de que Angular y el backend se sirvan desde el mismo origen (en dev, vía `proxy.conf.json` → `http://localhost:7890`; en prod, el propio Express sirve el build de Angular como estático).

## Convenciones y estilo

- **Nombres de archivo:** kebab-case + sufijo de tipo (`scan.service.ts`, `auth.guard.ts`, `auth.interceptor.ts`, `folder-tree.component.ts`), siguiendo el esquema clásico de Angular CLI.
- **Nombres de clase:** PascalCase + sufijo (`ScanService`, `AuthGuard`... aunque los guards/interceptors modernos son funciones `camelCase` con sufijo `Fn`: `authGuard`, `authInterceptor`).
- **Componentes:** todos `standalone: true`, con `imports` explícitos de lo que usan (`CommonModule`, `FormsModule`, otros componentes). Algunos definen el template inline (`template: \`...\``, p. ej. `ScanModalComponent`, `SidebarComponent`, `ViewerComponent`, los de `shared/`); otros usan `templateUrl` a un `.html` separado (`DashboardComponent`, `ResultsComponent`, `HistorialComponent`, `LoginComponent`). No hay un criterio documentado de cuándo usar cada uno — en la práctica, los templates más largos están en `.html` aparte.
- **Estado en componentes:** uso consistente de Angular **signals** (`signal()`, `.set()`, `.update()`) para estado local de UI, combinado con **RxJS `BehaviorSubject`** para estado compartido en servicios (`ScanService`, `AuthService`).
- **Manejo de errores backend:** patrón repetido de `res.status(xxx).json({ error: '...' })`; en el frontend, patrón repetido `.subscribe({ next: ..., error: err => alert(...) })` o silenciado (`error: () => {}`) — no hay un manejador de errores centralizado ni un servicio de notificaciones/toast.
- **Logging backend:** `console.log`/`console.error` directos, sin librería de logging ni niveles; se redirige a `server/server.log` únicamente cuando se lanza vía `EJECUTAR.bat` (`node index.js > server.log 2>&1`).
- **Idioma:** todo el código de UI, mensajes de error y nombres de variables de dominio están en **español** (`ruta`, `soloUsuario`, `usuarioCorto`, `carpeta`); los nombres técnicos (servicios, tipos, métodos de framework) en inglés.

## Puntos de extensión detectados

- **Nueva ruta/página:** agregar una entrada en el arreglo de `provideRouter([...])` en `client/src/app/app.config.ts` con `loadComponent` — el patrón de lazy-loading ya está establecido, solo hay que decidir si va protegida por `authGuard` o pública.
- **Nuevo item de menú/acción en el dashboard:** el header de `dashboard.component.html` (líneas ~36-59) y el sidebar en `sidebar.component.ts` son los puntos naturales para añadir botones/entradas de navegación sin tocar lógica existente.
- **Nuevo endpoint backend:** seguir el patrón de handlers en `server/index.js` (con o sin `authMiddleware`) — no hay router modular, así que un nuevo endpoint es simplemente otra llamada `app.get/post(...)` en el mismo archivo, en la línea que corresponda por tema.
- **Nuevo servicio de datos frontend:** `ScanService` en `scan.service.ts` ya centraliza estado con `BehaviorSubject` + método `buildIndices`; un módulo nuevo con su propio estado podría replicar ese patrón como servicio independiente (`providedIn: 'root'`) sin modificar el existente.
- **Nuevo tipo de vista de resultados:** `ResultsComponent` ya soporta un `readOnly` flag para reusarse entre `DashboardComponent` (admin) y `ViewerComponent` (público); una tercera vista podría enganchar el mismo componente pasando ese input.
- **Grupos AD / permisos:** `AD_USER_GROUPS`/`AD_GROUP_USERS` en memoria del server y expuestos por `/api/addata` son el punto de entrada si un módulo nuevo necesita cruzar datos con AD, sin necesidad de tocar la lógica de escaneo de ACLs.

## Riesgos y deuda técnica visible

- **Versiones del `.exe` anteriores a octubre 2026:** deben reemplazarse por un `.exe` nuevo y crear una contraseña nueva. El código actual ya no contiene credenciales (se crean por equipo con el asistente de primer uso en `config/credenciales.json` con hash scrypt, o con `APP_USER`/`APP_PASS`; el secreto JWT es aleatorio por arranque o se fija con `APP_JWT_SECRET`).
- **Scripts de PowerShell armados como texto:** los datos del navegador viajan como variables de entorno `PS_*` mediante el helper `spawnPS` de `server/index.js`, pero el resto de cada script sigue siendo un texto grande dentro de JS. Cualquier script nuevo que reciba datos del usuario debe usar `spawnPS` y nunca insertarlos en el texto del script.
- **Sin base de datos ni bloqueo de escritura en el lector de permisos:** el "almacenamiento" son archivos JSON sueltos en `Permisos_Scan/` y `config/ad-groups.json`, sin locks — dos requests concurrentes de escaneo/actualización AD podrían pisarse escrituras (`fs.writeFileSync`). El Estructurador NAS sí serializa sus escrituras (`writeChain`).
- **`config/ad-groups.json` versionado en git pero reescrito en cada login:** la sincronización con AD lo regenera completo, así que cada login deja cambios pendientes en git. En una prueba de octubre 2026 la sincronización devolvió bastantes menos usuarios que la versión guardada; no se investigó si es normal o si la consulta LDAP está trayendo menos de lo esperado.
- **Endurecimiento de red pendiente:** hay recomendaciones abiertas sobre el acceso de red al servidor y sobre qué consultas pueden hacerse sin sesión. Ver la sección de seguridad de la [documentación técnica](./documentacion.md); el detalle está en la documentación interna del área de Sistemas.
- **`ScanService.getADGroupUsers()` y `getADUserGroups()`** (`scan.service.ts:365-374`) están sin implementar — devuelven `[]` siempre pese a ser llamados desde `ResultsComponent` (`isGroup`, `getGroupMembers`, `getUserGroupNames`); es código muerto/incompleto que puede confundir a quien lo extienda.
- **Duplicación de lógica de escaneo:** `/api/scan` y `/api/quickscan` en `server/index.js` tienen scripts PowerShell casi idénticos (recorrido de ACLs) con profundidad y campos distintos, sin factorizar.
- **Duplicación de paletas de color** entre `PermBadgeComponent`, `FolderTreeComponent` y `ResultsComponent` (cada uno define su propio mapa `tipo → clases Tailwind`) — cambiar un color de permiso requiere tocar varios archivos.
- **Sin tests:** no se encontró carpeta `spec`, configuración de Jasmine/Karma/Jest activa, ni scripts `test` funcionales en ninguno de los dos `package.json`. No verificado si existía configuración de testing eliminada.
- **Timeout de escaneo muy alto:** `/api/scan` usa `timeout: 1800000` (30 min) para el proceso de PowerShell sin mecanismo de cancelación desde el frontend ni feedback de progreso incremental — un escaneo grande deja al usuario con una barra de carga indeterminada.
- **Presupuesto de build ajustado:** `angular.json` define budgets de `500kB`/`1MB` para el bundle inicial; con Tailwind + más features nuevas esto podría empezar a fallar el build en `production` si se agregan dependencias pesadas.
- **Node 18 como target de empaquetado** (`pkg . --target node18-win-x64`) mientras el entorno de desarrollo tiene Node `v24.18.0` instalado — no verificado si hay incompatibilidades reales, pero es una divergencia de versión entre dev y el runtime empaquetado que vale la pena vigilar.
