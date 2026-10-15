# PermisosScan

Aplicación web interna del equipo de sistemas para **auditar quién tiene acceso a qué** en las carpetas de red (NAS) y para **llevar el mapa organizacional** de áreas, cargos, procesos y personas.

Corre en un equipo Windows del dominio: se abre con un doble clic y se usa desde el navegador en `http://localhost:7890`.

---

## Por qué se hizo

Windows guarda los permisos de cada carpeta en su lista de control de acceso (ACL), pero solo deja verlos **carpeta por carpeta** (clic derecho → Propiedades → Seguridad). Con eso es casi imposible responder preguntas que el equipo de sistemas recibe a menudo:

- ¿A qué carpetas del NAS tiene acceso esta persona?
- ¿Quién puede modificar o borrar la carpeta de Finanzas?
- ¿Ese acceso se le dio directamente o lo hereda por estar en un grupo de Active Directory?
- Cuando alguien cambia de cargo o se retira, ¿qué accesos le quedaron abiertos?

Responderlas a mano implica revisar cientos o miles de carpetas y cruzar cada grupo con sus miembros en Active Directory. PermisosScan hace ese recorrido automáticamente y presenta el resultado en una sola pantalla.

Además, hacía falta un lugar donde registrar **cómo está organizada la empresa** (unidades, áreas, cargos, procesos y quién participa en cada uno), que es la base para decidir qué permisos *debería* tener cada persona. Para eso se agregó el **Estructurador NAS**.

## Para qué sirve

**Lector de permisos**
- Recorre una unidad o carpeta de red hasta la profundidad elegida y lee los permisos de cada carpeta.
- Muestra los resultados de dos formas: **por usuario** (todas las carpetas a las que accede una persona o grupo) y **por carpeta** (un árbol donde se ve quién tiene acceso a cada carpeta).
- Clasifica los permisos en categorías claras: Control Total, Lectura y Escritura, Escritura, Lectura y Especial. También indica si el permiso es heredado y si viene a través de un grupo de AD.
- Guarda cada escaneo, de modo que se puede volver a consultar sin repetirlo y compartir un enlace de solo lectura con quien lo necesite.

**Estructurador NAS**
- Registra la estructura de la organización: **Unidades → Áreas → Cargos → Procesos → Miembros**.
- Permite navegarla por columnas (como un explorador de archivos) y buscar por nombre o código.
- Importa personas reales desde Active Directory para no tener que escribirlas a mano.
- Impide borrar elementos que todavía tienen otros asociados, para no dejar registros huérfanos.

**Para qué le sirve al equipo:** las revisiones de accesos dejan de tomar horas, se detectan permisos excesivos (por ejemplo, "Todos" con Control Total) y se puede justificar qué acceso corresponde a cada cargo o proceso.

## Cómo funciona

```
Navegador (Angular)
      │  HTTP + sesión con token (JWT)
      ▼
Servidor local Node.js / Express (puerto 7890)
      │                         │
      │ PowerShell              │ archivos JSON
      ▼                         ▼
Permisos NTFS y            Permisos_Scan/   (escaneos guardados)
Active Directory (LDAP)    config/          (caché de AD y datos del Estructurador)
```

1. **Arranque:** `ABRIR.bat` (versión empaquetada) o `EJECUTAR.bat` (desde el código fuente) inicia el servidor y abre el navegador.
2. **Inicio de sesión:** las funciones de administración y los datos de AD requieren el usuario y la contraseña configurados en el equipo. Al iniciar sesión, el servidor actualiza en segundo plano la lista de usuarios y grupos de Active Directory y la guarda en `config/ad-groups.json`.
3. **Escaneo:** el administrador elige la ruta, la profundidad y, si quiere, un usuario concreto. El servidor genera un script de PowerShell que recorre las carpetas y lee sus permisos (`Get-Acl`). Si se filtró por usuario, también incluye los permisos que la persona recibe a través de sus grupos de AD.
4. **Resultado:** el escaneo se guarda como un archivo JSON en `Permisos_Scan/`. El navegador lo organiza por usuario y por carpeta para que la consulta sea instantánea.
5. **Consulta pública:** el historial (`/`) y el visor (`/ver/<archivo>`) no requieren sesión, de modo que se pueden compartir resultados sin entregar acceso de administrador. Sin sesión no se muestran los grupos de AD.
6. **Estructurador:** en `/estructurador` (requiere sesión), cada cambio se guarda de inmediato en `config/estructurador.json`.

No hay base de datos: todo se guarda en archivos JSON junto a la aplicación. Por eso funciona sin instalar nada más en el equipo, pero **solo funciona en Windows** y necesita que el equipo esté en el dominio para leer Active Directory.

