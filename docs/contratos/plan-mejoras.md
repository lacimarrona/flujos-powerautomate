# Plan de mejoras: Renovaciones y terminaciones de contratos

**Objetivo:** que quien ocupe el puesto de Talento Humano pueda manejar todo el proceso sin conocer el Excel por dentro, con menos pasos, menos errores y trazabilidad de cada decisión.

**Restricción:** todo debe funcionar con la licencia actual (Microsoft 365 Business Standard y Power Automate estándar), sin conectores premium.

---

## 1. Dónde estamos hoy

### Lo que ya funciona
- Excel en SharePoint con COLABORADORES, BASE_DE_DATOS (historial), INFORME, DIRECTORES y RESPONSABLES.
- Flujo diario a las 7:00 a. m. con:
  - avisos de 2 meses, 35 días y 10 días, con recordatorios;
  - avisos que no se pierden aunque el flujo falle un día;
  - correo con el diseño institucional.
- Cartas de **no continuidad** y **continuidad** generadas automáticamente, adjuntas al correo y guardadas en *Cartas generadas*.
- Botón **Confirmar renovación**, cierre automático de ciclo, historial con cargo y área, carga de empleados antiguos.

### Lo que todavía depende de que la persona "sepa usar el Excel"

| Tarea | Cómo se hace hoy | Riesgo |
|---|---|---|
| Registrar un colaborador nuevo | Escribir en la fila correcta, dentro de la tabla, con el formato correcto | Escribir fuera de la tabla (pasó con la fila 74), datos incompletos para las cartas |
| Decidir renovación | Escribir SI/NO, seleccionar la fila y pulsar el botón | Olvidar el botón, equivocarse de fila |
| Registrar envío de carta | Escribir la fecha en la columna F o I | Olvidarlo: siguen los recordatorios y el ciclo no se cierra |
| Saber qué está pendiente | Leer el correo y buscar en el Excel | No hay una vista clara de "qué hago hoy" |
| Quién decidió qué | No queda registro | Sin trazabilidad para auditorías |

---

## 2. Ruta recomendada (por fases)

