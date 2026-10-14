# Estructurador NAS — Documentación del estado actual

> Este documento describe el módulo **tal como está implementado hoy** en la rama `feature/estructurador-nas`. Ya no es un brief de planificación: es la referencia viva del módulo. Actualízalo cada vez que se agregue o cambie algo relevante.
>
> Para la arquitectura general de PermisosScan (fuera del Estructurador), ver [Arquitectura actual](./arquitectura.md).

---

## Resumen ejecutivo

**Estructurador NAS** es un módulo dentro de la app web **PermisosScan** (mismo login, mismo shell de UI) que funciona como base de datos interna del equipo de sistemas para registrar y navegar el mapa organizacional de la empresa: **Unidades → Áreas → Cargos → Procesos → Miembros**. No tiene relación funcional con el lector de permisos (el módulo original de PermisosScan); son independientes y coexisten por conveniencia operativa.

**Usuarios:** 1-2 personas del equipo de sistemas. Protegido por el `authGuard`/JWT existente. Sin multi-tenancy ni control de accesos granular.

**Ruta:** `/estructurador`, accesible desde el dashboard (`authGuard`).

---

## Stack técnico (heredado de PermisosScan, no modificado)

**Frontend (`client/`):**
- Angular `17.3` con **standalone components**.
- Estado: Angular **Signals** para estado local, **BehaviorSubject** (RxJS) para estado compartido en `EstructuradorService`.
- Estilos: **Tailwind CSS** exclusivamente. Tema oscuro fijo: `bg-gray-950`, acentos `emerald`.
- `HttpClient` con rutas relativas (`/api/...`), interceptor `authInterceptor` inyecta el JWT.

**Backend (`server/`):**
- Módulo aislado en `server/estructurador.js`, registrado en `server/index.js` con `registerEstructuradorRoutes(app, authMiddleware)`.
- Persistencia en `config/estructurador.json` (archivo propio, nunca comparte datos con `Permisos_Scan/*.json`).
- IDs con `uuid` v4 (JS puro, compatible con `pkg`).
- Escrituras serializadas con una cadena de promesas (`writeChain`) para evitar corrupción por escrituras concurrentes.

**Empaquetado:** mismo `pkg` / `PermisosScan.exe` que el resto de la app. Sin dependencias nuevas con bindings nativos.

**Idioma:** dominio en español (`unidad`, `area`, `cargo`, `proceso`, `miembro`, `dueño`, `subproceso`); tipos/framework en inglés.

---

## Modelo de datos

### Entidades

```ts
Unidad {
  id, codigo, nombre,
  tipo: 'NAS' | 'OneDrive',
  // contadores internos de numeración, uno por unidad (ver "Numeración" abajo):
  contadorNivel1, contadorNivel2, contadorNivel3, contadorSubprocesos
}

Area {
  id, codigo, nombre,
  unidadId          // pertenece a exactamente una Unidad
}

Cargo {
  id, codigo, nombre,
  tipo: 'NAS' | 'OneDrive',   // propio, no derivado del área
  areaIds: string[],          // muchos-a-muchos con Área (ver "Unidades y Cargos compartidos")
  duenoId?: string            // opcional; debe ser un Miembro cuyo cargoId === este cargo
}

Proceso {
  id, codigo, nombre, descripcion,
  unidadId,                   // pertenece a exactamente una Unidad, nunca se comparte
  areaId?,                    // si es de Nivel 2/3 (dentro de un área)
  cargoDuenoId?,               // si es de Nivel 3 (dueño = un cargo)
  encargadoId?,                 // solo cuando NO tiene cargoDuenoId: un Miembro o Cargo opcional
  procesoPadreId?,             // si es un subproceso (un solo nivel de anidamiento)
  miembroIds: string[]         // participantes: Miembros y/o Cargos directamente
}

Miembro {
  id, nombre,
  cargoId?,   // opcional: puede quedar "sin cargo" (p. ej. recién importado de AD)
  sam?        // solo si fue importado desde el directorio AD; guarda el sAMAccountName origen
}
```

### Cómo se arma la jerarquía visual (Nivel 1 / 2 / 3 / Subproceso)

Dentro de una Unidad activa:

