# Sistema de Renovaciones y Terminaciones de Contratos

**Área:** Talento Humano · **Herramientas:** Microsoft 365 (Excel en SharePoint, Office Scripts, Power Automate, Outlook) · **Licencia:** Business Standard, solo conectores estándar.

---

## 1. Qué problema resuelve

Los contratos laborales a término fijo se renuevan cada **6 meses**. En cada período hay que:

1. calcular cuándo termina el contrato;
2. preparar y entregar a tiempo la **carta de no continuidad**, el aviso formal de vencimiento;
3. decidir si el contrato **se renueva o no** antes de que termine;
4. si se renueva, preparar y entregar la **carta de continuidad**;
5. empezar un nuevo período de 6 meses y repetir.

Antes, este control se llevaba a mano. Las fechas dependían de que alguien las calculara y las recordara, las cartas se redactaban una por una cambiando los datos, y no quedaba un historial organizado de cada colaborador. El riesgo principal era **que se pasara una fecha**: una carta entregada tarde o una decisión no tomada a tiempo.

---

## 2. Cómo está compuesto

```
┌───────────────────────────── SharePoint (sitio INTRANET) ─────────────────────────────┐
│                                                                                        │
│  📊 Excel RENOVACIONES_Y_TERMINACIONES_DE_CONTRATOS                                     │
│     ├─ COLABORADORES   → datos de cada persona y estado del período actual             │
│     ├─ BASE_DE_DATOS   → historial: un registro por cada ciclo cerrado                 │
│     ├─ INFORME         → búsqueda por CC o nombre: estado actual + historial           │
│     ├─ DIRECTORES      → quién "Aprobó" las cartas según el área                       │
│     └─ RESPONSABLES    → quién "Proyectó" y "Revisó" las cartas                        │
│                                                                                        │
│  📁 Plantillas cartas  → plantillas de continuidad y no continuidad (texto oficial)    │
│  📁 Cartas generadas   → cartas listas, una por colaborador y ciclo                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
            ▲                                   │
            │ lee / escribe                     ▼
┌──────────────────────────┐        ┌───────────────────────────────────────────────────┐
│ Office Scripts (en Excel)│        │ Power Automate: "Contratos - Alertas diarias"     │
│ • ProcesarContratos      │◄───────│  Todos los días a las 7:00 a. m.                   │
│ • MarcarAvisos           │        │  1. Revisa todos los contratos                     │
│ • ConfirmarRenovacion    │        │  2. Genera las cartas que correspondan             │
│   (botón en la hoja)     │        │  3. Envía un correo resumen con cartas adjuntas    │
│ • CargarAntiguos         │        │  4. Marca los avisos enviados                      │
└──────────────────────────┘        │  5. Si algo falla, envía un correo de error        │
                                    └───────────────────────────────────────────────────┘
```

---

## 3. Cómo funciona el Excel

### Hoja COLABORADORES

Cada fila es un colaborador. Los colores de los encabezados indican quién llena cada columna:

| Color | Columnas | Quién las llena |
|---|---|---|
| 🟨 Amarillo | ID, CC, Nombre Completo, Fecha Inicio, Cargo, Género, Primer Nombre, Primer Apellido, Área, Fecha Envio Carta Terminación, Acepte Renovación, Fecha Envio Carta Renovación | Talento Humano |
| 🟦 Azul | Fecha Terminación, Días para Terminación | Fórmula automática |
| 🟩 Verde | Fecha Renovación, Inicio Período Actual, N° Renovaciones, Estado, Avisos Enviados | Los scripts (no se editan) |

- **Fecha Terminación** se calcula sola: inicio del período + 6 meses − 1 día. Ejemplo: 01/01 → 30/06.
- **Botón "Confirmar renovación"**: cuando se decide renovar, se escribe SI, se selecciona la fila y se pulsa el botón. Calcula la Fecha Renovación (terminación + 1 día).

### Hoja BASE_DE_DATOS (historial)
Cada vez que termina un ciclo, sea renovado o no renovado, se guarda un registro con fechas, cartas, decisión, cargo y área de ese momento. **Nadie la edita a mano**; la llena el sistema.

### Hoja INFORME
Se escribe una **CC o parte del nombre** y muestra:
- el **estado actual** del contrato (período vigente, días restantes, renovaciones, cargo, área);
- el **historial completo** de ciclos de esa persona, hasta 150.

### Hojas DIRECTORES y RESPONSABLES
Guardan los textos de las firmas de las cartas: "Aprobó", según el área, y "Proyectó" y "Revisó". Si cambia una persona, **solo se actualiza esa hoja**. No hay que tocar plantillas ni flujos.

---

## 4. Cómo funciona el flujo (el ciclo de un contrato)

Ejemplo: un colaborador cuyo contrato termina el **30/11/2026**.

| Momento | Qué hace el sistema solo | Qué hace Talento Humano |
|---|---|---|
| **2 meses antes** (30/09) | Genera la **carta de no continuidad** con los datos del colaborador y la envía adjunta en el correo | Revisa, imprime, hace firmar y entrega la carta. Registra la fecha de envío |
| **35 días antes** (26/10) | Si no se ha registrado el envío, envía un aviso: *"debe enviar ya la carta"* | Entrega la carta (el preaviso legal es de 30 días) |
| **10 días antes** (20/11) | Pide decidir: *¿se renueva?* Si nadie decide, recuerda todos los días | Escribe **SI** + botón, o **NO** |
| **Si es NO** | Guarda el ciclo como NO RENOVADO en el historial y deja de enviar avisos | — |
| **Si es SI** | Genera la **carta de continuidad** (nuevo período desde el 01/12/2026) y la envía adjunta | Completa a mano la fecha de notificación y el radicado, hace firmar, entrega y registra la fecha |
| **Últimos 3 días** | Si la carta de continuidad no se ha registrado, avisa como **urgente** cada día | Registra el envío |
| **Al registrar el envío** | Al día siguiente **cierra el ciclo**: lo guarda en el historial, calcula el nuevo período (01/12/2026 – 31/05/2027) y reinicia | — |

