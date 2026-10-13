# Renovaciones y Terminaciones de Contratos

**Área:** Talento Humano · **Herramientas:** Excel en SharePoint, Office Scripts, Power Automate, Outlook · **Licencia:** Microsoft 365 Business Standard (solo conectores estándar).

## Resumen

Sistema que automatiza el control de los contratos laborales a término fijo, que se renuevan cada **6 meses**. Calcula las fechas de terminación, genera las cartas de **no continuidad** y de **continuidad** a partir de las plantillas oficiales, y envía cada día un correo con las alertas ordenadas por urgencia y las cartas adjuntas.

## Componentes

- **Excel en SharePoint** con las hojas COLABORADORES, BASE_DE_DATOS (historial), INFORME (consulta por CC o nombre), DIRECTORES y RESPONSABLES (firmas).
- **Office Scripts:** ProcesarContratos, MarcarAvisos, ConfirmarRenovacion (botón en la hoja) y CargarAntiguos.
- **Power Automate:** flujo *"Contratos - Alertas diarias"*, que se ejecuta todos los días a las 7:00 a. m.
- **Carpetas de SharePoint** para las plantillas y las cartas generadas.

## Ciclo de un contrato

1. **2 meses antes** de la terminación se genera la carta de no continuidad.
2. **35 días antes**, si la carta no se ha registrado como entregada, llega un aviso (el preaviso legal es de 30 días).
3. **10 días antes** se pide decidir si el contrato se renueva (**SI** + botón, o **NO**).
4. Si se renueva, se genera la carta de continuidad. Al registrar su entrega, el sistema cierra el ciclo, lo guarda en el historial y abre el siguiente período.

## Beneficios principales

- Fechas calculadas con una sola regla e historial completo de cada colaborador.
- Cartas sin errores de digitación y firmas configurables sin conocimientos técnicos.
- No se pierden ni se repiten avisos: un solo correo diario y un correo de error si algo falla.
- Sin costo adicional: usa la licencia de Microsoft 365 que ya tiene la entidad.

👉 Consulte la [documentación completa del sistema](./documentacion-sistema.md) y el [plan de mejoras](./plan-mejoras.md), que propone las siguientes fases: un Excel más claro, tarjetas interactivas en Teams y un formulario de ingreso de colaboradores.