- **Nivel 1:** Áreas de esa unidad + Procesos "sueltos" (`unidadId` set, sin `areaId` ni `procesoPadreId`).
- **Nivel 2** (al seleccionar un Área): Cargos cuyo `areaIds` incluye esa área + Procesos del área sin cargo dueño (`areaId` set, sin `cargoDuenoId`).
- **Nivel 3** (al seleccionar un Cargo): Procesos con `cargoDuenoId` igual a ese cargo (filtrados también por pertenecer a la unidad activa, ya que `Proceso.unidadId` es siempre específico de una unidad).
- **Subproceso** (al seleccionar un Proceso de Nivel 1): Procesos con `procesoPadreId` igual a ese proceso. Solo se admite un nivel de anidamiento (no se pueden crear subprocesos de un subproceso).

### Unidades y Cargos compartidos (regla central del modelo)

- Una **Unidad** tiene un `tipo` (`NAS` u `OneDrive`). Puede haber varias unidades del mismo tipo.
- **Área** y **Proceso** pertenecen siempre a una sola Unidad — nunca se comparten entre unidades.
- **Cargo** es la única entidad que se comparte: **el mismo registro de Cargo puede estar vinculado a Áreas de distintas Unidades, siempre que esas Unidades tengan el mismo `tipo`.** Esto se logra con `Cargo.areaIds` (array) en vez de un solo `areaId`, y validando en cada escritura que el `tipo` del Cargo coincida con el `tipo` de la Unidad dueña de cada área que se le vincule.
- Como consecuencia, un **Miembro** (que pertenece a un solo Cargo vía `cargoId`) queda accesible/visible en cualquier Unidad donde ese Cargo esté vinculado — la compartición de Miembros es transitiva a través del Cargo, sin campos adicionales en `Miembro`.
- Al crear un Proceso con `cargoDuenoId` + `areaId`, si ese Cargo todavía no está vinculado a esa Área, el backend lo vincula automáticamente (agrega el `areaId` a `cargo.areaIds`) — evita el paso manual de "primero vincula el cargo al área, luego crea el proceso".

### Numeración (`codigo`)

Los `codigo` son legibles y con padding a 3 dígitos (`001`, `002`, ...), pero **el contador correcto depende de qué se está numerando**, no es un único contador global:

- **Nivel 1 / 2 / 3 / Subproceso**: cada **Unidad** tiene sus propios 4 contadores (`contadorNivel1/2/3/Subprocesos`), independientes de las demás unidades. Dos unidades distintas pueden tener ambas un `001_Financiera` sin chocar.
- Dentro de un mismo nivel, Área y Proceso-suelto (Nivel 1) **comparten** el contador — se numeran en el orden real en que se crean, entrelazados. Lo mismo aplica a Cargo/Proceso-de-área (Nivel 2).
- **Cargo**: como no pertenece a una Unidad específica (se comparte por tipo), tiene su propio contador **por tipo** (`contadorCargosNAS`, `contadorCargosOneDrive`) a nivel global del archivo, no por unidad.
- **Miembro** no tiene `codigo` (nunca lo tuvo).

### Migración de datos antiguos

`loadData()` detecta un archivo sin `unidades` (formato previo a este modelo) y migra una sola vez: crea una `"Unidad Principal"` (tipo `NAS`), le asigna `unidadId` a todas las áreas/procesos existentes, convierte cada `cargo.areaId` en `cargo.areaIds: [areaId]` con `tipo: 'NAS'`, y arranca los contadores por-tipo de Cargo desde el mayor `codigo` ya usado (para no generar duplicados en el siguiente cargo creado).

---

## Almacenamiento

- Archivo: `config/estructurador.json`. Nunca se lee ni se escribe en `Permisos_Scan/*.json`.
- **`config/ad-groups.json`** se **lee** (solo lectura) para dos cosas puntuales: nada relacionado con el árbol organizacional en sí, sino exclusivamente para poblar la importación de Miembros desde AD (ver más abajo). El Estructurador nunca escribe ese archivo — sigue siendo terreno exclusivo del lector de permisos / login.
- Escrituras serializadas con una cadena de promesas (`persist()` encola sobre `writeChain`).

---

## Backend — endpoints (`server/estructurador.js`)

Todos bajo `/api/estructurador/`, protegidos por `authMiddleware`.