Cada fase funciona sola y deja el sistema en un estado estable. No hay que hacerlas todas, ni todas de una vez.

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► (Fase 4: evaluar)
Puesta en  Excel más  Teams:      Formulario  Migrar a Lista de
marcha     claro      tarjetas    de ingreso  SharePoint + app
```

### Fase 0. Terminar la puesta en marcha actual
**Qué se hace**
- Limpiar los datos de prueba.
- Cargar los colaboradores reales con Cargo, Género, Primer Nombre/Apellido y Área.
- Llenar las hojas DIRECTORES y RESPONSABLES.
- Ejecutar CargarAntiguos.
- Decidir qué hacer con los **cargos anteriores** de los antiguos: corrección manual u hoja CARGOS_ANTERIORES.
- Agregar a un **copropietario** del flujo, para que no dependa solo de la cuenta institucional del área de Sistemas.

**Qué mejora:** el sistema queda en producción con datos reales.
**Esfuerzo:** 1 a 2 días, según cuántos colaboradores haya.

---

### Fase 1. Un Excel que se explique solo
**Qué se hace**
1. **Columna "Siguiente paso"** al inicio de cada fila, calculada sola, con colores:
   - 🔴 *Decidir renovación (faltan 6 días)*
   - 🟠 *Enviar carta de no continuidad*
   - 🟡 *Registrar envío de carta de continuidad*
   - 🟢 *Al día*
   - ⚫ *No renovado*
2. **Agrupar y ocultar las columnas técnicas** (Inicio Período Actual, N° Renovaciones, Días, Avisos Enviados). Se pueden mostrar con un clic en el "+" del agrupamiento.
3. **Proteger** las columnas de fórmulas y scripts. Los scripts se ajustan para desproteger, escribir y volver a proteger.
4. **Hoja PANEL** como primera pestaña:
   - Conteos: *vencen este mes*, *decisiones pendientes*, *cartas por enviar*, *colaboradores activos*.
   - La lista de "qué hacer hoy", ordenada por urgencia.
   - Las instrucciones básicas en 5 líneas.
5. **Listas desplegables** en Género, Área (desde DIRECTORES) y Acepte Renovación.
6. **Formato condicional**: la fila completa se resalta en rojo si está vencida o urgente.

**Qué mejora**
- Quien abre el Excel ve de inmediato qué hacer y con quién.
- Desaparecen los errores de borrar fórmulas o escribir en columnas de los scripts.
- La persona ve solo las columnas que llena, en lugar de 19.

**Esfuerzo:** bajo. Fórmulas, formato y un ajuste menor a los scripts.

---

### Fase 2. Canal de Teams con tarjetas interactivas ⭐ *(la que más mejora el día a día)*
**Qué se hace**
1. Crear (o usar) el equipo de Teams **Talento Humano** con un canal **Contratos**, y agregar a quien ocupe el puesto y a su reemplazo.
2. Nuevo flujo **"Contratos – Tarjetas Teams"** que publica dos tipos de tarjeta:

   **🟡 Decisión de renovación** (cuando falten 10 días)
   > Nombre Apellido · C.C. 0000000000 · Cargo · Área · Termina el 30/11/2026
   > Comentario (opcional): [ ]
   > **[ Sí, renovar ]  [ No renovar ]**

   - **Sí** → escribe SI y la Fecha Renovación (reemplaza el botón del Excel); al día siguiente llega la carta de continuidad.
   - **No** → escribe NO, guarda el ciclo como NO RENOVADO y se detienen los avisos.

   **📄 Registrar envío de carta** (cuando se genera una carta)
   > Carta de no continuidad – Nombre Apellido · [ Abrir carta ]
   > Fecha de envío: [ 📅 ]  **[ Registrar envío ]**

   - Escribe la fecha en *Fecha Envio Carta Terminación* o *Renovación*, con lo que se detienen los recordatorios o se cierra el ciclo.
3. Dos columnas nuevas en el Excel y en el historial: **Decidido por** y **Comentario de la decisión**.
4. Fijar en el canal, como **pestañas**, el Excel y la carpeta *Cartas generadas*.
5. Los **correos diarios se mantienen** como resumen y respaldo, con las cartas adjuntas.

**Qué mejora**

| Antes | Después |
|---|---|
| Abrir el Excel, buscar la fila, escribir SI, pulsar el botón | Un clic en la tarjeta |
| Recordar escribir la fecha de envío de la carta | La tarjeta queda pendiente hasta que se registre |
| Solo desde el computador | También desde el celular (Teams móvil) |
| Nadie sabe quién decidió | Queda quién, cuándo y por qué |
| Si la persona falta, nadie ve lo pendiente | El reemplazo ve las tarjetas abiertas en el canal |
| Ligado a la cuenta de una persona | Ligado al **canal**: si cambia la persona, se cambia el miembro del equipo, no el flujo |

**Detalles técnicos**
- Acción estándar: *Publicar tarjeta adaptable y esperar una respuesta* (conector de Teams).
- Cada tarjeta espera hasta **30 días**, el límite de Power Automate. Si nadie responde, siguen los recordatorios por correo, como hoy.
- Si alguien decide desde el Excel en vez de la tarjeta, el script lo detecta y la tarjeta muestra "ya registrado".
- Scripts nuevos: **PendientesTeams** (qué tarjetas publicar) y **RegistrarRespuesta** (escribe la respuesta en el Excel).

**Esfuerzo:** medio. Un flujo nuevo, dos scripts y el diseño de las tarjetas.

---

### Fase 3. Formulario de ingreso de colaboradores
**Qué se hace**
- Un **Microsoft Forms** "Nuevo colaborador" con Nombre, CC, Fecha de inicio, Cargo, Género, Primer nombre, Primer apellido y Área (lista).
- Un flujo que, al enviar el formulario:
  1. valida que la CC no exista ya;
  2. agrega la fila **dentro de la tabla**;
  3. si la fecha de inicio es antigua, aplica el cálculo de CargarAntiguos solo a esa persona;
  4. publica en el canal *"✔ Colaborador registrado: …"*.
- El formulario se fija como pestaña del canal.

**Qué mejora**
- No se vuelve a escribir fuera de la tabla ni se dejan campos vacíos: el formulario los exige.
- La persona **ya no necesita abrir el Excel** para el día a día.
- CargarAntiguos deja de ser un paso manual.

**Esfuerzo:** bajo a medio.

> Con las fases 2 y 3, el día a día ocurre en **un solo lugar**, el canal de Teams. El Excel queda como base de datos y como consulta del historial (INFORME).

---

### Fase 4 (evaluar más adelante). Pasar de Excel a una Lista de SharePoint + app
**Qué sería**
- Mover COLABORADORES y BASE_DE_DATOS a **Listas de Microsoft** (SharePoint).
- Opcional: una **app de Power Apps** con pantallas "Colaboradores", "Pendientes" y "Historial".

**Qué mejoraría**
- **Reacciones inmediatas:** Power Automate puede ejecutarse *cuando se modifica un elemento*. Al marcar SI, la renovación se calcula al instante, sin botón ni esperar al día siguiente.
- **Historial de versiones por registro:** quién cambió qué campo y cuándo, automático.
- **Varias personas a la vez** sin conflictos de edición.
- Vistas, filtros y formularios propios ya incluidos, y se ve como pestaña en Teams.
- Mejor base para crecer: más tipos de contrato, más documentos.

**Costo y riesgo**
- Es una **reconstrucción**: hay que migrar los datos y reescribir scripts y flujos (Office Scripts no funcionan sobre Listas; la lógica pasa a Power Automate).
- Power Apps sobre SharePoint es estándar en Microsoft 365, pero una app es más trabajo de mantener.
- Para el volumen actual, Excel con las fases 1 a 3 es suficiente.

**Recomendación:** no hacerla ahora. Reevaluar si crece el número de colaboradores, si varias personas necesitan editar al mismo tiempo o si se quiere aplicar el mismo sistema a otros procesos.

---

## 3. Otras alternativas revisadas

| Alternativa | Qué haría | Licencia | ¿Recomendada? |
|---|---|---|---|
| **Aprobaciones** (Approvals) | Botones Aprobar/Rechazar en Teams y Outlook, con historial en la app de Aprobaciones | Estándar | Opción B de la fase 2. Buena trazabilidad, pero **no permite campo de fecha** (sirve para decidir, no para registrar la carta) |
| **Tarjetas adaptables de Teams** | Tarjetas a la medida, con fechas, listas y textos | Estándar | ✅ **Sí** (fase 2) |
| **Microsoft Forms** | Formulario de ingreso con validaciones | Incluido | ✅ **Sí** (fase 3) |
| **Planner (tareas)** | Crear una tarea "Enviar carta a Nombre Apellido" asignada, con vencimiento | Estándar | Opcional. Útil si TH ya organiza su trabajo en Planner; si no, duplica lo de las tarjetas |
| **Recordatorio en el calendario de Outlook** | Evento el día en que vence cada contrato | Estándar | Opcional, complemento simple: ver los vencimientos en el calendario |
| **Listas de Microsoft + Power Apps** | Base de datos y app propias | Estándar (M365) | ⏳ Evaluar más adelante (fase 4) |
| **"Populate a Word template"** | Cartas directamente en .docx | ❌ **Premium** | No por ahora; el RTF cumple la función |
| **Firma electrónica (Adobe Sign / DocuSign)** | Que el Gerente firme las cartas en línea | ❌ Premium o pago aparte | No con la licencia actual |
| **Power BI** | Tableros de rotación, renovaciones por área | ❌ Requiere Power BI Pro | No; la hoja PANEL cubre lo básico |
| **Macros VBA** | Botones en Excel de escritorio | — | ❌ No funcionan en Excel web ni con Power Automate |

---

## 4. Cómo se vería el día a día al final (fases 1 a 3)

1. **Llega un colaborador nuevo:** Teams → pestaña *Nuevo colaborador* → se llena el formulario. Listo.
2. **2 meses antes:** llega el correo con la carta adjunta, y en el canal la tarjeta 📄. Se imprime, se firma, se entrega, y en la tarjeta se pulsa *Registrar envío*.
3. **10 días antes:** tarjeta 🟡 en el canal → **Sí, renovar** o **No renovar**.
4. **Si se renueva:** al día siguiente llega la carta de continuidad. Se completan a mano la fecha y el radicado, se entrega y se pulsa *Registrar envío* en su tarjeta.
5. **Al día siguiente:** el ciclo se cierra solo y empieza el nuevo período.
6. **Consulta del historial:** pestaña Excel → hoja INFORME → se escribe la CC.

La persona no necesita saber qué es *Avisos Enviados*, *Inicio Período Actual* ni dónde está el botón.

---

## 5. Riesgos y consideraciones

| Tema | Detalle | Cómo se maneja |
|---|---|---|
| Cuenta dueña del flujo | Todo corre con **la cuenta institucional del área de Sistemas** | Agregar un copropietario. Si esa cuenta cambia, reasignar conexiones |
| Cambios en scripts | Power Automate puede seguir usando la versión anterior | Después de editar un script, volver a seleccionarlo en *Ejecutar script* y guardar |
| Esperas de tarjetas | Máximo 30 días por tarjeta | Plazos de este proceso de 10 días o menos; los recordatorios por correo siguen |
| Nombres de columnas y hojas | Los scripts los buscan por nombre | No renombrar encabezados ni hojas (COLABORADORES, DIRECTORES, RESPONSABLES…) |
| Respaldo | El Excel es la base de datos | SharePoint guarda versiones del archivo; se puede restaurar desde *Historial de versiones* |
| Legal | Renovaciones sucesivas de 6 meses | Validado por la entidad que todos renuevan cada 6 meses; revisar si cambia la normativa |

---

## 6. Decisiones pendientes para avanzar

1. **Fase 0:** ¿cargos anteriores de los antiguos a mano, o con la hoja CARGOS_ANTERIORES?
2. **Fase 1:** ¿la hacemos? (recomendado: sí)
3. **Fase 2:** ¿existe ya un equipo de Teams de Talento Humano? ¿Nombre del equipo y del canal? ¿Las dos tarjetas o solo la de decisión?
4. **Fase 3:** ¿formulario de ingreso: sí o no?
5. **Fase 4:** no por ahora; reevaluar más adelante.

**Orden sugerido:** Fase 0 → Fase 1 → Fase 2 → Fase 3. Cada una se prueba con datos de prueba antes de pasar a la siguiente, como hicimos hasta ahora.
