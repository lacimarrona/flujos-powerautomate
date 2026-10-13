# Automatización de Solicitudes y Requerimientos Informáticos (GRF-FR-45)

**Entidad:** La Cimarrona E.S.P.
**Área:** Sistemas de Información
**Herramientas:** Microsoft Forms · Excel en SharePoint (sitio INTRANET) · Power Automate · Outlook
**Licenciamiento:** Microsoft 365 Empresa Estándar (no requiere licencias adicionales ni conectores Premium)

---

## 1. Resumen

Se automatizó el ciclo de vida de las solicitudes informáticas del formato **GRF-FR-45**, desde que un funcionario radica la solicitud hasta que recibe la respuesta por correo.

- El funcionario diligencia el formulario (accesible desde el menú lateral de la INTRANET).
- La solicitud queda registrada automáticamente en el Excel de seguimiento, con estado **Abierto** y la fecha y hora de radicación.
- El técnico registra en el Excel el diagnóstico, la solución, quién atendió y la fecha de cierre.
- Un flujo de Power Automate detecta las solicitudes cerradas y envía al solicitante un correo con el formato institucional de La Cimarrona, que incluye el detalle de la atención.
- El Excel registra la fecha y hora exacta del envío y el estado cambia a **Cerrado**.

---

## 2. Componentes

| Componente | Ubicación | Función |
|---|---|---|
| Formulario GRF-FR-45 | Microsoft Forms (formulario del grupo INTRANET) | Recibe las solicitudes de los funcionarios |
| Acceso al formulario | INTRANET → menú lateral | Vínculo directo para radicar solicitudes |
| Excel de seguimiento | Biblioteca de documentos de la INTRANET, en la carpeta de formularios de Microsoft Forms (tabla `Table1`) | Base de datos de las solicitudes y su seguimiento |
| Flujo **GRF-FR-45 - Enviar respuesta** | Power Automate | Envía la respuesta por correo y registra la fecha de envío |
| Logo institucional | Biblioteca de documentos de la INTRANET | Imagen usada en el encabezado del correo |

---

## 3. Funcionamiento del Excel

### 3.1 Columnas que llena Microsoft Forms (automáticas)
`ID`, `Nombre completo de quien solicita el requerimiento`, `Cargo de quien solicita el requerimiento`, `Tipo de requerimiento`, `Detalles del requerimiento`, `Nombre completo y apellidos del usuario`, `Número de Cédula/Documento de identidad del usuario`, `Tipo de movimiento`, `Módulos`, `Permisos`, `Tipo de Activo informático`, `Cargo del usuario`, `Start time`, `Completion time`, `Last modified time`, `Email`, `Name`.

> ⚠️ **No eliminar, renombrar ni mover estas columnas.** Forms escribe en ellas. Si se modifican, la sincronización entre el formulario y el Excel puede dejar de funcionar. Si alguna no se necesita, se puede **ocultar**.

### 3.2 Columnas de seguimiento

| Columna | Quién la llena | Descripción |
|---|---|---|
| Fecha diagnóstico | Técnico | Fecha en que se revisó el caso |
| Diagnóstico inicial | Técnico | Qué se encontró |
| Descripción de la solución | Técnico | Pasos realizados (se puede usar **Alt + Enter** para un paso por línea) |
| Nombre de quien atiende | Técnico | Responsable de la atención |
| **Estado** | Fórmula automática | `Abierto` mientras no se ha enviado la respuesta; `Cerrado` cuando ya se envió |
| **Fecha inicio atención** | Fórmula automática | Fecha y hora real en que se radicó la solicitud |
| Fecha fin atención | Técnico | Fecha de cierre. **Es la que habilita el envío del correo** |
| Fecha y hora de envio de la respuesta | Flujo (automática) | Momento exacto en que se envió el correo |

### 3.3 Fórmulas

```
Estado:
=SI([@ID]="";"";SI([@[Fecha y hora de envio de la respuesta]]="";"Abierto";"Cerrado"))

Fecha inicio atención:
=SI([@ID]="";"";[@[Completion time]])
```

Las fórmulas están definidas en la columna de la tabla. Cada fila nueva que agrega Forms las hereda automáticamente, así que no hay que copiarlas ni arrastrarlas.

---

## 4. Funcionamiento del flujo "GRF-FR-45 - Enviar respuesta"

### 4.1 Horario de ejecución
De **lunes a viernes**, cada **5 minutos**, en dos franjas:
- **Mañana:** 8:00 a 11:55
- **Tarde:** 14:00 a 15:55

Fuera de ese horario (noches, fines de semana) no se ejecuta. Las solicitudes cerradas fuera de horario se envían en la siguiente ejecución hábil.

### 4.2 Pasos