### Unidades
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/unidades` | Listar |
| POST | `/unidades` | Crear `{ nombre, tipo }` |
| PUT | `/unidades/:id` | Editar `{ nombre }` (el `tipo` no se puede cambiar tras crear) |
| DELETE | `/unidades/:id` | Eliminar (falla 409 si tiene áreas o procesos) |

### Áreas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/areas` | Listar (query opcional `?unidadId=`) |
| POST | `/areas` | Crear `{ nombre, unidadId }` |
| PUT | `/areas/:id` | Editar `{ nombre }` |
| DELETE | `/areas/:id` | Eliminar (falla si tiene cargos vinculados o procesos directos) |

### Cargos (compartidos por tipo)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/cargos` | Listar (queries opcionales `?areaId=`, `?tipo=`) |
| POST | `/cargos` | Crear `{ nombre, tipo, areaIds? }` |
| PUT | `/cargos/:id` | Editar `{ nombre?, areaIds?, duenoId? }` — `duenoId` debe ser un Miembro ya asociado a ese cargo |
| DELETE | `/cargos/:id` | Eliminar (falla si es dueño de procesos o tiene miembros) |

### Procesos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/procesos` | Listar (queries opcionales `?unidadId=`, `?areaId=`, `?cargoDuenoId=`, `?procesoPadreId=`) |
| GET | `/procesos/:id` | Detalle con `miembros`/`encargado` expandidos (Miembro o Cargo) |
| POST | `/procesos` | Crear `{ nombre, descripcion?, unidadId, areaId?, cargoDuenoId?, encargadoId?, procesoPadreId?, miembroIds? }`. Si tiene `procesoPadreId` y el proceso padre tenía miembros, **se limpian automáticamente** (ver regla de subprocesos) |
| PUT | `/procesos/:id` | Editar |
| DELETE | `/procesos/:id` | Eliminar (falla si tiene subprocesos) |

### Miembros
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/miembros` | Listar (queries opcionales `?cargoId=`, `?tipo=`) |
| POST | `/miembros` | Crear `{ nombre, cargoId }` (cargo obligatorio en creación manual) |
| PUT | `/miembros/:id` | Editar `{ nombre?, cargoId? }`. Si cambia de cargo y era el dueño del anterior, se le quita el `duenoId` a ese cargo automáticamente |
| DELETE | `/miembros/:id` | Eliminar (limpia sus referencias en `miembroIds`/`encargadoId` de procesos y `duenoId` de cargos) |

### Importación desde Active Directory
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ad-usuarios` | Lista los `sAMAccountName` reales del directorio AD (leídos de `config/ad-groups.json`, ya sincronizado tras el login) que **todavía no** se han importado como Miembro |
| POST | `/miembros/importar-ad` | `{ sams: string[] }` — crea un Miembro por cada sam válido y no importado aún (`nombre = sam`, sin `cargoId`, con `sam` guardado para evitar duplicados en futuras importaciones) |

### Reglas de integridad aplicadas en la capa de datos
- Un Área pertenece a una sola Unidad; un Cargo puede estar en varias Áreas (de unidades del mismo tipo).
- Un Cargo puede ser dueño de varios Procesos; un Proceso tiene un solo Cargo dueño.
- Un Proceso puede tener varios Miembros/Cargos como participantes (`miembroIds`, relación N:M).
- Un Miembro pertenece a lo sumo un Cargo; puede participar en varios Procesos.
- Un Cargo, Proceso o Miembro asignado a algo (encargado, dueño, participante) debe ser del mismo `tipo` que la Unidad del Proceso al que se está vinculando.
- **Eliminación bloqueante:** no se puede eliminar una Unidad con áreas/procesos, un Área con cargos/procesos, un Cargo dueño de procesos o con miembros, ni un Proceso con subprocesos. Requiere reasignar/eliminar primero.
- **Eliminación en cascada:** al eliminar un Proceso/Miembro/Cargo se limpian automáticamente las referencias que dependían de él (`miembroIds`, `encargadoId`, `duenoId`).
- **Regla de subprocesos:** un Proceso que tiene subprocesos no conserva miembros/cargos participantes propios — al crear el primer subproceso, el backend vacía `miembroIds` del proceso padre. El frontend muestra una confirmación (`confirm()`) antes de dejar avanzar la creación cuando detecta que el padre ya tenía participantes.

---

## Frontend

### Estructura de carpetas

