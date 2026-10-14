# PermisosScan

**Tipo:** aplicación web local para Windows · **Tecnologías:** Angular 17, Node.js + Express, PowerShell, empaquetada como `.exe` con `pkg` · **Versión:** 2.0

## Resumen

PermisosScan es una herramienta del área de Sistemas para **auditar los permisos NTFS de las carpetas de red**. Responde preguntas como:

- ¿Qué carpetas puede ver o modificar un usuario?
- ¿Quién tiene Control Total sobre una carpeta?
- ¿Ese acceso es directo o viene de un grupo de Active Directory?

Se distribuye como un solo ejecutable (`PermisosScan.exe`) que no necesita instalación. Al abrirlo levanta un servidor local y muestra la aplicación en el navegador.

## Qué incluye

| Módulo | Qué hace |
|---|---|
| **Lector de permisos** | Escanea una unidad o carpeta de red hasta la profundidad elegida, lee los permisos de cada carpeta con PowerShell y muestra los resultados por usuario y por carpeta, indicando si el acceso es directo o por grupo. Los escaneos se guardan y se pueden consultar en modo de solo lectura. |
| **Estructurador NAS** | Base de datos interna del área de Sistemas para registrar el mapa organizacional (Unidades → Áreas → Cargos → Procesos → Miembros), con navegación por columnas e importación de personas desde Active Directory. |

## Cómo se usa

1. Abrir **`ABRIR.bat`**. Se abre el navegador con el historial de escaneos.
2. Iniciar sesión como administrador. Solicite las credenciales al área de Sistemas.
3. Elegir la unidad o ruta, la profundidad y, si se quiere, un usuario para filtrar.
4. Revisar los resultados en las pestañas **Usuarios** y **Carpetas**, y exportarlos a JSON o CSV.

## Documentación

- [Documentación técnica y manual de usuario](./documentacion.md): funcionamiento completo, API, motor de escaneo y manual paso a paso.
- [Arquitectura actual](./arquitectura.md): stack, estructura del código, convenciones y puntos de extensión.
- [Estructurador NAS](./estructurador-nas.md): modelo de datos, reglas y funcionamiento del módulo.
