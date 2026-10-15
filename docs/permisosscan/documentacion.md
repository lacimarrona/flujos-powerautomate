# PermisosScan v2.0 — Documentación Técnica y Manual de Usuario

> Herramienta de auditoría de permisos NTFS en carpetas de red Windows, con un módulo adicional (**Estructurador NAS**) para registrar la estructura organizacional de la empresa.
> Stack: **Node.js 18 + Express** · **Angular 17** · **PowerShell** · Empaquetado con **pkg**
>
> Para una introducción corta (qué es, por qué existe y para qué sirve), ver el [resumen](./index.md). El detalle del Estructurador NAS está en [Estructurador NAS](./estructurador-nas.md).

---

## 1. Visión General del Proyecto

PermisosScan es una aplicación web local que corre en Windows. Su función es auditar los permisos NTFS de carpetas en unidades de red, respondiendo preguntas como:

- ¿Qué carpetas puede ver o modificar el usuario `jperez`?
- ¿Quién tiene Control Total sobre `\\servidor\finanzas`?
- ¿Ese acceso viene de forma directa o a través de un grupo de Active Directory?

La aplicación se distribuye como un único archivo ejecutable (`PermisosScan.exe`) que no requiere instalación de ningún tipo en el equipo destino. Al ejecutarse, arranca un servidor web local en el puerto 7890 y abre el navegador automáticamente.

Además del lector de permisos, la aplicación incluye el **Estructurador NAS** (ruta `/estructurador`): un registro interno del mapa organizacional (Unidades → Áreas → Cargos → Procesos → Miembros). Comparte login, servidor y empaquetado con el lector de permisos, pero sus datos y su lógica son independientes (ver sección 4.8).

### Decisiones de diseño importantes

Entender estas decisiones ayuda a mantener y extender el proyecto correctamente:

**Backend concentrado en pocos archivos:** El lector de permisos vive en un único archivo (`server/index.js`) para simplificar el empaquetado con `pkg`. El Estructurador NAS se agregó como un módulo aparte (`server/estructurador.js`) que `index.js` registra con `registerEstructuradorRoutes(app, authMiddleware)`; `pkg` lo incluye solo porque sigue los `require()`.

**Frontend servido por Express:** No hay un servidor de frontend separado en producción. Express sirve los archivos estáticos de Angular y la API REST en el mismo proceso y puerto. En desarrollo, Angular CLI corre en el 4200 y usa un proxy para redirigir `/api/*` al 7890.

**PowerShell como motor de escaneo:** En vez de usar librerías de Node.js para leer ACLs NTFS, se genera y ejecuta un script PowerShell dinámicamente. Esto da acceso completo a las APIs de Windows (`Get-Acl`, `DirectoryServices`) sin dependencias adicionales, pero significa que la aplicación solo funciona en Windows.

**Estado en memoria en el frontend:** Los escaneos cargados en el dashboard viven en `BehaviorSubject` dentro de `ScanService`. Al recargar la página, la sesión se pierde (solo el token JWT persiste en `sessionStorage`). Los escaneos permanentes están en los archivos JSON de `Permisos_Scan/`.

---

## 2. Arquitectura del Sistema

La arquitectura es una SPA (Single Page Application) Angular consumiendo una API REST de Express, que a su vez delega el trabajo real a PowerShell.

### Capas de la aplicación

**Capa de presentación (Angular 17):**
Corre en el navegador. Se comunica exclusivamente vía HTTP con la API REST. Toda la lógica de visualización, filtrado y construcción de índices de búsqueda ocurre en el cliente, sin llamadas adicionales al servidor después de recibir los datos del escaneo.

**Capa de API (Express + Node.js 18):**
Valida autenticación JWT, orquesta las operaciones y gestiona el sistema de archivos local. Para operaciones que requieren acceso a Windows (leer ACLs, detectar unidades, consultar LDAP), delega a PowerShell.

**Capa de ejecución del sistema (PowerShell):**
Scripts generados dinámicamente por Node.js y ejecutados con `child_process.spawn()`. El resultado se emite como JSON a `stdout` y Node.js lo parsea. PowerShell tiene acceso nativo a las APIs de Windows necesarias para leer permisos NTFS y consultar Active Directory.

**Capa de persistencia (Sistema de archivos):**
Los escaneos se guardan como archivos JSON en la carpeta `Permisos_Scan/`. El caché de grupos AD se guarda en `config/ad-groups.json` y los datos del Estructurador NAS en `config/estructurador.json`. No hay base de datos.

### Comunicación entre capas

```
Navegador (Angular)
      |
      | HTTP REST + JWT
      |
Express (Node.js)  <-->  Sistema de Archivos (Permisos_Scan/, config/)
      |
      | child_process.spawn()
      |
PowerShell  <-->  Windows NTFS / Active Directory (LDAP)
```

### Flujo de inicio de la aplicación

Cuando el usuario hace doble clic en `ABRIR.bat`:

1. `ABRIR.bat` verifica si ya hay algo respondiendo en el puerto 7890. Si sí, abre el navegador directamente. Si no, ejecuta `PermisosScan.exe` en segundo plano y espera hasta 30 segundos a que responda.
2. El `.exe` inicia Express en el puerto 7890, crea las carpetas `Permisos_Scan/` y `config/` si no existen, y carga los grupos AD desde `config/ad-groups.json`.
3. El navegador carga `http://localhost:7890`, que sirve el `index.html` de Angular.
4. Angular arranca y el Router navega a la ruta activa (por defecto `/`, el historial).

---

## 3. Estructura de Directorios

```
permisos-scan/                     <- Carpeta raíz del proyecto
|
|-- ABRIR.bat                      <- Lanzador para distribucion (usa el .exe)
|-- EJECUTAR.bat                   <- Lanzador para desarrollo (usa node directamente)
|-- CONSTRUIR_EXE.bat              <- Script para generar el ejecutable portable
|-- PermisosScan.exe               <- Ejecutable final (generado, no se edita, ignorado por git)
|-- README.md                      <- Que es la app, por que existe y para que sirve
|-- GUIA_DE_USO.md                 <- Guia de uso y operacion para el equipo de Sistemas
|-- ARQUITECTURA_ACTUAL.md         <- Resumen tecnico de la arquitectura
|-- CONTEXTO_ESTRUCTURADOR_NAS_v2.md <- Referencia del modulo Estructurador NAS
|
|-- Permisos_Scan/                 <- CREADO EN RUNTIME: escaneos guardados (ignorado por git)
|   |-- Z_prof4_todos_2026-05-04_admin.json
|   |-- Z_prof4_usr-jperez_2026-05-04_admin.json
|   `-- ...
|
|-- config/                        <- CREADO EN RUNTIME: configuracion persistente
|   |-- ad-groups.json             <- Cache de grupos/usuarios de Active Directory
|   `-- estructurador.json         <- Datos del Estructurador NAS (ignorado por git)
|
|-- server/                        <- TODO EL BACKEND AQUI
|   |-- index.js                   <- Punto de entrada del servidor y lector de permisos
|   |-- estructurador.js           <- Modulo Estructurador NAS (rutas /api/estructurador/*)
|   |-- ad-groups.js               <- Fallback estatico de grupos AD (sin LDAP)
|   |-- package.json               <- Dependencias y config de pkg
|   `-- server.log                 <- Log de ejecucion (generado en runtime)
|
|-- client/                        <- FRONTEND ANGULAR
|   |-- angular.json               <- Config del Angular CLI
|   |-- tailwind.config.js         <- Config de Tailwind CSS
|   |-- tsconfig.json              <- Config de TypeScript
|   |-- proxy.conf.json            <- Proxy dev: /api -> localhost:7890
|   |-- package.json               <- Dependencias de Angular
|   |-- dist/                      <- BUILD COMPILADO (incluido en el .exe, ignorado por git)
|   `-- src/
|       |-- index.html             <- Punto de entrada HTML
|       |-- main.ts                <- Bootstrap de Angular
|       |-- styles.css             <- Estilos globales + Tailwind base
|       `-- app/
|           |-- app.component.ts   <- Componente raiz (solo <router-outlet>)
|           |-- app.config.ts      <- Routing, providers e interceptores globales
|           |
|           |-- core/              <- Nucleo de la aplicacion (sin UI)
|           |   |-- guards/
|           |   |   |-- auth.guard.ts        <- Protege /admin
|           |   |   `-- auth.interceptor.ts  <- Inyecta Bearer token en cada request
|           |   |-- models/
|           |   |   `-- models.ts            <- TODAS las interfaces TypeScript
|           |   `-- services/
|           |       |-- auth.service.ts      <- Login, logout, gestion del token
|           |       `-- scan.service.ts      <- Estado global de escaneos
|           |
|           |-- features/          <- Pantallas de la aplicacion
|           |   |-- login/
|           |   |   |-- login.component.ts
|           |   |   `-- login.component.html
|           |   |-- historial/
|           |   |   |-- historial.component.ts
|           |   |   `-- historial.component.html
|           |   |-- dashboard/
|           |   |   |-- dashboard.component.ts   <- Panel de admin principal
|           |   |   |-- dashboard.component.html
|           |   |   |-- scan-modal/              <- Modal de nuevo escaneo
|           |   |   |   `-- scan-modal.component.ts
|           |   |   `-- sidebar/                 <- Lista de escaneos abiertos
|           |   |       `-- sidebar.component.ts
|           |   |-- results/
|           |   |   |-- results.component.ts     <- Visualizador de resultados
|           |   |   |-- results.component.html
|           |   |   `-- folder-tree/             <- Arbol recursivo de carpetas
|           |   |       `-- folder-tree.component.ts
|           |   |-- viewer/
|           |   |   `-- viewer.component.ts      <- Visor publico (sin login)
|           |   `-- estructurador/               <- Modulo Estructurador NAS (ver seccion 4.8)
|           |       |-- estructurador.component.ts / .html
|           |       |-- services/estructurador.service.ts
|           |       |-- models/estructurador.models.ts
|           |       `-- components/              <- Cards, modales y barra de busqueda
|           |
|           `-- shared/            <- Componentes reutilizables
|               |-- perm-badge/
|               |   `-- perm-badge.component.ts  <- Badge de color por tipo permiso
|               |-- group-members/
|               |   `-- group-members.component.ts <- Miembros de un grupo AD
|               `-- user-groups/
|                   `-- user-groups.component.ts   <- Grupos AD de un usuario
|
`-- setup/
    `-- instalar-node.ps1          <- Instalador automatico de Node.js
```