### Lo que garantiza el flujo
- **No se pierde ningún aviso.** Si el flujo no corre un día o el correo falla, el aviso sale en la siguiente ejecución.
- **No se repiten avisos ni cartas.** Cada aviso y cada carta se envían una sola vez por ciclo; solo los recordatorios urgentes se repiten a diario.
- **Un solo correo al día**, con todas las alertas ordenadas por urgencia (urgente, importante, pendiente, informativa) y las cartas adjuntas.
- **Correo de error** si algo falla, para que alguien lo revise.

### Las cartas
- Se usan **solo las dos plantillas oficiales**. El texto no cambia; se llenan únicamente estos datos:
  - Señor/Señora, nombre, cargo y cédula;
  - el saludo: *"Respetada señora + primer nombre"* o *"Respetado señor + primer apellido"*;
  - las fechas en letras: terminación o renovación;
  - Aprobó (director del área), Proyectó y Revisó.
- La fecha de notificación y el radicado de la carta de continuidad quedan en blanco **a propósito**, porque dependen de otra dependencia.
- Se abren y se editan en **Word**. Si falta algún dato en el Excel, la carta sale con una línea en blanco y el correo indica qué falta.

---

## 5. Qué procesos agilizó

| Proceso | Antes | Ahora |
|---|---|---|
| **Cálculo de fechas** | Manual, período por período | Automático; se recalcula solo al renovar |
| **Seguimiento de vencimientos** | Depender de la memoria o de revisar listas | Correo diario con lo que hay que hacer hoy |
| **Redacción de cartas** | Copiar la plantilla y cambiar nombre, cargo, cédula, fechas y firmas en cada carta | Las cartas llegan listas, adjuntas al correo y guardadas en SharePoint |
| **Saludo y firmas** | Escribir a mano el trato, el nombre y el director de cada área | Automático según el género, el área y las hojas de configuración |
| **Paso a un nuevo período** | Recalcular y actualizar a mano | Al registrar la carta de continuidad, el sistema cierra el ciclo y abre el siguiente |
| **Historial del colaborador** | Disperso o inexistente | Hoja BASE_DE_DATOS y consulta en INFORME con la CC |
| **Carga de empleados antiguos** | Reconstruir a mano años de renovaciones | Script CargarAntiguos: calcula el período actual y el historial desde la fecha de ingreso |
| **Cambio de responsables o directores** | Editar cada documento | Se cambia una celda en DIRECTORES o RESPONSABLES |

---

## 6. Ventajas

**Cumplimiento y control**
- Los avisos llegan **con anticipación suficiente** para el preaviso legal de 30 días, y no se pierden si un día falla algo.
- Cada ciclo queda **registrado** con fechas, decisión, cartas, cargo y área. Útil para auditorías, consultas y certificaciones.

**Ahorro de tiempo y menos errores**
- Las cartas salen con los datos correctos desde el Excel. Se evitan errores de digitación en nombres, cédulas y fechas.
- Las fechas se calculan con una sola regla, igual para todos (incluidos los casos de fin de mes, por ejemplo 31/08 → 28/02).
- Un solo correo diario reemplaza la revisión manual de la lista de contratos.

**Continuidad del proceso**
- El sistema está ligado al **puesto**, no a la persona: si cambia quien está en Talento Humano, el proceso sigue igual.
- Los nombres de quien proyecta, revisa y aprueba se cambian en una hoja, sin conocimientos técnicos.

**Sin costo adicional**
- Funciona con la licencia de Microsoft 365 que ya tiene la entidad. No usa conectores premium ni software externo.
- Todo vive en SharePoint, con su respaldo e historial de versiones.

---

## 7. Lo que debe saber quien lo use

**En el día a día**
1. **Leer el correo diario** de alertas y actuar según lo que indique.
2. **Registrar en el Excel** lo que va pasando:
   - la fecha en que se entregó cada carta;
   - la decisión de renovar: **SI** + botón, o **NO**.
3. **Colaborador nuevo:** escribir en la primera fila vacía **dentro de la tabla**, con todos los datos amarillos.

**No hacer**
- No cambiar nombres de hojas, tablas ni encabezados de columnas.
- No editar las columnas verdes ni la hoja BASE_DE_DATOS.
- No escribir fuera de la tabla.

**Para el administrador técnico**
- El flujo y los scripts están ligados a **la cuenta institucional del área de Sistemas** (consultar cuál en la documentación interna). Se recomienda agregar un copropietario.
- Si se modifica un script, hay que **volver a seleccionarlo** en la acción *Ejecutar script* del flujo y guardar. Si no, Power Automate puede seguir usando la versión anterior.
- Documentación técnica detallada: guía paso a paso y guía de cartas (documentos internos, no incluidos en este sitio). Próximas mejoras propuestas: [Plan de mejoras](./plan-mejoras.md).
