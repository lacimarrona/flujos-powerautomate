# flujos-powerautomate

Documentación de los proyectos de automatización con Microsoft 365 (Power Automate, Office Scripts, Forms) de La Cimarrona E.S.P.

## Proyectos

| Proyecto | Resumen | Documentación |
|---|---|---|
| Renovaciones y Terminaciones de Contratos | [docs/contratos/index.md](docs/contratos/index.md) | [documentacion-sistema.md](docs/contratos/documentacion-sistema.md) |
| Solicitudes Informáticas (GRF-FR-45) | [docs/solicitudes-informaticas/index.md](docs/solicitudes-informaticas/index.md) | [grf-fr-45-solicitudes-informaticas.md](docs/solicitudes-informaticas/grf-fr-45-solicitudes-informaticas.md) |

## Sitio publicado (GitHub Pages)

https://lacimarrona.github.io/flujos-powerautomate/

El sitio se genera con [VitePress](https://vitepress.dev). Cada push a `main` lo reconstruye y publica automáticamente mediante [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

- **Agregar o editar páginas:** los archivos `.md` están en `docs/`. El menú lateral se define en [docs/.vitepress/config.mts](docs/.vitepress/config.mts).
- **Vista previa local:** `npm install` y luego `npm run docs:dev`.
- **No incluir datos sensibles** (correos, rutas internas, cédulas, contraseñas): el sitio es público.

## Ver el sitio en local con Scalar Docs (opcional)

Requisitos: Node 24+ y `npm install -g @scalar/cli`.

En **PowerShell**, desde la raíz del repositorio:

```powershell
$env:CHOKIDAR_USEPOLLING='1'; & "$env:APPDATA\npm\scalar.cmd" project preview scalar.config.json
```

Luego abrir http://localhost:7970/.

- Se usa la ruta completa de `scalar.cmd` porque Git para Windows trae otro comando `scalar` que aparece primero en el PATH.
- `CHOKIDAR_USEPOLLING` solo es necesario si la carpeta está en una unidad de red.