---

## 4. Backend — Servidor Node.js

El backend del lector de permisos está concentrado en `server/index.js` (unas 500 líneas): configuración, middlewares, los endpoints REST, el motor de escaneo PowerShell, la integración LDAP y la función auxiliar de inicio. El Estructurador NAS vive aparte en `server/estructurador.js` (sección 4.8).

### Dependencias del servidor

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^11.0.5"
  }
}
```

Solo cuatro dependencias externas (`uuid` la usa el Estructurador para generar IDs). Node.js nativo (`fs`, `path`, `child_process`) hace el resto.

### 4.1 Configuración y Variables de Entorno

El código **no contiene credenciales ni secretos**. Cada equipo configura los suyos:

| Qué | Dónde se configura | Si no se configura |
|---|---|---|
| Usuario y contraseña de administrador | El **asistente de primer uso** (pantalla "Configurar administrador"), que crea `config/credenciales.json`. Alternativa: variables de entorno `APP_USER` y `APP_PASS` | El login responde 503 y la app ofrece el asistente, solo desde el propio equipo |
| Secreto de las sesiones (JWT) | Variable de entorno `APP_JWT_SECRET` (opcional) | Se genera uno aleatorio en cada arranque |
| Carpeta de escaneos | Variable de entorno `SCAN_DIR` (opcional) | `Permisos_Scan/` junto al `.exe` o a la raíz del proyecto |

**`config/credenciales.json`** (en `.gitignore`; nunca se sube al repositorio) guarda la contraseña como hash `scrypt` con sal aleatoria, nunca en texto plano:

```json
{ "usuario": "nombre-de-usuario", "salt": "…", "hash": "…" }
```

- Lo escribe la propia app: al crear el administrador (`POST /api/setup`) y al cambiar la contraseña (`POST /api/cambiar-password`). No hace falta editarlo a mano.
- Si al arrancar encuentra un archivo antiguo con `{ "usuario", "password" }` en texto plano, lo convierte a hash automáticamente.
- **Olvido de contraseña:** detener la app, borrar el archivo y volver a abrirla en ese equipo; reaparece el asistente. No se pierden escaneos ni datos del Estructurador.
- Si existen las variables `APP_USER` y `APP_PASS`, tienen prioridad sobre el archivo, y la contraseña ya no se puede cambiar desde la app.

**Por qué el asistente solo funciona desde el propio equipo:** mientras no exista administrador, quien lo cree se queda con la cuenta. El servidor solo acepta `/api/setup` si la conexión viene de `127.0.0.1`/`::1`; mira la dirección real del socket, no cabeceras que se puedan falsificar. Desde otro equipo responde 403, y la pantalla de login muestra "La aplicación aún no está configurada". Una vez creado el administrador, `/api/setup` responde 409: nadie puede reemplazarlo desde la app.

Como el secreto JWT es aleatorio por arranque, **reiniciar el servidor cierra todas las sesiones abiertas** y hay que volver a iniciar sesión. Si se quiere que las sesiones sobrevivan a un reinicio, se puede fijar `APP_JWT_SECRET` con un texto largo y aleatorio propio de cada equipo. Al cambiar la contraseña, el secreto se renueva, de modo que se cierran las sesiones abiertas en otros navegadores.

El paso a paso para el usuario está en la sección 11.1.

### 4.2 Rutas Dinámicas: pkg vs modo dev

Este es un detalle crítico para entender cómo funciona el ejecutable. Cuando `pkg` empaqueta el código, el ejecutable corre con `process.pkg` definido. El código lo detecta para usar las rutas correctas:

```javascript
const BASE_DIR = process.pkg
  ? path.dirname(process.execPath)   // Directorio donde vive el .exe
  : path.join(__dirname, '..');      // Directorio raiz del proyecto (dev)

const SCAN_DIR   = process.env.SCAN_DIR || path.join(BASE_DIR, 'Permisos_Scan');
const CONFIG_DIR = path.join(BASE_DIR, 'config');
const AD_GROUPS_FILE = path.join(CONFIG_DIR, 'ad-groups.json');

// Los archivos estaticos de Angular siempre en la misma ruta relativa
const staticPath = path.join(__dirname, '../client/dist/client/browser');
```

**En modo dev:** `BASE_DIR` apunta a la raíz del repo (un nivel arriba de `server/`), así que `Permisos_Scan/` y `config/` quedan junto a las carpetas `server/` y `client/`.

**En modo .exe:** `BASE_DIR` es el directorio donde se colocó el `.exe`, así que `Permisos_Scan/` y `config/` quedan junto al ejecutable. Esto permite mover el `.exe` a cualquier carpeta y los datos lo siguen.

**Los archivos estáticos de Angular** (`dist/`) están _embebidos dentro del binario_ por `pkg`. La ruta `__dirname` dentro del ejecutable apunta al directorio virtual interno del binario, no al sistema de archivos real.

### 4.3 API REST — Todos los Endpoints

#### GET /api/setup/estado

- **Acceso:** Público
- **Respuesta:** `{ "configurado": bool, "puedeConfigurar": bool, "puedeCambiarPassword": bool }`. `puedeConfigurar` solo es `true` si no hay administrador **y** la petición viene del propio equipo. La usan el login (para mostrar el asistente), el historial (para redirigir al asistente en el primer uso) y el dashboard (para mostrar el botón de cambiar contraseña).

#### POST /api/setup

Crea el administrador en el primer uso y deja la sesión iniciada.

- **Acceso:** Público, pero **solo desde el propio equipo** (403 desde otra IP) y **solo si aún no hay administrador** (409 si ya existe).
- **Body:** `{ "usuario": "<usuario>", "password": "<mínimo 8 caracteres>" }` (400 si no cumple).
- **Respuesta (200):** igual que `/api/login` (`{ token, usuario }`).

#### POST /api/cambiar-password

- **Acceso:** Requiere JWT.
- **Body:** `{ "actual": "...", "nueva": "<mínimo 8 caracteres>" }`
- **Respuestas:**
  - 200 `{ token }`: token nuevo para esta sesión; se cierran las demás.
  - 403: contraseña actual incorrecta. Se usa 403 y no 401 porque el interceptor del frontend cierra la sesión ante un 401.
  - 400: la contraseña nueva no cumple el mínimo.
  - 409: las credenciales vienen de `APP_USER`/`APP_PASS`.

#### POST /api/login

Autentica al usuario y devuelve un JWT válido por 8 horas.

- **Acceso:** Público
- **Body:** `{ "usuario": "<usuario>", "password": "<contraseña>" }`
- **Respuesta exitosa (200):** `{ "token": "eyJ...", "usuario": "Administrador" }`
- **Respuesta fallida (401):** `{ "error": "Credenciales incorrectas" }`
- **Bloqueo (429):** tras 5 intentos fallidos desde la misma IP, el login se bloquea durante 15 minutos, aunque luego se use la contraseña correcta.
- **Sin administrador (503):** `{ error, sinConfigurar: true }`. La pantalla de login muestra entonces el asistente de primer uso.
- La comparación de usuario y contraseña se hace en tiempo constante.
- **Side effect:** Lanza `updateADGroups()` en background 2 segundos después del login exitoso, para mantener el caché AD actualizado sin bloquear la respuesta.

#### GET /api/historial

Lista todos los escaneos guardados en `Permisos_Scan/`.

- **Acceso:** Público (no requiere token)
- **Respuesta:** Array de objetos ordenados por fecha descendente:

```json
[
  {
    "filename": "Z_prof4_todos_2026-05-04_admin.json",
    "size": 5605893,
    "fechaArchivo": "2026-05-04T21:49:00.000Z",
    "label": "Z prof4 todos 2026-05-04 admin"
  }
]
```

El `label` es simplemente el nombre del archivo sin extensión y con guiones bajos reemplazados por espacios.

#### GET /api/historial/:filename

Carga el contenido completo de un escaneo guardado.

- **Acceso:** Público
- **Seguridad:** Usa `path.basename(req.params.filename)` para prevenir ataques de path traversal (no se puede pedir `../../server/index.js`).
- **Respuesta:** El JSON completo del escaneo (puede ser varios MB).

#### DELETE /api/historial/:filename

Elimina un escaneo del disco.

- **Acceso:** Requiere JWT válido
- **Respuesta exitosa:** `{ "ok": true }`

#### GET /api/drives

Detecta las unidades disponibles en el equipo.

- **Acceso:** Requiere JWT
- Ejecuta un script PowerShell con `Get-PSDrive -PSProvider FileSystem` filtrando las que tienen `DisplayRoot` (unidades de red mapeadas).
- **Respuesta:** Array con información de cada unidad:

```json
[
  {
    "letra": "Z",
    "raiz": "Z:\\",
    "nombre": "\\\\servidor\\compartido",
    "esRed": true,
    "libreGB": 234.5,
    "usadoGB": 1200.3
  }
]
```

#### POST /api/scan

**El endpoint más importante.** Ejecuta el escaneo real de permisos NTFS.

- **Acceso:** Requiere JWT
- **Body:**

```json
{
  "ruta": "Z:\\Administrativa",
  "profundidad": 4,
  "soloUsuario": "jperez",
  "usuarioAdmin": "admin",
  "existingFilename": "Z_prof4_usr-jperez_2026-05-03_admin.json"
}
```

El campo `existingFilename` es opcional. Si se envía (en re-escaneos), el servidor borra el archivo anterior antes de guardar el nuevo, evitando duplicados en el historial.

- **Respuesta:** El resultado del escaneo procesado más `_savedAs` (nombre del archivo guardado).
- **Timeout:** 30 minutos (`1800000 ms`). Escaneos de redes muy grandes pueden tardar.

Ver sección 4.4 para el detalle del motor de escaneo.

#### POST /api/quickscan

Escaneo rápido para obtener la lista de usuarios en una ruta, sin el detalle completo.

- **Acceso:** Requiere JWT
- **Propósito:** Alimentar el autocompletado de usuarios en el modal de nuevo escaneo.
- **Body:** `{ "ruta": "Z:\\" }`
- Escanea hasta 3 niveles de profundidad y extrae únicamente los nombres de usuarios/grupos sin detalle de carpetas.
- **Adicionalmente** agrega los usuarios del caché AD que no aparecen directamente en las ACLs, para permitir filtrar por cualquier usuario del dominio aunque no tenga permisos explícitos en esa ruta.

#### GET /api/config

- **Acceso:** Público
- **Respuesta:** `{ "scanDir": "C:\\ruta\\a\\Permisos_Scan" }`
- El frontend puede usar esto para mostrar dónde se guardan los archivos.

#### GET /api/addata

- **Acceso:** Requiere JWT (contiene el directorio completo, incluidos los administradores del dominio)
- **Respuesta:** Los dos mapas de Active Directory completos en memoria:

```json
{
  "AD_USER_GROUPS": {
    "jperez": ["Finanzas", "Usuarios del dominio", "VPN-Usuarios"],
    "mgarcia": ["RRHH", "Usuarios del dominio"]
  },
  "AD_GROUP_USERS": {
    "Finanzas": ["jperez", "lmartinez"],
    "RRHH": ["mgarcia", "jrodriguez"]
  }
}
```

#### POST /api/usergroups

Retorna los grupos AD de un usuario específico.

- **Acceso:** Requiere JWT. La antigua variante `/api/usergroups/public` se eliminó.
- **Body:** `{ "usuario": "DOMINIO\\jperez" }` (acepta con o sin prefijo de dominio)
- Extrae el SAM del nombre completo, lo normaliza a minúsculas, y busca en `AD_USER_GROUPS`.

#### POST /api/groupusers

Retorna los usuarios miembros de un grupo AD.

- **Acceso:** Requiere JWT. La antigua variante `/api/groupusers/public` se eliminó.
- **Body:** `{ "grupo": "Finanzas" }`

### 4.4 Motor de Escaneo PowerShell

El corazón técnico del proyecto. Cuando llega una petición a `POST /api/scan`, el servidor lanza un script PowerShell como proceso hijo y lee su salida.

**Regla de seguridad: los datos del usuario nunca van dentro del texto del script.** La ruta, la profundidad y los nombres a filtrar viajan como variables de entorno (`PS_RUTA`, `PS_PROFUNDIDAD`, `PS_NOMBRES`) y el script los lee con `$env:`. Cualquier script nuevo que reciba datos del navegador debe usar el mismo helper.

**Inicialización del proceso (helper `spawnPS`):**

```javascript
function spawnPS(script, inputs, timeout) {
  const env = { ...process.env };
  for (const [k, v] of Object.entries(inputs || {})) env['PS_' + k] = String(v);
  return spawn(PS_PATH, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { timeout, env });
}

