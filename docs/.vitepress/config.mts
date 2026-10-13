import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'es-CO',
  title: 'Documentación de Proyectos',
  description: 'Documentación de los proyectos de automatización con Microsoft 365',
  // GitHub Pages publica el sitio en https://lacimarrona.github.io/flujos-powerautomate/
  base: '/flujos-powerautomate/',
  cleanUrls: true,
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Contratos', link: '/contratos/' },
      { text: 'Solicitudes GRF-FR-45', link: '/solicitudes-informaticas/' },
      { text: 'Extintores', link: '/extintores/' }
    ],

    sidebar: [
      {
        text: 'Renovaciones y Terminaciones de Contratos',
        collapsed: false,
        items: [
          { text: 'Resumen', link: '/contratos/' },
          { text: 'Documentación del sistema', link: '/contratos/documentacion-sistema' },
          { text: 'Plan de mejoras', link: '/contratos/plan-mejoras' }
        ]
      },
      {
        text: 'Solicitudes Informáticas (GRF-FR-45)',
        collapsed: false,
        items: [
          { text: 'Resumen', link: '/solicitudes-informaticas/' },
          { text: 'Documentación del proceso', link: '/solicitudes-informaticas/grf-fr-45-solicitudes-informaticas' }
        ]
      },
      {
        text: 'Alertas de Vencimiento de Extintores',
        collapsed: false,
        items: [
          { text: 'Resumen', link: '/extintores/' },
          { text: 'Documentación del flujo', link: '/extintores/flujo-alertas-vencimiento' }
        ]
      }
    ],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
          modal: {
            noResultsText: 'Sin resultados para',
            resetButtonTitle: 'Limpiar búsqueda',
            footer: { selectText: 'seleccionar', navigateText: 'navegar', closeText: 'cerrar' }
          }
        }
      }
    },

    outline: { level: [2, 3], label: 'En esta página' },
    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    lastUpdated: { text: 'Última actualización' },
    darkModeSwitchLabel: 'Apariencia',
    lightModeSwitchTitle: 'Cambiar a modo claro',
    darkModeSwitchTitle: 'Cambiar a modo oscuro',
    sidebarMenuLabel: 'Menú',
    returnToTopLabel: 'Volver arriba',
    notFound: {
      title: 'Página no encontrada',
      quote: 'La página que busca no existe o fue movida.',
      linkText: 'Ir al inicio'
    }
  }
})
