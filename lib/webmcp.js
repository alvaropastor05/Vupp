// WebMCP: expone a los agentes del navegador la información pública de la web.
// Solo lectura y sin efecto visual. Los datos salen de lib/manifest.js.
(function () {
  "use strict";

  var modelContext = document.modelContext || navigator.modelContext;
  var brand = window.__BRAND__;
  if (!brand || !modelContext || typeof modelContext.registerTool !== "function") return;

  var tools = [
    {
      name: "get_stats",
      description: "Devuelve las cifras públicas de Vupp.: escuchas totales, oyentes mensuales en Spotify y seguidores en Instagram.",
      getData: function () {
        return brand.stats.map(function (stat) {
          return { label: stat.label, value: stat.value + stat.suffix };
        });
      }
    },
    {
      name: "get_services",
      description: "Devuelve los servicios que ofrece Vupp.: producción de instrumentales, grabación y mix y máster.",
      getData: function () {
        return brand.services.map(function (service) {
          return { title: service.title, description: service.desc };
        });
      }
    },
    {
      name: "get_collaborators",
      description: "Devuelve los artistas con los que ha colaborado Vupp.",
      getData: function () {
        return brand.collaborators;
      }
    },
    {
      name: "get_contact_links",
      description: "Devuelve los perfiles públicos de Vupp. El canal de contacto para encargar trabajos es Instagram.",
      getData: function () {
        return { contact: brand.links.instagram, links: brand.links };
      }
    }
  ];

  tools.forEach(function (tool) {
    Promise.resolve()
      .then(function () {
        return modelContext.registerTool({
          name: tool.name,
          description: tool.description,
          inputSchema: { type: "object", properties: {} },
          annotations: { readOnlyHint: true },
          execute: function () {
            return { content: [{ type: "text", text: JSON.stringify(tool.getData()) }] };
          }
        });
      })
      .catch(function (error) {
        console.warn("WebMCP: no se pudo registrar " + tool.name, error);
      });
  });
})();