```
client/src/app/features/estructurador/
├── estructurador.component.ts        Contenedor principal (standalone)
├── estructurador.component.html
├── services/
│   └── estructurador.service.ts      Estado central: BehaviorSubject por colección + activos
├── models/
│   └── estructurador.models.ts       Unidad, Area, Cargo, Proceso, Miembro, ProcesoParticipante
└── components/
    ├── area-card/                    Card de área
    ├── cargo-card/                   Card de cargo (muestra "Dueño: X" si aplica)
    ├── proceso-card/                 Card de proceso/subproceso
    ├── entity-form-modal/            Modal único reutilizable para crear/editar Unidad/Área/Cargo/Proceso/Miembro
    ├── search-bar/                   Barra de búsqueda global
    ├── miembros-manager-modal/       Lista completa de Miembros (crear/editar/eliminar/importar AD)
    └── miembros-importar-ad-modal/   Checklist con buscador para elegir qué personas de AD importar
```

> `miembro-card/` existió en versiones anteriores y fue eliminado: la gestión de Miembros se centralizó en el modal `miembros-manager-modal`.

### Servicio (`EstructuradorService`, `providedIn: 'root'`)

- `BehaviorSubject` por colección: `unidades$`, `areas$`, `cargos$`, `procesos$`, `miembros$`.
- `BehaviorSubject` de selección activa: `activeUnidadId$`, `activeAreaId$`, `activeCargoId$`, `activeProcesoId$` (seleccionar una unidad/área/cargo limpia los niveles hijos).
- `loadAll()` llama `/api/estructurador/todo` una vez al iniciar; si no hay unidad activa, selecciona la primera de la lista.
- CRUD completo para las 5 entidades + `getAdUsuariosDisponibles()` / `importarMiembrosAd()`.
- Actualiza el estado local de forma optimista tras cada respuesta del backend (incluye la propagación local de `duenoId` cuando se reasigna el cargo de un miembro que era dueño).

### Navegación — columnas tipo Miller

**Selector de Unidad** (dropdown, no es una columna): fijo arriba de todo, encima de Nivel 1. Filtra qué Áreas/Procesos aparecen en Nivel 1. Tiene botón `+` para crear una Unidad nueva, y botones de editar/eliminar para la unidad activa.

**Columna 1 — Nivel 1** (Áreas + Procesos sueltos de la unidad activa):
- Botón `+` abre un selector: "Área" o "Proceso".
- Al seleccionar un Área → aparece Columna 2 con sus Cargos/Procesos.
- Al seleccionar un Proceso suelto → aparece una variante de Columna 2 con sus **Subprocesos** (con badge "Subproceso").

**Columna 2 — Nivel 2** (dentro de un Área activa):
- Cargos vinculados a esa área (vía `areaIds`) + Procesos del área sin cargo dueño.
- Botón `+` abre selector: "Cargo" o "Proceso".

**Columna 3 — Nivel 3** (dentro de un Cargo activo):
- Procesos con ese cargo como dueño.
- (La gestión de Miembros ya **no** vive aquí — se centralizó en el botón global, ver abajo.)

**Columna 4 — Detalle del proceso/subproceso activo:**
- Descripción, Área, Dueño o Encargado, lista de participantes (Miembros/Cargos) con botón "Agregar/quitar".
- Botones editar/eliminar.

**Botón global (junto a la barra de búsqueda):** abre un selector "Cargo" / "Miembro":
- **Cargo** → abre el mismo modal de creación de cargo (sin depender de tener un Área activa; el usuario elige tipo y áreas).
- **Miembro** → abre el gestor de Miembros (lista completa, crear/editar/eliminar, y botón **"Importar de AD"**).

**Importar de AD:** dentro del gestor de Miembros, abre un modal con buscador + checklist de las personas del directorio AD (`config/ad-groups.json`, ya filtrado a cuentas de persona reales, sin grupos ni cuentas de sistema) que aún no se han importado. Selección múltiple + "Seleccionar todos" (respeta el filtro de búsqueda activo). Los importados quedan sin cargo asignado hasta que se editan y se les asigna uno.

**Líneas conectoras entre columnas:** overlay SVG (`position: fixed`) que dibuja una línea horizontal con flecha desde la card activa de un nivel hasta el encabezado de la columna que revela, y calcula un `padding-top` dinámico en la columna siguiente para alinear su primera card con la altura de la card activa. Recalculado con `requestAnimationFrame` + `getBoundingClientRect()` en cada cambio de selección, scroll (por columna y del contenedor horizontal) y resize de ventana.

### Búsqueda global

