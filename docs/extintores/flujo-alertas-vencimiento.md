# Documentación – Flujo Alertas de Vencimiento de Extintores

## 1. Objetivo y contexto

El flujo "Alertas vencimiento extintores" envía un correo automático cuando a un extintor le faltan **30, 15 y 5 días** para vencer, para que se gestione su renovación a tiempo.

En La Cimarrona E.S.P. cada extintor vence **un año después de su última renovación**. Por eso el proceso es cíclico: cada vez que un extintor se renueva, empieza un nuevo ciclo de 12 meses y el flujo vuelve a avisar 30, 15 y 5 días antes del siguiente vencimiento.

| Dato | Valor |
| --- | --- |
| Herramienta | Power Automate (Microsoft 365) |
| Fuente de datos | extintores.xlsx en SharePoint, sitio INTRANET |
| Ubicación del archivo | Biblioteca de documentos de la INTRANET, carpeta del Profesional SST |
| Tabla de Excel | TablaExtintores (hoja Extintores) |
| Ejecución | Diaria, 7:00 a. m. (hora de Bogotá) |
| Avisos por extintor | 3 por ciclo: 30, 15 y 5 días antes del vencimiento |
| Estado | Validado de extremo a extremo y activo en producción |

## 2. Fuente de datos: extintores.xlsx

El inventario vive en la tabla **TablaExtintores**. Cada fila es un extintor; el flujo lee todas las filas en cada ejecución.

| Col. | Encabezado | Quién la llena | Contenido |
| --- | --- | --- | --- |
| A | ID Extintor | Responsable SST | Código único (EXT-001, EXT-002…) |
| B | Serial | Responsable SST | Serial del equipo |
| C | Ubicación | Responsable SST | Sede, planta o vehículo donde está el extintor |
| D | Fecha de Renovación | Responsable SST | Fecha de la última recarga/renovación (AAAA-MM-DD) |
| E | Fecha de Expiración | Fórmula | Fecha de Renovación + 12 meses |
| F | Fecha Aviso 30 | El flujo | Fecha en que se envió el aviso de 30 días |
| G | Fecha Aviso 15 | El flujo | Fecha en que se envió el aviso de 15 días |
| H | Fecha Aviso 5 | El flujo | Fecha en que se envió el aviso de 5 días |

La Fecha de Expiración se calcula sola con esta fórmula (ejemplo en la fila 2):

```
=FECHA.MES(D2;12)
```

Así, un extintor renovado el 2026-04-01 vence el 2027-04-01. Las columnas F, G y H no se editan a mano: las escribe el flujo para no repetir avisos.

**Formato condicional.** La tabla se colorea según los días que faltan (con HOY()), con la opción "Detener si es verdad" para que no se crucen las reglas:

| Color | Días para vencer |
| --- | --- |
| Rojo | 5 o menos |
| Naranja | 15 o menos |
| Amarillo | 30 o menos |
| Verde | Más de 30 |

Las filas sin Fecha de Renovación (por ejemplo, extintores nuevos o recién ubicados) no generan alertas hasta que se registre su fecha.

## 3. Arquitectura del flujo

El flujo recorre todos los extintores una vez al día y, para cada uno, evalúa en paralelo tres ramas: 30, 15 y 5 días.

```
Recurrence (todos los días, 7:00 a. m.)
 └─ Enumerar las filas de una tabla (TablaExtintores)
     └─ Aplicar a cada uno (un extintor por vuelta)
         ├─ DiasRestantes (Redactar)
         ├─ Rama 30 días: Condición (16 a 30) → Condición 1 (¿no avisado?) → Enviar correo (V2)   → Actualizar una fila   (Fecha Aviso 30)
         ├─ Rama 15 días: Condición 2 (6 a 15) → Condición 3 (¿no avisado?) → Enviar correo (V2) 1 → Actualizar una fila 1 (Fecha Aviso 15)
         └─ Rama 5 días:  Condición 2 1 (≤ 5)  → Condición 4 (¿no avisado?) → Enviar correo (V2) 2 → Actualizar una fila 2 (Fecha Aviso 5)
```

Un correo solo sale cuando el extintor llegó al umbral y ese aviso no se ha enviado en el ciclo actual.

