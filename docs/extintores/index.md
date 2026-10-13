# Alertas de Vencimiento de Extintores

**Área:** Seguridad y Salud en el Trabajo (SST) · **Herramientas:** Excel en SharePoint, Power Automate, Outlook · **Estado:** activo en producción.

## Resumen

Flujo de Power Automate que avisa por correo al Profesional SST cuando a un extintor le faltan **30, 15 y 5 días** para vencer. Así la renovación se gestiona a tiempo. Cada extintor vence **un año después de su última renovación**, por lo que el proceso es cíclico: al registrar una nueva renovación, los avisos se reactivan para el siguiente año.

## Cómo funciona

1. El inventario está en la tabla **TablaExtintores** del archivo `extintores.xlsx` en la INTRANET. La Fecha de Expiración se calcula sola: Fecha de Renovación + 12 meses.
2. Todos los días a las **7:00 a. m.** el flujo revisa cada extintor y calcula los días que le faltan para vencer.
3. Según el rango (16 a 30, 6 a 15, o 5 o menos días) envía un aviso **preventivo**, un **recordatorio** o un aviso **urgente**.
4. Registra la fecha del aviso en el Excel para no repetirlo en el mismo ciclo.

## Lo que debe hacer el responsable SST

- Programar la recarga del extintor al recibir un aviso.
- Escribir la nueva **Fecha de Renovación** cuando se recargue. No hay que borrar las columnas de aviso.
- Agregar los extintores nuevos **dentro** de la tabla.

## Beneficios principales

- Ningún vencimiento pasa desapercibido: si el flujo no corre un día, el aviso sale en la siguiente ejecución.
- Tres niveles de alerta con colores, tanto en el correo como en el Excel.
- Sin avisos duplicados y sin mantenimiento manual de las columnas de control.

👉 Consulte la [documentación completa del flujo](./flujo-alertas-vencimiento.md).