Barra fija sobre las columnas. Filtra en vivo por nombre/código en Área, Cargo, Proceso; resalta (borde ámbar) las coincidencias dentro de cada columna sin cambiar la selección activa.

### Errores y feedback

- `alert()` para errores simples (mensaje tal cual lo devuelve el backend en `error.error.error`).
- `confirm()` nativo antes de eliminar, y antes de crear un subproceso cuando el proceso padre tiene participantes que se van a quitar.

---

## Restricciones críticas (siguen vigentes)

1. No modificar la lógica del lector de permisos (`server/index.js` solo gana el registro del módulo).
2. El Estructurador usa su propio archivo JSON; solo **lee** (nunca escribe) `config/ad-groups.json`, exclusivamente para la importación de Miembros desde AD.
3. Sin dependencias con bindings nativos (compatibilidad con `pkg`).
4. Dominio en español en variables, endpoints y UI.
5. Tema visual: Tailwind + dark theme + emerald, sin librerías de componentes.
6. Sin infraestructura de testing (el proyecto no la tiene).
7. Todo el trabajo en la rama `feature/estructurador-nas`, sin merge a `main` ni push a remoto salvo instrucción explícita del usuario.

---

## Fuera de alcance (todavía)

- Import/export masivo vía CSV/Excel (más allá de la importación puntual de personas desde AD).
- Historial de cambios / auditoría.
- Sincronización automática/continua con AD (la importación es manual, bajo demanda, no hay un job periódico).
- Vinculación funcional con los datos de escaneo de permisos del NAS (más allá de leer el directorio AD para nombres de personas).
- Tests unitarios o E2E.

---

## Historial de fases (completadas)

1. **Backend base:** CRUD de Área/Cargo/Proceso/Miembro, DAL en JSON con cola de escritura.
2. **Frontend base:** ruta, servicio, columna de Áreas.
3. **Desglose completo:** columnas de Cargos, Procesos/Miembros, detalle de Proceso.
4. **Refinamiento:** búsqueda global, integridad referencial, pulido visual.
5. **Regresión + empaquetado:** verificación de que el lector de permisos sigue intacto, build `.exe`.
6. **Iteración post-lanzamiento** (en producción de facto, probado en navegador): fix de selección de cards (trackBy), elección Área/Proceso en Nivel 1, subprocesos (un nivel de anidamiento), procesos directos de un área sin cargo dueño, numeración por contador compartido por columna visual, líneas conectoras entre niveles, botón global Cargo/Miembro (reemplazando la sección de Miembros de Nivel 3).
7. **Unidades:** entidad `Unidad` (tipo NAS/OneDrive), `Area`/`Proceso` scoped a una unidad, `Cargo` convertido a relación muchos-a-muchos con Área (`areaIds`) para permitir compartir Cargos/Miembros entre unidades del mismo tipo sin romper la navegación de 3 niveles existente. Migración automática de datos previos a una "Unidad Principal".
8. **Dueño de Cargo + importación desde AD:** campo `Cargo.duenoId` (debe ser un miembro ya asociado al cargo), y flujo de importación de personas reales desde el directorio AD ya sincronizado como Miembros (con buscador y deduplicación por `sam`).

---

## Criterios de aceptación

- [x] Ruta `/estructurador` accesible desde el dashboard, protegida con `authGuard`.
- [x] CRUD funcional para las 5 entidades (Unidad, Área, Cargo, Proceso, Miembro) desde la interfaz.
- [x] Vista de columnas con desglose funcional (Unidad → Nivel 1 → Nivel 2 → Nivel 3 → Detalle, + Subprocesos).
- [x] Búsqueda global funcionando con filtrado en vivo.
- [x] Integridad referencial aplicada (no se pueden eliminar entidades con dependencias sin reasignación).
- [x] Persistencia en `config/estructurador.json` estable entre reinicios del server, con migración automática de datos previos.
- [x] Escrituras serializadas.
- [x] Cargos/Miembros compartibles entre Unidades del mismo tipo sin romper la navegación de 3 niveles.
- [x] Importación de personas reales desde AD como Miembros.
- [x] El lector de permisos sigue funcionando exactamente igual: login, escaneos, historial, viewer.
- [x] Empaquetable con `pkg` / `.exe` (sin dependencias nuevas con bindings nativos).
- [x] Estilo visual consistente con el resto de la app.