const ps = spawnPS(script, { RUTA: ruta, PROFUNDIDAD: profMax, NOMBRES: nombres }, 1800000);
```

```powershell
$RutaScan = $env:PS_RUTA
$ProfMax  = [int]$env:PS_PROFUNDIDAD
```

La profundidad se valida en Node antes de lanzar el proceso: debe ser un entero entre 0 y 20 (si no, responde 400).

La variable `PS_PATH` apunta a `powershell.exe` o a la ruta completa si `SystemRoot` está definido. Esto garantiza encontrar PowerShell incluso en entornos con PATH no estándar.

**Paso 1: Validar la ruta**

```powershell
if (-not (Test-Path $RutaScan)) {
  Write-Output '{"error":"Ruta no accesible",...}'
  exit
}
```

Si la ruta no es accesible, retorna inmediatamente con un JSON de error sin fallar silenciosamente.

**Paso 2: Recolectar todas las carpetas**

```powershell
$carpetas = [System.Collections.Generic.List[object]]::new()
$raiz = Get-Item -Path $RutaScan -ErrorAction SilentlyContinue
if ($raiz) { $carpetas.Add($raiz) }

Get-ChildItem -Path $RutaScan -Directory -Recurse -Depth $ProfMax -ErrorAction SilentlyContinue |
  ForEach-Object { $carpetas.Add($_) }
```

Se usa `List[object]` en vez del operador `+=` de PowerShell porque `+=` en arrays recrea el array completo en cada iteración, lo que es extremadamente lento con miles de carpetas.

**Paso 3: Leer ACLs y clasificar permisos**

Para cada carpeta, se llama a `Get-Acl` y se itera sobre las entradas de acceso:

```powershell
foreach ($carpeta in $carpetas) {
  try {
    $acl = Get-Acl -Path $carpeta.FullName -ErrorAction Stop
    foreach ($entrada in $acl.Access) {
      $usuarioStr = $entrada.IdentityReference.Value

      # Filtrar SIDs sin resolver (cuentas eliminadas)
      if (-not $usuarioStr -or $usuarioStr -match '^S-1-[0-9]') { continue }

      # Si hay filtro de usuario, aplicarlo
      ${userFilter}  # Aqui se inserta el filtro dinamico si viene soloUsuario

      # Clasificar el nivel de permiso en categorias legibles
      $derechos = $entrada.FileSystemRights.ToString()
      $tipo = if ($derechos -match 'FullControl')                           { 'Control Total' }
              elseif ($derechos -match 'Modify')                            { 'Lectura y Escritura' }
              elseif ($derechos -match 'Write' -and $derechos -match 'Read'){ 'Lectura y Escritura' }
              elseif ($derechos -match 'Write')                             { 'Escritura' }
              elseif ($derechos -match 'ReadAndExecute|Read')               { 'Lectura' }
              else                                                           { 'Especial' }
    }
  } catch { $errores++ }
}
```

**Por qué se filtran los SIDs:** Windows guarda en las ACLs el SID (identificador de seguridad) del usuario. Cuando un usuario es eliminado del dominio, su SID permanece en las ACLs pero ya no puede resolverse a un nombre. Estos aparecen como `S-1-5-21-...`. El filtro `'^S-1-[0-9]'` los descarta para no mostrar entradas inútiles.

**Cómo se calcula el nivel de profundidad:**

```powershell
$nivel = ($carpeta.FullName -split [regex]::Escape([IO.Path]::DirectorySeparatorChar)).Count -
         ($RutaScan.TrimEnd([IO.Path]::DirectorySeparatorChar) -split ...).Count
