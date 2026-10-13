# Solicitudes Informáticas (GRF-FR-45)

**Entidad:** La Cimarrona E.S.P. · **Área:** Sistemas de Información · **Herramientas:** Microsoft Forms, Excel en SharePoint, Power Automate, Outlook · **Licencia:** Microsoft 365 Empresa Estándar (sin conectores Premium).

## Resumen

Automatización del ciclo de vida de las solicitudes informáticas del formato **GRF-FR-45**, desde que un funcionario radica la solicitud hasta que recibe la respuesta por correo.

## Cómo funciona

1. El funcionario diligencia el **formulario de Microsoft Forms**, disponible en el menú lateral de la INTRANET.
2. La solicitud queda registrada en el **Excel de seguimiento** con estado **Abierto** y la fecha y hora de radicación.
3. El técnico registra el diagnóstico, la solución, quién atendió y, **de último**, la fecha de cierre.
4. El flujo **"GRF-FR-45 - Enviar respuesta"** (lunes a viernes, cada 5 minutos, de 8:00 a 11:55 y de 14:00 a 15:55) envía al solicitante un correo con el formato institucional y registra la hora del envío. La fila pasa a **Cerrado**.

## Beneficios principales

- El técnico no redacta correos: el registro, el estado y la respuesta son automáticos.
- Trazabilidad completa de cada solicitud, útil para indicadores de tiempos de respuesta y carga por responsable.
- Doble control para no enviar correos duplicados.
- Funciona en la nube, sin costo adicional.

👉 Consulte la [documentación completa del proceso](./grf-fr-45-solicitudes-informaticas.md).
