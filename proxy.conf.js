const { env } = require('process');

const target = 'http://localhost:8000';

const PROXY_CONFIG = [
  {
    context: [
      "/security/api",
      "/clients/api",
      "/invoices/api",
      "/validations/api",
      "/reports/api",
      "/balance/api",
      "/inventories/api",
      "/transaction/api",
      "/maintenance-cg/api",
      "/invoices-sic/api",
      "/docs/api",
      "/docs-local/api",
      "/anexo/api",
      "/cxp/api",
      "/conciliacion/api",
      "/maintenance-rol/api",
      "/employees/api",
      "/nomina-especial/api",
      "/nomina/api",
      "/novedades/api"
    ],
    target: target,
    secure: false,
    changeOrigin: true,
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('X-API-Key', env.FRONTEND_API_KEY || '');
    }
  }
]

module.exports = PROXY_CONFIG;