1. **Recurrence**: dispara el flujo todos los días a las 7:00 a. m., hora de Bogotá.
2. **Enumerar las filas de una tabla** (Excel Online Business): lee TablaExtintores desde extintores.xlsx en SharePoint.
3. **Aplicar a cada uno**: recorre las filas, un extintor por vuelta.
4. **DiasRestantes** (Redactar): calcula los días que faltan para la Fecha de Expiración.
5. **Condición / Condición 2 / Condición 2 1**: revisan en qué rango está DiasRestantes: 16 a 30, 6 a 15, o 5 o menos.
6. **Condición 1 / 3 / 4**: confirman que el aviso de esa rama no se haya enviado en este ciclo.
7. **Enviar correo electrónico (V2)** (Office 365 Outlook): envía la alerta con los datos del extintor.
8. **Actualizar una fila**: registra la fecha del envío en Fecha Aviso 30, 15 o 5.

### Configuración de cada acción

Todas las acciones de Excel usan la conexión de **la cuenta institucional del área de Sistemas** (consultar cuál en la documentación interna).

**Recurrence**

| Parámetro | Valor |
| --- | --- |
| Intervalo / Frecuencia | 1 / Día |
| Zona horaria | (UTC-05:00) Bogotá, Lima, Quito, Rio Branco |
| Hora de inicio | 2026-08-26T12:00:00.000Z |
| A estas horas / minutos | 7 / 0 |
| Vista previa | Ejecuciones a las 7:00 cada día |

**Enumerar las filas de una tabla y Actualizar una fila (0, 1 y 2)**

| Parámetro | Valor |
| --- | --- |
| Ubicación | Sitio de SharePoint INTRANET |
| Biblioteca de documentos | Biblioteca de documentos de la INTRANET |
| Archivo | extintores.xlsx (carpeta del Profesional SST) |
| Tabla | TablaExtintores |
| Columna de clave (solo Actualizar) | ID Extintor |
| Valor de clave (solo Actualizar) | ID Extintor de la fila actual |
| Campo que se escribe | Fecha Aviso 30 / 15 / 5 = utcNow() |

**Enviar correo electrónico (V2), (V2) 1 y (V2) 2**

Los tres correos van al **correo institucional del Profesional SST** y comparten la misma plantilla HTML: un encabezado de color, y debajo ID del extintor, Serial, Ubicación y Fecha de expiración (con formatDateTime). En el asunto, "vence en … días" toma el valor de DiasRestantes.

| Correo | Asunto | Encabezado | Mensaje de cierre |
| --- | --- | --- | --- |
| (V2) · 30 días | Aviso preventivo: extintor de \[Ubicación\] vence en \[días\] días | Amarillo #FFC107 · "Faltan 30 días o menos" | Coordinar la renovación con el proveedor a tiempo |
| (V2) 1 · 15 días | Recordatorio: extintor de \[Ubicación\] vence en \[días\] días | Naranja #FF9800 · "Faltan 15 días o menos" | Coordinar la renovación con el proveedor a tiempo |
| (V2) 2 · 5 días | URGENTE: extintor de \[Ubicación\] vence en \[días\] días | Rojo #F44336 · "Faltan 5 días o menos — requiere atención inmediata" | Contactar al proveedor HOY para renovar antes del vencimiento |

## 4. Lógica de condiciones y antiduplicados

Cada rama tiene dos filtros: el primero revisa en qué **rango de días** está el extintor; el segundo revisa que ese aviso no se haya enviado ya en el ciclo actual. Los rangos no se cruzan, así que en cada ejecución un extintor cae como máximo en una rama.

| Rama | Condición externa (rango, operador Y) | Condición interna (antiduplicado) | Acciones si ambas son verdaderas | Columna que se marca |
| --- | --- | --- | --- | --- |
| 30 días | Condición: Salidas de DiasRestantes es menor o igual que 30 **y** es mayor que 15 | Condición 1 | Enviar correo electrónico (V2) · Actualizar una fila | Fecha Aviso 30 |
| 15 días | Condición 2: Salidas es menor o igual que 15 **y** es mayor que 5 | Condición 3 | Enviar correo electrónico (V2) 1 · Actualizar una fila 1 | Fecha Aviso 15 |
| 5 días | Condición 2 1: Salidas es menor o igual que 5 | Condición 4 | Enviar correo electrónico (V2) 2 · Actualizar una fila 2 | Fecha Aviso 5 |

Si alguna condición da Falso, la rama no hace nada (0 acciones).

