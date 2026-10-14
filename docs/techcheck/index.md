# TechCheck

**Tipo:** aplicación web propia (PWA) · **Tecnologías:** Angular, Node.js, SQLite, Docker · **Versión:** 1.7.2

## Resumen

TechCheck es una aplicación para organizar, ejecutar y dejar constancia de **revisiones técnicas con checklist**. Funciona en PC, tablet y celular, **también sin internet**, y guarda cada revisión con fecha, técnico, estado de cada punto, notas y fotos como evidencia.

> **Estado de las pruebas**
>
> La app ya se probó en un caso real: la revisión de los equipos de cómputo de la entidad. Falta probarla en los demás usos que permite, en especial con los **vehículos recolectores de basura**, por ejemplo en la inspección preoperacional desde el celular en ruta, y con otros activos e instalaciones que necesiten revisiones periódicas.

## Cómo funciona

1. El **administrador** crea un proyecto, carga los equipos o activos y define el checklist de cada uno, con guías e imágenes de referencia.
2. Programa **cuándo** se revisa cada uno: ciertos días de la semana, una sola vez con un plazo o con una fecha límite.
3. El **técnico** abre la app, ve lo que le toca hoy y marca cada punto como **OK, Observación o Problema**, con notas y fotos.
4. Sin conexión, los cambios se guardan en el dispositivo y **se suben solos** al volver la red.
5. Lo que no se hizo a tiempo queda en **"No ejecutadas"**, y todo se puede exportar a CSV, JSON o ZIP.

## Beneficios principales

- **Trazabilidad:** evidencia de cada revisión para auditorías, garantías e historial de los equipos.
- **Nada se olvida:** las tareas aparecen el día que tocan y las vencidas quedan visibles.
- **Trabajo en campo:** funciona sin señal, como en cuartos de servidores, sedes remotas o rutas.
- **Estandarización:** plantillas y catálogos para que todos revisen lo mismo y registren los datos igual.
- **Datos propios y sin costo por usuario:** se instala en un servidor de la entidad con Docker.

👉 Consulte la [documentación completa de TechCheck](./documentacion.md).