```

Cuenta los separadores de ruta en la carpeta actual y le resta los de la ruta raíz del escaneo. Una carpeta directamente dentro de la raíz tiene nivel 1.

**El filtro dinámico de usuario:**

Cuando se especifica `soloUsuario`, Node.js arma la lista de nombres a buscar (el usuario y todos sus grupos AD conocidos), uno por línea, y la pasa en `PS_NOMBRES`. El script se queda con las entradas de ACL cuyo nombre contiene alguno de ellos, sin distinguir mayúsculas:

```powershell
$Nombres = @($env:PS_NOMBRES -split "`n" | Where-Object { $_ })
# ... dentro del recorrido de cada entrada de la ACL:
$coincide = $false
foreach ($n in $Nombres) {
  if ($usuarioStr.IndexOf($n, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { $coincide = $true; break }
}
if (-not $coincide) { continue }
```

Es el mismo criterio que el antiguo `-like '*nombre*'`, pero sin interpretar `*`, `?` ni `[ ]` como comodines.

**Resultado final del script PowerShell:**

```json
{
  "totalCarpetas": 1234,
  "totalRegistros": 5678,
  "errores": 3,
  "datos": [
    {
      "carpeta": "Z:\\Administrativa\\Finanzas",
      "nivel": 2,
      "usuario": "DOMINIO\\jperez",
      "usuarioCorto": "jperez",
      "tipo": "Lectura y Escritura",
      "acceso": "Allow",
      "heredado": true
    }
  ]
}
```

### 4.5 Post-procesamiento Node.js

Después de que PowerShell termina y Node.js parsea el JSON, hay un paso de post-procesamiento importante cuando se escanea por `soloUsuario`.

**El problema:** Si se filtra por el usuario `jperez` y `jperez` pertenece al grupo `Finanzas`, el script PowerShell devuelve registros donde aparece `DOMINIO\Finanzas` en la ACL (no `jperez` directamente). Estos registros son válidos (el usuario tiene acceso a través del grupo) pero requieren ser marcados especialmente.

**La solución:**

```javascript
// Registros donde el usuario aparece DIRECTAMENTE en la ACL
const directRecords = data.datos.filter(d =>
  d.usuarioCorto?.toLowerCase() === userLower
);

// Registros donde aparece un grupo al que pertenece el usuario (acceso indirecto)
const groupRecords = data.datos.filter(d =>
  d.usuarioCorto?.toLowerCase() !== userLower
).map(d => ({
  ...d,
  usuario: soloUsuario,
  usuarioCorto: soloUsuario,
  viaGrupo: d.usuarioCorto,   // Nombre del grupo que otorga el permiso
  isIndirect: true             // Flag para mostrar icono de grupo en la UI
}));

// Prioridad: si tiene permisos directos, mostrar esos
// Si no, mostrar los de grupo (reescritos como si fueran del usuario)
data.datos = directRecords.length > 0 ? directRecords : groupRecords;
```

Los registros marcados con `isIndirect: true` se muestran en la UI con un ícono de grupo y la leyenda "via NombreGrupo".

**Parseo robusto del JSON de PowerShell:**

```javascript
const clean = stdout.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
const lines = clean.split('\n').filter(l => l.trim().startsWith('{') || l.trim().startsWith('['));
const jsonStr = lines[lines.length - 1] || clean;
const data = JSON.parse(jsonStr);
```

PowerShell puede emitir líneas de diagnóstico antes del JSON. El código filtra solo las líneas que empiezan con `{` o `[` y toma la última, que es el JSON real.

### 4.6 Integración con Active Directory (LDAP)

La función `updateADGroups()` se ejecuta en background al hacer login. Usa `.NET DirectoryServices` directamente desde PowerShell sin módulos adicionales.

**Estrategia de carga (3 niveles de fallback):**

```
Al iniciar el servidor:
  1. Intenta leer config/ad-groups.json (cache persistido del ultimo login exitoso)
     -> Si existe: carga en memoria y listo

  2. Si no existe: intenta importar server/ad-groups.js (objeto JS estatico de respaldo)
     -> Si existe: carga en memoria y guarda como ad-groups.json para el futuro

  3. Si tampoco existe: inicia con AD_USER_GROUPS y AD_GROUP_USERS vacios
     -> El sistema funciona pero sin informacion de grupos AD

Al hacer login exitoso (2 segundos despues):
  4. Ejecuta updateADGroups() en background
     -> Consulta LDAP del dominio actual (timeout de 60 segundos)
     -> Si tiene datos: actualiza memoria + sobreescribe ad-groups.json
     -> Si no tiene datos: mantiene el cache anterior sin sobrescribir
```

**El script PowerShell de actualización AD:**

La búsqueda se hace por **usuarios** (no por grupos) y se leen los grupos de cada uno desde su atributo `memberOf`. El comentario del código lo justifica como más confiable que recorrer los miembros de cada grupo.

```powershell
$domain = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
$root = [ADSI]('LDAP://' + $domain.Name)
$searcher = New-Object System.DirectoryServices.DirectorySearcher($root)
$searcher.Filter = '(&(objectClass=user)(objectCategory=person))'
$searcher.PageSize = 1000
$searcher.PropertiesToLoad.AddRange(@('sAMAccountName','memberOf'))
$users = $searcher.FindAll()
```

Para cada usuario toma su `sAMAccountName` en minúsculas y, por cada DN de `memberOf`, abre el grupo para leer su `sAMAccountName`. Si no puede, usa el `CN=` del DN. El resultado es `{ sam: [grupo1, grupo2, ...] }`.

**Construcción del mapa inverso:**

Node.js recibe `AD_USER_GROUPS` (usuario → grupos) y construye `AD_GROUP_USERS` (grupo → usuarios):

```javascript
const groupUsers = {};
for (const [sam, groups] of Object.entries(userGroups)) {
  groups.forEach(g => {
    if (!groupUsers[g]) groupUsers[g] = [];
    groupUsers[g].push(sam);
  });
}
```

Si el grupo `Invitados del dominio` existía en el caché anterior y la nueva consulta no lo trae, se conserva.

**Grupo "Usuarios del dominio":**

Este grupo especial se reconstruye automáticamente con todos los usuarios devueltos por la consulta, porque es el grupo primario de las cuentas y Active Directory no lo incluye en `memberOf`:

```javascript
const allDomainUsers = Object.keys(userGroups);
groupUsers['Usuarios del dominio'] = allDomainUsers;
allDomainUsers.forEach(sam => {
  if (!userGroups[sam].includes('Usuarios del dominio')) {
    userGroups[sam].push('Usuarios del dominio');
  }
});
```

### 4.7 Persistencia de Escaneos

Los escaneos se guardan automáticamente en `Permisos_Scan/` con el siguiente patrón de nombre:

```
{ruta_sanitizada}_prof{N}_{filtro}_{fecha}_{admin}.json

Ejemplos:
  Z_prof4_todos_2026-05-04_admin.json
  Z_prof4_usr-jperez_2026-05-04_admin.json
  Z_Administrativa_prof2_usr-mgarcia_2026-05-04_admin.json
```

La sanitización reemplaza `:`, `/` y `\` por `_` y colapsa guiones bajos múltiples.

**El JSON guardado contiene:**
- Todos los metadatos del escaneo (ruta, profundidad, usuario, timestamp).
- El array completo de `PermissionRecord[]`.
- NO contiene los índices calculados (`byUser`, `byFolder`) — estos se reconstruyen en el cliente cada vez que se carga un escaneo.

La carpeta `Permisos_Scan/` está en `.gitignore`: los escaneos son datos del entorno (y contienen información interna del dominio), no código.

### 4.8 Módulo Estructurador NAS

El Estructurador NAS es un registro del mapa organizacional que el equipo de sistemas mantiene a mano. No lee ni modifica los escaneos de permisos; solo comparte con el resto de la app el login, el servidor y el empaquetado.

- **Código:** `server/estructurador.js`, registrado desde `index.js` con `registerEstructuradorRoutes(app, authMiddleware)`.
- **Endpoints:** todos bajo `/api/estructurador/*` y protegidos con JWT. Hay CRUD de Unidades, Áreas, Cargos, Procesos y Miembros, `GET /todo` para cargar todo de una vez, y dos rutas para importar personas de AD como Miembros (`GET /ad-usuarios` y `POST /miembros/importar-ad`).
- **Datos:** `config/estructurador.json`. Si no existe, el servidor lo crea vacío al arrancar. Las escrituras se encolan en una cadena de promesas (`writeChain`) para que dos peticiones simultáneas no se pisen.
- **Relación con AD:** solo **lee** `config/ad-groups.json` para ofrecer la importación de personas; nunca lo escribe.
- **Integridad:** no deja borrar una Unidad, Área, Cargo o Proceso que tenga elementos dependientes (responde 409), y al borrar un Miembro limpia sus referencias en procesos y cargos.

El modelo de datos, las reglas de numeración, todos los endpoints y la interfaz están documentados en [Estructurador NAS](./estructurador-nas.md).

---

## 5. Frontend — Angular 17

### 5.1 Arquitectura Angular: Standalone Components

La aplicación usa la arquitectura de **Standalone Components** introducida en Angular 14 y adoptada como estándar en Angular 17. No hay `NgModule`. Cada componente declara sus propias importaciones:

```typescript
@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule, FolderTreeComponent, PermBadgeComponent],
  templateUrl: './results.component.html'
})
export class ResultsComponent { ... }
```

Esto hace que cada componente sea completamente autocontenido y más fácil de mover o reutilizar.

**Signals de Angular 17:** El proyecto usa la nueva API de `signal()` para estado local de componentes (en vez de propiedades simples o `BehaviorSubject`). Los signals son reactivos y actualizan la vista automáticamente:

```typescript
showScanModal = signal(false);
drives = signal<Drive[]>([]);

// Actualizar:
this.showScanModal.set(true);

// Leer en template:
// *ngIf="showScanModal()"
```

### 5.2 Routing y Guardias de Seguridad

El routing está configurado en `app.config.ts` con carga diferida (lazy loading) de todos los componentes:

```typescript
provideRouter([
  // Ruta publica - historial de escaneos
  { path: '',
    loadComponent: () => import('./features/historial/historial.component')
      .then(m => m.HistorialComponent) },

  // Visor publico - ver un escaneo especifico sin login
  { path: 'ver/:filename',
    loadComponent: () => import('./features/viewer/viewer.component')
      .then(m => m.ViewerComponent) },

  // Login
  { path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent) },

  // Dashboard admin - PROTEGIDO por authGuard
  { path: 'admin',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard] },

  // Estructurador NAS - PROTEGIDO por authGuard
  { path: 'estructurador',
    loadComponent: () => import('./features/estructurador/estructurador.component')
      .then(m => m.EstructuradorComponent),
    canActivate: [authGuard] },

  // Cualquier ruta desconocida va al historial
  { path: '**', redirectTo: '' }
])
```

**El Auth Guard (`core/guards/auth.guard.ts`):**

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getToken()) return true;           // Token valido -> permitir
  return router.createUrlTree(['/login']);    // Sin token -> redirigir a login
};
```

**El Auth Interceptor (`core/guards/auth.interceptor.ts`):**

Intercepta todas las peticiones HTTP y agrega el token automáticamente:

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();

  if (token && !req.url.includes('/login')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el servidor rechaza el token (401), cerrar sesion
      // Excepto para rutas publicas como /api/historial
      if (error.status === 401 && !req.url.includes('/api/historial')) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
```

### 5.3 AuthService — Gestión de Sesión

`AuthService` maneja el ciclo de vida de la autenticación. El token JWT se almacena en `sessionStorage` (no `localStorage`), lo que significa que desaparece al cerrar la pestaña o el navegador.

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'ps_token';
  private userKey = 'ps_user';

  // Observable del estado de autenticacion
  private _isAuth = new BehaviorSubject<boolean>(this.checkToken());
  isAuth$ = this._isAuth.asObservable();

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/login', req).pipe(
      tap(res => {
        sessionStorage.setItem(this.tokenKey, res.token);
        sessionStorage.setItem(this.userKey, res.usuario);
        this._isAuth.next(true);
      })
    );
  }

  // Verifica que el JWT no este expirado al cargar la pagina
  private checkToken(): boolean {
    const token = sessionStorage.getItem(this.tokenKey);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));  // Decodifica el payload JWT
      return payload.exp > Date.now() / 1000;                 // Compara con tiempo actual
    } catch {
      sessionStorage.removeItem(this.tokenKey);
      return false;
    }
  }
}
```

### 5.4 ScanService — Estado Global de Escaneos

`ScanService` es el servicio más importante del frontend. Mantiene el estado de todos los escaneos abiertos en la sesión usando `BehaviorSubject` (de RxJS), que permite que cualquier componente se suscriba y reciba actualizaciones automáticas.

**Estado reactivo:**

```typescript
private _scans = new BehaviorSubject<ScanResult[]>([]);
scans$ = this._scans.asObservable();             // Lista de todos los escaneos

private _activeScanId = new BehaviorSubject<string | null>(null);
activeScanId$ = this._activeScanId.asObservable(); // Cual esta visible ahora

private _loading = new BehaviorSubject<boolean>(false);
loading$ = this._loading.asObservable();          // Si hay un escaneo en curso

private _loadingMsg = new BehaviorSubject<string>('');
loadingMsg$ = this._loadingMsg.asObservable();    // Mensaje de progreso
```

**Método `scan(config)`:** Inicia un escaneo nuevo. Emite `loading: true`, hace POST, procesa el resultado, lo agrega a `_scans` y emite `loading: false`.

**Método `rescan(scanId, config)`:** Re-escanea una ruta ya escaneada. Encuentra el escaneo existente por ID, le envía su `_savedAs` al servidor para que borre el archivo viejo, y reemplaza el escaneo en la lista.

**Método `importScan(data, filename)`:** Carga datos de escaneo que ya existen (desde historial) sin llamar al endpoint `/api/scan`. Llama a `processRawScan()` y agrega el resultado a `_scans`.

**Método `processRawScan(raw, config)`:** Transforma el JSON crudo del servidor en un `ScanResult` completo con todos sus índices:

```typescript
processRawScan(raw: any, config: ScanConfig): ScanResult {
  // 1. Normalizar los PermissionRecord (limpiar barras dobles, etc.)
  const datos: PermissionRecord[] = raw.datos.map((d: any) => ({
    carpeta: (d.carpeta || '').replace(/\\\\/g, '\\'),
    nivel: d.nivel || 0,
    usuario: (d.usuario || '').replace(/\\\\/g, '\\'),
    usuarioCorto: d.usuarioCorto || d.usuario?.split('\\').pop() || '',
    tipo: d.tipo as TipoPermiso,
    acceso: d.acceso || 'Allow',
    heredado: d.heredado || false,
    viaGrupo: d.viaGrupo || null,
    isIndirect: d.isIndirect || false
  }));

  // 2. Construir el objeto ScanResult
  const result: ScanResult = { id: `scan_${Date.now()}`, datos, ... };

  // 3. Construir indices en memoria para busqueda O(1)
  this.buildIndices(result);
  return result;
}
```

**Método `buildIndices(result)`:** Construye los dos `Map` de búsqueda:

```typescript
private buildIndices(result: ScanResult): void {
  // byUser: Map<usuarioCorto_lowercase, PermissionRecord[]>
  result.byUser = new Map();
  // byFolder: Map<rutaCarpeta, PermissionRecord[]>
  result.byFolder = new Map();

  for (const record of result.datos) {
    // Indexar por usuario
    const userKey = record.usuarioCorto.toLowerCase();
    if (!result.byUser.has(userKey)) result.byUser.set(userKey, []);
    result.byUser.get(userKey)!.push(record);

    // Indexar por carpeta
    const folderKey = record.carpeta;
    if (!result.byFolder.has(folderKey)) result.byFolder.set(folderKey, []);
    result.byFolder.get(folderKey)!.push(record);
  }

  // Construir lista de usuarios con resumen
  result.userList = this.buildUserList(result.byUser);

  // Construir arbol de carpetas
  result.folderTree = this.buildFolderTree(result.byFolder, result.ruta, result.profundidad);
}
```

Gracias a estos índices, cuando el usuario hace clic en un nombre en la UI, obtener todos sus permisos es instantáneo (`O(1)`) en vez de recorrer todo el array en cada interacción.

**Método `buildUserList(byUser)`:** Para cada usuario, calcula su rol inferido, cuenta sus carpetas y construye un resumen de tipos de permiso. Los roles se ordenan: Administrador > Admin Dominio > Gerencia > Usuario > Sistema > Todos.

**Clasificación de roles:**

```typescript
private getRol(usuario: string): string {
  const u = usuario.toLowerCase();
  if (u.includes('admin') && !u.includes('apoyo')) return 'Administrador';
  if (u.includes('domain admins'))                 return 'Admin Dominio';
  if (u.includes('gerente') || u.includes('director')) return 'Gerencia';
  if (u.includes('everyone') || u.includes('todos'))   return 'Todos los usuarios';
  if (u.includes('system') || u.includes('sistema'))   return 'Sistema';
  if (u.includes('users') || u.includes('usuarios'))   return 'Usuarios generales';
  return 'Usuario';
}
```

**Método `buildFolderTree(byFolder, rootRuta, maxDepth)`:** Construye la estructura de árbol para el componente visual:

```typescript
buildFolderTree(byFolder: Map<string, PermissionRecord[]>, rootRuta: string, maxDepth: number): FolderNode[] {
  const nodeMap = new Map<string, FolderNode>();

  // Crear un nodo por cada carpeta unica
  byFolder.forEach((usuarios, ruta) => {
    const nivel = usuarios[0]?.nivel ?? 0;
    if (nivel > maxDepth) return;
    const parts = ruta.split('\\').filter(Boolean);
    nodeMap.set(ruta.toLowerCase(), {
      ruta, nombre: parts[parts.length - 1] || ruta,
      nivel, usuarios, children: [],
      expanded: nivel < 2  // Los dos primeros niveles van expandidos por defecto
    });
  });

  // Construir la jerarquia padre -> hijos
  const roots: FolderNode[] = [];
  nodeMap.forEach(node => {
    const parts = node.ruta.split('\\').filter(Boolean);
    const parentRuta = parts.slice(0, -1).join('\\');
    const parent = nodeMap.get(parentRuta.toLowerCase());
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  return roots.sort((a, b) => a.nombre.localeCompare(b.nombre));
}
```

### 5.5 Componentes: Dashboard y Sidebar

**`DashboardComponent`** es el contenedor principal del panel de administración. Al iniciar (`ngOnInit`):

1. Llama a `loadDrives()` para mostrar las unidades disponibles en el sidebar.
2. Llama a `loadHistorial()` que hace lo siguiente en orden:
   - Primero carga los datos AD desde `GET /api/addata`.
   - Con los datos AD en memoria, carga el historial desde `GET /api/historial`.
   - Para cada item del historial, carga el JSON completo y lo importa al `ScanService`.

El orden importa: los datos AD deben estar disponibles _antes_ de importar los escaneos para que los índices de usuarios incluyan la información de grupos correctamente.

**`SidebarComponent`** es un componente presentacional puro (sin lógica de negocio). Recibe datos por `@Input` y emite eventos por `@Output`:

```typescript
@Input() scans: ScanResult[] = [];
@Input() activeScanId = '';
@Input() drives: Drive[] = [];

@Output() selectScan = new EventEmitter<string>();
@Output() deleteScan = new EventEmitter<{id: string, label: string}>();
@Output() newScan = new EventEmitter<void>();
```

Muestra una barra de progreso visual para la profundidad de cada escaneo (7 segmentos, los N activos resaltados en verde).

### 5.6 Componente: ScanModal

`ScanModalComponent` es el modal de configuración de un nuevo escaneo. Sus características técnicas más importantes:

**Autocompletado de usuarios con debounce:**

Cuando el usuario escribe en el campo de filtro por usuario, no se llama al servidor en cada tecla. Se usa un `Subject` de RxJS con `debounceTime` para esperar a que el usuario deje de escribir:

```typescript
private rutaChange$ = new Subject<string>();

ngOnInit() {
  this.rutaChange$.pipe(
    debounceTime(500),           // Espera 500ms despues de la ultima tecla
    distinctUntilChanged(),      // Solo si cambio la ruta
    switchMap(ruta => {          // Cancela la peticion anterior si hay una nueva
      if (!ruta) return of([]);
      this.loadingUsers.set(true);
      return this.http.post<any[]>('/api/quickscan', { ruta }, { headers });
    }),
    takeUntil(this.destroy$)
  ).subscribe(users => {
    this.loadingUsers.set(false);
    this.availableUsers = users;
  });
}
```

**Tiempo estimado de escaneo:** Calcula una estimación basada en la profundidad seleccionada, mostrando texto como "Rapido (1-2 min)" o "Puede tardar varios minutos".

### 5.7 Componente: Results

`ResultsComponent` es el visualizador de resultados. Recibe un `ScanResult` como `@Input` y gestiona toda la interacción de exploración.

**Caché de permisos calculados:** Para evitar recalcular en cada renderizado, usa Maps privados como caché:

```typescript
private _directPermsCache = new Map<string, PermissionRecord[]>();

get selectedUserPerms(): PermissionRecord[] {
  if (!this.selectedUser()) return [];
  const key = this.selectedUser()! + '|' + this.userFolderFilter();
  if (!this._directPermsCache.has(key)) {
    const allPerms = this.scan.byUser.get(this.selectedUser()!) || [];
    // Separar permisos directos de indirectos (via grupo)
    const directPerms = allPerms.filter(p => !p.isIndirect && !p.viaGrupo);
    const filtered = this.userFolderFilter()
      ? directPerms.filter(p => p.carpeta.toLowerCase().includes(this.userFolderFilter()))
      : directPerms;
    this._directPermsCache.set(key, filtered);
  }
  return this._directPermsCache.get(key)!;
}
```

El caché se limpia en `ngOnChanges` cuando llega un nuevo `ScanResult`.

**Pestaña Usuarios:** Muestra `scan.userList` (lista precalculada de `UserSummary`). El buscador filtra sobre esta lista sin llamadas al servidor. Al seleccionar un usuario se muestran sus permisos directos y, opcionalmente, los permisos que tiene vía grupos.

**Pestaña Carpetas:** Usa el árbol `scan.folderTree`. Al seleccionar una carpeta, muestra `scan.byFolder.get(ruta)` directamente desde el índice.

**Detección de grupos:** Un usuario se considera grupo si su nombre contiene espacios o si aparece en los datos de AD. Los grupos muestran opción de expandir para ver sus miembros.

### 5.8 Componentes Públicos: Historial y Viewer

**`HistorialComponent`:** Llama a `GET /api/historial` y lista los escaneos. Cada fila enlaza a `/ver/:filename`. No usa ni requiere `ScanService`.

**`ViewerComponent`:** Si hay sesión iniciada, primero carga los datos AD (`GET /api/addata`); sin sesión, se los salta y muestra el escaneo sin grupos. Lee el parámetro `:filename` de la URL, llama a `GET /api/historial/:filename`, procesa los datos con `ScanService.importScan()` y renderiza `ResultsComponent` en modo `readOnly=true`. En modo readOnly, `ResultsComponent` no muestra los botones de re-escaneo ni eliminación.

### 5.9 Componentes Compartidos (Shared)

**`PermBadgeComponent`:** Muestra un badge de color según el tipo de permiso. El color se calcula en el template con lógica de clases condicionales Tailwind.

**`GroupMembersComponent`:** Recibe un nombre de grupo y llama a `POST /api/groupusers` para obtener y mostrar sus miembros. Si no hay sesión (visor público), no hace la petición y muestra "Inicia sesión para ver los miembros".

**`UserGroupsComponent`:** Recibe un nombre de usuario y llama a `POST /api/usergroups` para mostrar los grupos a los que pertenece. Sin sesión muestra "Inicia sesión para ver los grupos".

### 5.10 Modelos de Datos TypeScript

Todas las interfaces están en `core/models/models.ts`. Documentadas:

```typescript
// Un registro individual: un usuario tiene X permiso en Y carpeta
interface PermissionRecord {
  carpeta: string;          // Ruta completa: "Z:\Administrativa\Finanzas"
  nivel: number;            // Profundidad relativa a la raiz: 0, 1, 2...
  usuario: string;          // Nombre completo: "DOMINIO\jperez"
  usuarioCorto: string;     // Solo el SAM: "jperez"
  tipo: TipoPermiso;        // Categoria legible del permiso
  acceso: 'Allow' | 'Deny'; // Tipo de entrada ACL
  heredado: boolean;        // Si viene de una carpeta padre
  viaGrupo?: string | null; // Nombre del grupo que otorga el permiso (si aplica)
  isIndirect?: boolean;     // true si el permiso es via grupo AD
}

type TipoPermiso = 'Control Total' | 'Lectura y Escritura' | 'Escritura' | 'Lectura' | 'Especial';

// Resultado completo de un escaneo (con indices calculados en memoria)
interface ScanResult {
  id: string;               // Identificador en memoria: "scan_1714836000000"
  label: string;            // Nombre visible del escaneo
  ruta: string;             // Ruta raiz escaneada
  profundidad: number;      // Niveles escaneados
  soloUsuario?: string;     // Si se filtro por usuario
  timestamp: Date;
  totalCarpetas: number;
  totalRegistros: number;
  _savedAs?: string | null; // Nombre del archivo .json en Permisos_Scan/
  errores: number;          // Carpetas que no se pudieron leer
  datos: PermissionRecord[];// Todos los registros crudos
  // Indices calculados en memoria (NO se serializan en el JSON guardado)
  byUser: Map<string, PermissionRecord[]>;   // Busqueda por usuario O(1)
  byFolder: Map<string, PermissionRecord[]>; // Busqueda por carpeta O(1)
  userList: UserSummary[];  // Lista precalculada para la tabla de usuarios
  folderTree: FolderNode[]; // Arbol precalculado para el visualizador
}

// Resumen de un usuario para la lista de la pestaña Usuarios
interface UserSummary {
  usuario: string;          // Nombre completo
  usuarioCorto: string;     // SAM
  rol: string;              // Rol inferido: 'Administrador', 'Usuario', etc.
  totalPermisos: number;    // Cantidad de carpetas con acceso
  tiposResumen: string;     // Ej: "Control Total (2), Lectura (15)"
}

// Nodo del arbol de carpetas
interface FolderNode {
  ruta: string;
  nombre: string;           // Solo el nombre de la carpeta (ultimo segmento)
  nivel: number;
  usuarios: PermissionRecord[]; // Permisos en esta carpeta especifica
  children: FolderNode[];   // Subcarpetas
  expanded?: boolean;       // Si el nodo esta expandido en la UI
}

// Item del historial (viene de GET /api/historial)
interface HistorialItem {
  filename: string;
  size: number;
  fechaArchivo: string;
  label: string;
}
```

---

## 6. Flujo de Datos Completo

### Escaneo nuevo completo (paso a paso)

```
[1] Admin selecciona ruta "Z:\Administrativa" y profundidad 4 en ScanModal

[2] DashboardComponent.onScanStart(config) llama a:
    ScanService.scan({ ruta: "Z:\\Administrativa", profundidad: 4, soloUsuario: "" })

[3] ScanService:
    - _loading.next(true)
    - _loadingMsg.next("Escaneando Z:\\Administrativa (4 niveles)...")
    - HTTP POST /api/scan { ruta, profundidad }

[4] Express recibe la peticion:
    - authMiddleware verifica JWT
    - Construye el script PowerShell con los parametros
    - spawn(powershell.exe, script)

[5] PowerShell ejecuta:
    - Get-ChildItem -Recurse -Depth 4 -> lista de carpetas
    - foreach carpeta: Get-Acl -> entradas ACL
    - Filtra SIDs sin resolver
    - Clasifica permisos en categorias legibles
    - Retorna JSON a stdout

[6] Node.js procesa la salida de PowerShell:
    - Parsea el JSON de stdout
    - Si habia soloUsuario: separa permisos directos vs. indirectos
    - Guarda en Permisos_Scan/Z_prof4_todos_2026-05-04_admin.json
    - Agrega _savedAs al JSON
    - Responde al cliente con el JSON completo

[7] ScanService en Angular:
    - Recibe el JSON crudo
    - processRawScan(): normaliza los PermissionRecord
    - buildIndices():
        * Construye byUser: Map con todos los permisos por usuario
        * Construye byFolder: Map con todos los permisos por carpeta
        * buildUserList(): calcula UserSummary[] con roles y conteos
        * buildFolderTree(): construye FolderNode[] jerarquico
    - _scans.next([...scans, newResult])
    - _activeScanId.next(newResult.id)
    - _loading.next(false)

[8] DashboardComponent detecta el cambio en scans$ y activeScanId$
    Renderiza ResultsComponent con el nuevo scan

[9] Usuario interactua (clic en "jperez" en la tabla):
    ResultsComponent.selectedUser.set('jperez')
    -> Accede a scan.byUser.get('jperez') -> instantaneo O(1)
    -> Muestra la lista de carpetas con acceso
    -> Llama a POST /api/usergroups para mostrar grupos AD (requiere sesión)
```

### Carga desde historial (dashboard)

```
[1] DashboardComponent.ngOnInit()

[2] GET /api/addata
    -> Carga AD_USER_GROUPS y AD_GROUP_USERS en ScanService

[3] GET /api/historial
    -> Lista de HistorialItem[]

[4] Para cada item:
    GET /api/historial/{filename}
    -> JSON completo del escaneo
    -> ScanService.importScan(data, filename)
    -> processRawScan() + buildIndices()
    -> Agrega a _scans

[5] El sidebar muestra todos los escaneos del historial
    El primero queda activo automaticamente
```

---

## 7. Empaquetado y Distribución (.exe)

`pkg` es una herramienta que toma un proyecto Node.js y lo convierte en un ejecutable portable que incluye el runtime de Node.js internamente. El resultado es un archivo `.exe` que corre en cualquier Windows sin instalar nada.

### Proceso de build (CONSTRUIR_EXE.bat)

```
[1] npm install -g pkg
    Instala la herramienta pkg globalmente (solo primera vez)

[2] cd server && npm install
    Instala las dependencias del servidor (express, cors, jsonwebtoken, uuid)

[3] cd client && npm install && npm run build
    Instala Angular CLI y dependencias
    Compila Angular con optimizaciones de produccion
    Genera client/dist/client/browser/ con:
      - index.html
      - main-HASH.js (codigo de Angular, minificado y tree-shaken)
      - chunk-HASH.js (librerias de terceros, separadas para cache)
      - styles-HASH.css
      - polyfills-HASH.js

[4] cd server && pkg . --target node18-win-x64 --output ../PermisosScan.exe
    pkg lee package.json para saber que empaquetar:
      - El codigo de server/index.js y sus require() (incluye estructurador.js)
      - Los assets: client/dist/client/browser/**/* (los archivos de Angular)
    Empaqueta todo en un binario de ~80-100 MB
```

**Por qué el .exe es tan grande:** Incluye el runtime completo de Node.js 18 (~50 MB) más el código del servidor y todos los archivos de Angular compilados.

### Archivos necesarios para distribución

Para llevar la aplicación a otro equipo Windows solo se necesitan:

- `PermisosScan.exe` (el ejecutable, incluye todo)
- `ABRIR.bat` (el lanzador, detecta si ya corre y abre el navegador)

Las carpetas `Permisos_Scan/` y `config/` se crean automáticamente en el mismo directorio donde esté el `.exe`.

---

## 8. Guía de Desarrollo Local

### Requisitos previos

- Node.js 18 o superior (verificar con `node --version`)
- npm 9 o superior (viene con Node.js)
- Windows (el servidor requiere PowerShell y las APIs de Windows)

Si no tienes Node.js instalado, corre el script de instalación automática:
```powershell
powershell -ExecutionPolicy Bypass -File setup\instalar-node.ps1
```

### Arrancar el entorno de desarrollo

**Terminal 1 — Backend:**
```bash
cd server
npm install
node index.js
# Servidor corriendo en http://localhost:7890
# Escaneos en: C:\ruta\proyecto\Permisos_Scan
# Config en:   C:\ruta\proyecto\config
```

**Terminal 2 — Frontend con hot reload:**
```bash
cd client
npm install
npm start
# Angular CLI corre en http://localhost:4200
# Las peticiones /api/* se redirigen al 7890 via proxy.conf.json
```

Visita `http://localhost:4200` para desarrollo. El hot reload recarga automáticamente al guardar cambios en el código Angular.

**Por qué dos terminales en dev pero uno en producción:** En dev, Angular CLI sirve los archivos del frontend y Express sirve solo la API. El archivo `proxy.conf.json` hace que las peticiones `/api/*` desde Angular en el 4200 lleguen al Express en el 7890. En producción (el `.exe`), Express hace ambas cosas.

### Recompilar Angular manualmente

Después de modificar cualquier archivo en `client/src/`, hay que recompilar para que los cambios se reflejen en el `.exe`:

```bash
cd client
npm run build
# Genera client/dist/client/browser/
```

En modo desarrollo con `npm start` esto es automático.

### Variables de entorno disponibles

```bash
APP_USER=miusuario APP_PASS=mipassword node index.js   # Credenciales (alternativa a config/credenciales.json)
APP_JWT_SECRET=texto-largo-aleatorio node index.js     # Opcional: sesiones que sobreviven a reinicios
SCAN_DIR=D:\mis-escaneos node index.js                 # Cambiar directorio de escaneos
```

En desarrollo lo más cómodo es crear `config/credenciales.json` en la raíz del proyecto (junto a `server/` y `client/`). Sin credenciales, el login responde 503.

---

## 9. Cómo Extender la Aplicación

### 9.1 Agregar un Nuevo Endpoint en el Backend

Todos los endpoints siguen el mismo patrón. Ejemplo: agregar un endpoint para buscar carpetas con permisos "peligrosos" (acceso total para todos):

```javascript
// En server/index.js, antes de la ruta fallback de Angular

app.get('/api/riesgos', authMiddleware, (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: 'filename requerido' });

  try {
    const filePath = path.join(SCAN_DIR, path.basename(filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Escaneo no encontrado' });

    const scan = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const riesgos = (scan.datos || []).filter(d =>
      d.tipo === 'Control Total' &&
      (d.usuarioCorto.toLowerCase().includes('todos') ||
       d.usuarioCorto.toLowerCase().includes('everyone'))
    );
    res.json({ total: riesgos.length, carpetas: riesgos });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
```

Si el endpoint usa PowerShell, usar el helper `runPS(script, res)` ya definido en el archivo o seguir el patrón de `spawn()` de los endpoints existentes.

### 9.2 Agregar un Nuevo Componente Angular

Ejemplo: agregar una pantalla de "Reporte de Riesgos" accesible en `/riesgos`.

**Paso 1:** Crear el componente en `client/src/app/features/riesgos/riesgos.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-white mb-4">Carpetas de Riesgo</h1>
      <div *ngFor="let item of riesgos()" class="bg-red-900/30 rounded p-3 mb-2">
        <p class="text-red-300 font-mono text-sm">{{ item.carpeta }}</p>
        <p class="text-gray-400 text-xs">{{ item.usuario }} - {{ item.tipo }}</p>
      </div>
    </div>
  `
})
export class RiesgosComponent implements OnInit {
  riesgos = signal<any[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>('/api/riesgos?filename=mi-escaneo.json').subscribe(
      data => this.riesgos.set(data.carpetas)
    );
  }
}
```

**Paso 2:** Agregar la ruta en `app.config.ts`:

```typescript
{
  path: 'riesgos',
  loadComponent: () => import('./features/riesgos/riesgos.component')
    .then(m => m.RiesgosComponent),
  canActivate: [authGuard]  // Si requiere login
}
```

**Paso 3:** Si el componente necesita datos del estado global de escaneos, inyectar `ScanService` en vez de hacer llamadas HTTP directas.

### 9.3 Agregar Campos al Resultado del Escaneo

Para agregar un campo nuevo a cada registro de permiso (ejemplo: el owner/propietario de la carpeta):

**Paso 1 — PowerShell** (en el script dentro de `POST /api/scan`):

```powershell
$datos.Add([PSCustomObject]@{
  carpeta      = $carpeta.FullName
  nivel        = $nivel
  usuario      = $usuarioStr
  usuarioCorto = $usuarioStr.Split([IO.Path]::DirectorySeparatorChar)[-1]
  tipo         = $tipo
  acceso       = $entrada.AccessControlType.ToString()
  heredado     = $entrada.IsInherited
  owner        = $acl.Owner    # <-- NUEVO CAMPO
})
```

**Paso 2 — Interfaz TypeScript** (`core/models/models.ts`):

```typescript
export interface PermissionRecord {
  // ... campos existentes ...
  owner?: string;  // <-- NUEVO CAMPO (opcional para compatibilidad con escaneos viejos)
}
```

**Paso 3 — Mapeo en el servicio** (`scan.service.ts` en `processRawScan`):

```typescript
const datos = raw.datos.map((d: any) => ({
  // ... mapeos existentes ...
  owner: d.owner || 'Desconocido'  // <-- NUEVO MAPEO
}));
```

**Paso 4 — Usar en un componente** (ejemplo en `results.component.html`):

```html
<span class="text-gray-500 text-xs">Propietario: {{ perm.owner }}</span>
```

### 9.4 Cambiar el Puerto del Servidor

Cambiar `const PORT = 7890` en `server/index.js`. También actualizar:
- `proxy.conf.json` en el cliente (cambiar `"target": "http://localhost:NUEVO_PUERTO"`)
- Los archivos `.bat` que abren `http://localhost:7890`

---

## 10. Seguridad — Análisis y Recomendaciones

La aplicación está pensada para uso en la red interna.

### Medidas incluidas desde octubre 2026

- **Sin credenciales en el código:** cada equipo crea su administrador con el asistente de primer uso, y la contraseña se guarda como hash (ver 4.1).
- **Secreto de sesión aleatorio** en cada arranque, o propio de cada equipo con `APP_JWT_SECRET`.
- **Datos de AD solo con sesión:** `/api/addata`, `/api/usergroups` y `/api/groupusers` exigen iniciar sesión.
- **Límite de intentos:** el login se bloquea 15 minutos tras 5 fallos desde la misma IP.
- **Datos del usuario fuera de los scripts de PowerShell:** viajan como variables de entorno (ver 4.4).

**Versiones anteriores:** los `PermisosScan.exe` construidos antes de octubre de 2026 deben reemplazarse por uno nuevo (`CONSTRUIR_EXE.bat`), y se debe crear una contraseña nueva, distinta de la anterior.

### Recomendaciones para cada instalación

- **Acceso restringido:** permitir el acceso al puerto de la aplicación solo desde los equipos autorizados del área de Sistemas.
- **Consultas sin sesión:** el historial y el visor no piden sesión para poder compartir resultados. Si no se comparten con personas sin cuenta, conviene protegerlos también, porque los escaneos son información interna.
- **HTTPS:** si se accede desde otros equipos de la red, publicarla detrás de un proxy inverso con HTTPS.
- **Tiempo máximo de escaneo:** en redes pequeñas, reducirlo a 5–10 minutos para no dejar procesos de PowerShell corriendo demasiado tiempo.

Los detalles de seguridad propios de cada instalación se mantienen en la documentación interna del área de Sistemas.

---

## 11. Manual de Usuario

### 11.1 Inicio Rápido

#### La primera vez en cada equipo: crear el administrador

La aplicación no trae usuario ni contraseña incluidos. La primera vez, ella misma pide crearlos:

1. Arranca la aplicación (`ABRIR.bat` o `EJECUTAR.bat`) **en el equipo donde está instalada**.
2. Se abre sola la pantalla **"Configurar administrador"**. Elige usuario y contraseña (mínimo 8 caracteres), repítela y pulsa **Crear administrador**.
3. Entras directo al panel. Desde ese momento, esas son las credenciales de inicio de sesión.

- Desde **otro equipo** de la red no se puede crear el administrador: la pantalla avisa "La aplicación aún no está configurada" y pide hacerlo en el equipo donde está instalada.
- Solo se crea **una vez**; después la pantalla desaparece.
- Usa una contraseña nueva, distinta de la que se usaba antes.
- Si el equipo usaba un `PermisosScan.exe` construido antes de octubre 2026, reemplázalo por uno nuevo (`CONSTRUIR_EXE.bat`) y borra las copias viejas. Es el único paso manual, y se hace una sola vez.

**Cambiar la contraseña:** en el panel, botón con ícono de llave junto a "Cerrar sesión". Pide la contraseña actual y la nueva dos veces.

**Olvidé la contraseña:** cierra la aplicación, borra `config/credenciales.json` (junto al `.exe`, o en `permisos-scan/config/` si usas el código fuente) y vuelve a abrirla en ese equipo. Reaparece "Configurar administrador".

#### Arrancar la aplicación

La forma más simple de iniciar la aplicación:

1. Hacer doble clic en **`ABRIR.bat`**.
2. Se abre el navegador en `http://localhost:7890`.
3. Si el servidor tarda en arrancar (primera vez), `ABRIR.bat` espera hasta 30 segundos automáticamente.
4. La pantalla inicial es el **Historial** de escaneos guardados.

Si tienes el código fuente con Node.js instalado, usa **`EJECUTAR.bat`** en vez de `ABRIR.bat`. La diferencia es que `EJECUTAR.bat` instala dependencias y compila si es necesario.

### 11.2 Pantalla de Historial (Pública)

Esta pantalla no requiere login y es la primera que ve cualquier usuario.

Muestra una lista de todos los escaneos guardados, ordenados del más reciente al más antiguo. Para cada escaneo se ve:
- El nombre (codifica la ruta, profundidad, usuario filtrado y fecha).
- El tamaño del archivo (los escaneos grandes indican más carpetas y registros).
- La fecha y hora en que se realizó.

Al hacer clic en cualquier escaneo se abre el **Visor** en modo de solo lectura, sin necesidad de login.

### 11.3 Login de Administrador

Para realizar nuevos escaneos, eliminar escaneos del historial, o re-escanear rutas existentes, es necesario hacer login.

Desde el historial, haz clic en el botón **"Iniciar sesión"** (o ve directamente a `/login`).

- **Usuario y contraseña:** los entrega el equipo de sistemas. No se publican en esta documentación.

La sesión es válida por **8 horas**. Al cerrar la pestaña o el navegador, la sesión se cierra y hay que volver a hacer login.

### 11.4 Dashboard — Realizar un Escaneo

Una vez autenticado, el dashboard muestra:

- **Sidebar izquierdo:** las unidades de red disponibles y los escaneos ya cargados en la sesión actual.
- **Área principal:** los resultados del escaneo activo (o vacía si no hay ninguno).

Para iniciar un nuevo escaneo:

1. Haz clic en **"Nuevo escaneo"** o en el ícono `+` en el sidebar.
2. En el modal de configuración:
   - **Unidad de red:** selecciona una unidad de la lista (se detectan automáticamente) o escribe la ruta manualmente, por ejemplo `Z:\Administrativa\Finanzas`.
   - **Profundidad:** cuántos niveles de subcarpetas explorar. La barra tiene marcas orientativas: Rápido (1), Recomendado (4), Completo (7).
   - **Filtrar por usuario (opcional):** escribe el nombre de un usuario del dominio. La aplicación sugiere usuarios que aparecen en esa ruta. Si lo dejas vacío, verás los permisos de todos los usuarios.

3. Haz clic en **"Escanear"**.

La pantalla muestra un indicador de carga mientras PowerShell trabaja. El tiempo varía según la cantidad de carpetas y la velocidad de la red: desde segundos para una carpeta pequeña hasta varios minutos para unidades completas.

**Consejo de profundidad:** Para una primera exploración de una unidad completa, empieza con profundidad 2 o 3. Esto es suficiente para ver la estructura principal y es mucho más rápido. Si necesitas ver subcarpetas específicas, usa una ruta más concreta con mayor profundidad.

### 11.5 Interpretar los Resultados

Los resultados tienen dos pestañas:

**Pestaña Usuarios:**

Muestra todos los usuarios y grupos que tienen algún permiso en la ruta escaneada. La tabla tiene columnas para:
- Nombre del usuario o grupo.
- Rol inferido (Administrador, Usuario, etc.). Este rol es una estimación basada en el nombre y no corresponde a roles reales de la organización.
- Total de carpetas donde tiene acceso.
- Resumen de tipos de permiso (cuántas carpetas tiene en cada categoría).

Al hacer clic en un usuario se abre el panel de detalle con:
- Lista de todas las carpetas donde tiene acceso, con el tipo de permiso y si es heredado.
- Si el permiso viene a través de un grupo AD, aparece el nombre del grupo junto a un ícono de usuarios.
- Los grupos AD a los que pertenece el usuario (si hay datos AD disponibles).

**Pestaña Carpetas:**

Muestra el árbol de carpetas de la ruta escaneada. Las primeras carpetas aparecen expandidas por defecto. Al hacer clic en una carpeta se ve la lista de usuarios con acceso a esa carpeta específica.

**Tipos de permiso:**

- **Control Total:** puede leer, escribir, crear, borrar y cambiar permisos.
- **Lectura y Escritura:** puede leer y modificar archivos.
- **Escritura:** puede crear y modificar archivos pero no necesariamente leer todo.
- **Lectura:** puede ver el contenido pero no modificar.
- **Especial:** combinación de permisos individuales que no encaja en las categorías anteriores.

**Permisos heredados:** La columna o indicador "Heredado" significa que el permiso viene de una carpeta padre, no está configurado específicamente en esa carpeta.

### 11.6 Visor Público de Escaneos

Cualquier escaneo guardado tiene una URL pública de la forma:
```
http://localhost:7890/ver/nombre-del-escaneo.json
```

Esta URL se puede compartir con personas que necesitan consultar los resultados pero no realizar nuevos escaneos. El visor no requiere login y tiene las mismas capacidades de exploración que el dashboard, pero sin los botones de re-escaneo o eliminación. **Sin sesión no muestra los grupos ni los miembros de AD** ("Inicia sesión para ver los grupos"); si quien lo abre ya inició sesión en ese navegador, sí los ve.

### 11.7 Exportar Resultados

**Estado actual (octubre 2026): la interfaz no tiene botón de exportar.** `ScanService` tiene `exportJSON()` y `exportCSV()`, y `ResultsComponent` declara las salidas `exportJSON`/`exportCSV` que el dashboard escucha, pero ningún botón las emite, así que el usuario no puede usarlas.

Mientras tanto, para sacar los datos:
- **JSON completo:** copiar el archivo desde `Permisos_Scan/`.
- **Para Excel:** abrir ese JSON con Excel (Datos → Obtener datos → Desde archivo → JSON).

Si se conecta el botón, `exportCSV` genera una fila por registro con las columnas: carpeta, nivel, usuario, usuarioCorto, tipo, acceso, heredado.

### 11.8 Estructurador NAS

Desde el dashboard, el botón **Estructurador** del encabezado abre `/estructurador` (requiere sesión iniciada).

1. **Elige la Unidad** en el selector de arriba (por ejemplo, el NAS principal o una unidad de OneDrive). Con `+` creas una nueva.
2. **Navega por columnas:** al hacer clic en un Área aparecen sus Cargos y Procesos; al hacer clic en un Cargo, los Procesos de los que es dueño; al hacer clic en un Proceso, su detalle (descripción, dueño o encargado, participantes). Un Proceso suelto puede tener Subprocesos.
3. **Crea elementos** con el botón `+` de cada columna, que pregunta qué tipo de elemento quieres agregar.
4. **Gestiona personas** con el botón global junto a la búsqueda → **Miembro**. Ahí puedes crear, editar o eliminar Miembros, o usar **Importar de AD** para traer personas reales del directorio. Las personas importadas quedan sin cargo hasta que se les asigna uno.
5. **Busca** con la barra superior: resalta las coincidencias por nombre o código en todas las columnas.

Si al eliminar algo aparece un aviso de que tiene elementos asociados, primero hay que reasignar o eliminar esos elementos.

---

## 12. Referencia de Errores Comunes

**"Ruta no accesible" al escanear:**
La ruta especificada no existe o la cuenta del sistema no tiene permisos de lectura sobre ella. Verificar que la ruta sea correcta y que la unidad de red esté montada. Si la unidad se desconectó, remontarla y volver a intentar.

**"Sin respuesta PS" o "Error parseando":**
PowerShell no devolvió datos válidos. Puede ocurrir si la ruta tiene caracteres especiales poco comunes en el nombre, si PowerShell está bloqueado por directivas de grupo, o si la unidad de red se desconectó durante el escaneo. Intentar con una ruta más corta y sin caracteres especiales.

**El escaneo tarda mucho tiempo:**
Es normal para rutas con miles de carpetas. Una unidad de red completa a profundidad 4 puede tener decenas de miles de carpetas y tardar 10-20 minutos. Reducir la profundidad o apuntar a una subcarpeta específica.

**Grupos AD no aparecen o están vacíos:**
La actualización de grupos AD requiere que el equipo esté en un dominio de Active Directory y que la cuenta del sistema tenga acceso de lectura al LDAP. Si no hay dominio (red de trabajo grupo), los grupos AD nunca se cargarán por LDAP. En ese caso, editar manualmente el archivo `config/ad-groups.json` con los grupos y usuarios relevantes.

**"El servidor no respondió" en ABRIR.bat:**
El ejecutable tardó más de 30 segundos en iniciar. Puede ser que Windows Defender esté analizando el nuevo ejecutable (primera ejecución). Esperar un momento y volver a ejecutar. Si persiste, comprobar si hay un firewall bloqueando el puerto 7890.

**La sesión se cerró sola:**
El token JWT expira a las 8 horas. También se pierde al cerrar el navegador o la pestaña (se almacena en sessionStorage, no en localStorage) y **cada vez que se reinicia el servidor** (el secreto de sesión cambia en cada arranque). Volver a hacer login.

**"La aplicación aún no está configurada":**
Todavía no se creó el administrador y la página se abrió desde otro equipo. Abrir `http://localhost:7890/login` en el equipo donde está instalada la aplicación y crear el administrador (sección 11.1).

**"La contraseña actual no es correcta" al cambiar la contraseña:**
La contraseña actual escrita no coincide. La sesión sigue abierta; volver a intentarlo. Si no la recuerdas, sigue "Olvidé la contraseña" en la sección 11.1.

**"Demasiados intentos fallidos":**
Hubo 5 intentos fallidos de login desde ese equipo. Esperar 15 minutos o reiniciar el servidor.

**El visor no muestra grupos de AD:**
Es lo esperado sin sesión. Iniciar sesión en ese mismo navegador y recargar el visor.

**Un escaneo viejo ya no aparece en el historial:**
Si alguien eliminó el archivo `.json` de la carpeta `Permisos_Scan/` manualmente, ya no aparece. El historial refleja exactamente los archivos presentes en esa carpeta.

---

*PermisosScan v2.0 — Documentación técnica generada en Mayo 2026, actualizada en Octubre 2026 (Estructurador NAS, integración AD por `memberOf`, archivos ignorados por git, correcciones de seguridad, asistente de primer uso y cambio de contraseña desde la app).*