Como se usan rangos y no fechas exactas, si el flujo no corre un día (falla o mantenimiento), el aviso sale en la siguiente ejecución. También, un extintor registrado cuando ya le faltan 12 días recibe directamente el aviso de 15. Un extintor ya vencido (días negativos) cae en la rama de 5 días.

**Cálculo de DiasRestantes** (acción Redactar). Excel entrega las fechas como número de serie, por eso se convierten sumando días a la fecha base 1899-12-30. Luego se restan los ticks de hoy y se divide entre 864000000000 (ticks de un día):

```
if(empty(item()?['Fecha de Expiración']), 9999,
  div(
    sub(
      ticks(addDays('1899-12-30', int(item()?['Fecha de Expiración']))),
      ticks(startOfDay(utcNow()))
    ),
    864000000000
  )
)
```

Con 9999, un extintor sin fecha nunca cumple ningún umbral y el flujo no falla.

**Cómo funciona el antiduplicado.** La condición interna compara, usando ticks(), la Fecha Aviso de esa rama contra la Fecha de Renovación:

- Fecha Aviso vacía, o anterior a la Fecha de Renovación → el aviso de este ciclo aún no se envió → se envía el correo.
- Fecha Aviso igual o posterior a la Fecha de Renovación → ya se avisó en este ciclo → no se envía nada.

Expresión de Condición 1 (Condición 3 y Condición 4 son iguales, cambiando la columna por 'Fecha aviso 15' y 'Fecha aviso 5'):

```
or(
  empty(item()?['Fecha aviso 30']),
  less(
    ticks(item()?['Fecha aviso 30']),
    ticks(addDays('1899-12-30', int(item()?['Fecha de Renovación'])))
  )
)
```

La Fecha Aviso se compara directo con ticks() porque el flujo la guarda como fecha y hora (utcNow()), mientras que la Fecha de Renovación se convierte desde número de serie.

Después de enviar el correo, "Actualizar una fila" escribe utcNow() en la columna Fecha Aviso correspondiente, ubicando la fila por el ID Extintor.

## 5. Ciclo anual y operación

Para que los avisos se repitan cada año, solo hay que actualizar la Fecha de Renovación cuando el extintor se recarga. No hay que borrar las columnas de aviso.

**Ejemplo de un ciclo (EXT-001):**

| Momento | Fecha de Renovación | Fecha de Expiración | Qué pasa |
| --- | --- | --- | --- |
| Renovación | 2026-04-01 | 2027-04-01 | Inicia el ciclo; avisos vacíos |
| 30 días antes | 2026-04-01 | 2027-04-01 | 2027-03-02: correo y se llena Fecha Aviso 30 |
| 15 días antes | 2026-04-01 | 2027-04-01 | 2027-03-17: correo y se llena Fecha Aviso 15 |
| 5 días antes | 2026-04-01 | 2027-04-01 | 2027-03-27: correo y se llena Fecha Aviso 5 |
| Nueva renovación | 2027-04-01 | 2028-04-01 | Los avisos quedan anteriores a la nueva renovación → se reactivan para 2028 |

**Tareas del responsable SST:**

1. Al recibir un aviso, programar la recarga del extintor.
2. Cuando se renueve, escribir la nueva fecha en Fecha de Renovación (columna D).
3. Al agregar un extintor nuevo, añadir la fila dentro de TablaExtintores y llenar ID, Serial, Ubicación y Fecha de Renovación.
4. Completar la Fecha de Renovación de los extintores que aún no la tienen.

**Solución de problemas:**

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| Un extintor no genera avisos | Falta Fecha de Renovación o la fila quedó fuera de la tabla | Llenar la fecha y verificar que la fila esté dentro de TablaExtintores |
| No llegan avisos tras una renovación | La Fecha de Renovación no se actualizó | Escribir la nueva fecha en la columna D |
| Llegan avisos repetidos | Se borró o editó a mano una columna Fecha Aviso | Dejar que el flujo administre las columnas F, G y H |
| El flujo falla al leer el Excel | Se movió o renombró el archivo, la hoja o la tabla | Restaurar la ruta y el nombre TablaExtintores, o actualizar el paso "Enumerar las filas de una tabla" |
| Fechas que no se interpretan | Fecha escrita como texto o en otro formato | Usar formato de fecha AAAA-MM-DD |