## Cómo usarla la próxima vez

### 1. Primera vez en un equipo: crear el administrador

La aplicación **no trae usuario ni contraseña incluidos**. La primera vez que se abre en un equipo, ella misma pide crearlos:

1. Arranca la aplicación (`ABRIR.bat` o `EJECUTAR.bat`) **en el equipo donde está instalada**.
2. Se abre sola la pantalla **"Configurar administrador"**. Elige un usuario y una contraseña (mínimo 8 caracteres) y pulsa **Crear administrador**.
3. Listo: entras directo al panel. Desde ese momento, esas son las credenciales para iniciar sesión.

Qué hay que saber:
- **Solo se puede hacer desde el propio equipo.** Quien abra la app desde otro equipo de la red antes de configurarla verá *"La aplicación aún no está configurada"* y no podrá crear la cuenta. Así nadie puede adelantarse y quedarse con el administrador.
- **Solo se puede hacer una vez.** Cuando ya existe un administrador, la pantalla desaparece y nadie puede reemplazarlo desde la app.
- **Usa una contraseña nueva**, distinta de la que se usaba antes.
- La contraseña se guarda **cifrada** (hash) en `config/credenciales.json`. Ese archivo no se sube a git.
- **Si el equipo tiene un `PermisosScan.exe` construido antes de octubre 2026**, genera uno nuevo con `CONSTRUIR_EXE.bat`, reemplaza el viejo y borra las copias antiguas. Es el único paso manual, y solo hay que hacerlo una vez.

### 2. Arrancar

| Situación | Qué ejecutar |
|---|---|
| Uso diario (equipo con el `.exe`) | `ABRIR.bat` |
| Desde el código fuente (requiere Node.js) | `EJECUTAR.bat`: instala dependencias y compila la interfaz si hace falta |
| Generar un `.exe` nuevo | `CONSTRUIR_EXE.bat` |
| Instalar Node.js en un equipo nuevo | `setup/instalar-node.ps1` |

Se abre el navegador en `http://localhost:7890`. Para hacer escaneos o entrar al Estructurador, inicia sesión con el administrador que creaste en el paso 1.

### 3. Cosas que conviene saber

- **Para cambiar la contraseña**, usa el botón con ícono de llave en el encabezado del panel (junto a "Cerrar sesión"). Pide la contraseña actual y cierra las sesiones abiertas en otros navegadores.
- **Si olvidaste la contraseña**: cierra la aplicación, borra `config/credenciales.json` y vuelve a abrirla en ese equipo. Aparecerá de nuevo "Configurar administrador". Los escaneos y los datos del Estructurador no se pierden.
- **Reiniciar la aplicación cierra las sesiones abiertas**: el secreto de las sesiones se genera nuevo en cada arranque. Basta con volver a iniciar sesión.
- **Tras 5 intentos fallidos** el login se bloquea 15 minutos (o hasta reiniciar la aplicación).
- **El visor público** (`/ver/...`) muestra el escaneo sin iniciar sesión, pero **sin los grupos de AD**: para verlos, inicia sesión en ese mismo navegador.
- **Si algo no funciona**, mira el mensaje que aparece en la consola o en `server/server.log` al arrancar. Por ejemplo, `AVISO: aún no hay administrador` indica que falta el paso 1.
- **Para administradores avanzados:** las variables de entorno `APP_USER` y `APP_PASS` tienen prioridad sobre el archivo. Con ellas la contraseña se cambia ahí, no desde la app.

Hay más detalle en la sección 11.1 y en "Referencia de errores comunes" (sección 12) de la [documentación técnica](./documentacion.md).

## Qué no se guarda en git

Estos archivos se generan o cambian con el uso, así que están en `.gitignore`:

- `client/dist/`: la interfaz compilada (la generan los `.bat`).
- `Permisos_Scan/*.json`: los resultados de escaneo (contienen información interna del dominio).
- `config/estructurador.json`: los datos del Estructurador (el servidor lo crea si no existe).
- `config/credenciales.json`: el usuario y el hash de la contraseña de cada equipo.
- `PermisosScan.exe` y `server.log`.

## Documentación

- [Documentación técnica y manual de usuario](./documentacion.md): funcionamiento completo, API, motor de escaneo, seguridad y manual paso a paso.
- [Arquitectura actual](./arquitectura.md): resumen técnico, puntos de extensión y deuda técnica conocida.
- [Estructurador NAS](./estructurador-nas.md): modelo de datos, reglas y endpoints del Estructurador NAS.
- La **guía de uso y operación** (`GUIA_DE_USO.md`) está en el repositorio del proyecto.