```
Periodicidad (L–V, 8–12 y 14–16, cada 5 min)
 └─ Enumerar las filas de una tabla (Table1, fechas en ISO 8601)
     └─ Filtrar matriz  → solo filas con "Fecha fin atención" y SIN "Fecha y hora de envio"
         └─ Aplicar a cada uno (por cada solicitud pendiente)
             ├─ FechaEnvio         → hora actual de Colombia
             ├─ CuerpoCorreo       → arma el correo HTML institucional
             ├─ Obtener correos (V3) → busca en Elementos enviados si ya se envió ese radicado
             ├─ Condición: ¿no existe un correo enviado?
             │    └─ Sí → Enviar correo electrónico (V2) al solicitante
             └─ Actualizar una fila → escribe "Fecha y hora de envio de la respuesta"
```

### 4.3 Controles para evitar correos duplicados
1. **Filtro por fecha de envío:** una solicitud que ya tiene fecha de envío no se vuelve a procesar.
2. **Verificación en Elementos enviados:** antes de enviar, el flujo busca un correo con el asunto `GRF-FR-45-<ID>`. Si ya existe, no lo reenvía. Este control cubre los casos en que el conector de Excel lee una versión desactualizada del archivo.

### 4.4 Correo de respuesta
- **Asunto:** `Su solicitud GRF-FR-45-<ID> fue atendida`
- **Destinatario:** el correo del funcionario que diligenció el formulario (columna `Email`)
- **Formato:** diseño institucional con el logo, la franja de colores corporativos y una tarjeta con:
  - Número de solicitud
  - Tipo de requerimiento
  - Fecha de diagnóstico
  - Diagnóstico inicial
  - Solución realizada
  - Atendido por
  - Fecha de cierre

---

## 5. Procedimiento de uso (técnico de sistemas)

1. Revisar en el Excel las solicitudes con estado **Abierto**.
2. Atender la solicitud.
3. Diligenciar: **Fecha diagnóstico**, **Diagnóstico inicial**, **Descripción de la solución**, **Nombre de quien atiende**.
4. **De último**, diligenciar **Fecha fin atención**.
5. En la siguiente ejecución del flujo (normalmente en pocos minutos, dentro del horario), el solicitante recibe el correo y la fila pasa a **Cerrado**.

> Se recomienda escribir el diagnóstico y la solución en frases completas, porque aparecen textualmente en el correo que recibe el funcionario.

---

## 6. Proceso que se agilizó y mejoras obtenidas

### Antes
- La respuesta al solicitante se redactaba y enviaba manualmente.
- El estado de cada solicitud y sus fechas se registraban a mano.
- No había evidencia sistemática de cuándo se respondió cada solicitud.
- La calidad y el formato de las respuestas dependían de quien las redactara.

### Ahora
| Aspecto | Mejora |
|---|---|
| **Registro** | Cada solicitud queda en el Excel con su fecha y hora real de radicación, sin intervención manual |
| **Estado** | El estado (Abierto / Cerrado) se calcula solo y siempre refleja la realidad |
| **Respuesta** | El correo se envía automáticamente al llenar la fecha de cierre; el técnico no redacta correos |
| **Imagen institucional** | Todas las respuestas tienen el mismo formato, con logo y colores de La Cimarrona |
| **Trazabilidad** | Para cada solicitud quedan la fecha de radicación, de diagnóstico, de cierre y la fecha y hora exacta del envío de la respuesta |
| **Acceso** | El formulario está disponible desde el menú de la INTRANET |
| **Confiabilidad** | Controles para no enviar correos duplicados ni respuestas incompletas |
| **Horario** | Los envíos se concentran en horario laboral |

### Ventajas
- **Ahorro de tiempo:** el técnico solo diligencia la información de la atención; el registro, el cambio de estado y el envío de la respuesta son automáticos.
- **Información para indicadores:** con las fechas registradas se pueden medir tiempos de respuesta, volumen de solicitudes por tipo y carga por responsable.
- **Soporte documental:** el Excel y los correos enviados sirven como evidencia de la gestión del formato GRF-FR-45.
- **Sin costo adicional:** funciona con las licencias de Microsoft 365 que ya tiene la entidad.
- **Funciona en la nube:** no depende de que un computador esté encendido ni de que el Excel esté abierto.

---

## 7. Recomendaciones y limitaciones

- **No modificar las columnas de Forms** en el Excel (sección 3.1). Las de seguimiento sí se pueden ajustar, revisando que los nombres coincidan con los usados en el flujo.
- **No eliminar el formato de tabla** ni arrastrar fórmulas hacia filas vacías. La tabla crece sola con cada respuesta.
- **Demora de sincronización:** Forms y el conector de Excel pueden tardar algunos minutos en reflejar los cambios. Es normal y no requiere acción.
- **Logo del correo:** se carga desde un vínculo de SharePoint compartido. Si ese vínculo se elimina o cambia de permisos, el logo dejará de verse.
- **Cuenta de envío:** los correos salen desde la cuenta conectada en el flujo. Las acciones *Obtener correos (V3)* y *Enviar correo (V2)* deben usar **la misma cuenta** para que funcione el control de duplicados.
- **Monitoreo:** si algo falla, revisar el **Historial de ejecuciones (28 días)** del flujo en Power Automate. Power Automate también notifica por correo cuando una ejecución falla.
- **Números de solicitud:** el ID lo asigna Microsoft Forms y es consecutivo. No se reinicia aunque se borren respuestas.
