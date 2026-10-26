export const environment = {
  production: true,
   securityApiUrl: 'http://10.10.7.19:5001/security/api', // URL de la API en desarrollo
 applicationUrl: 'http://10.10.7.19:5001/security/api',  //Cambiar por la url de clientes en el merge
  //mantenimiento contable

 clientsUrl: 'http://10.10.7.19:5002/clients/api',


  invoicesUrl: 'http://10.10.7.19:5003/invoices/api',

  validationUrl:'http://10.10.7.19:5004/validations/api',

  reportUrl: 'http://10.10.7.19:5005/reports/api',
  balanceApiUrl: 'http://10.10.7.19:5080/balance/api',
  inventoryUrl: 'http://10.10.7.19:5011/inventories/api',
  transactionUrl: 'http://10.10.7.19:5070/transaction/api',
 maintenanceUrl: 'http://10.10.7.19:5030/maintenance-cg/api',
    invoices_sic:'http://10.10.7.19:5010/invoices-sic/api',
    docs: 'http://10.10.7.4:8080/api/docs/api',
    idEmisorPorDefecto: 4,
    rucUlr:'http://10.10.7.4:8080/api/services/ruc/',
    cedulaUrl:'http://10.10.7.4:8080/api/services/cedula/',
  docsLocal: 'http://10.10.7.4:8080/api/docs-local/api',
      // apiKey: 'ilGxoWJ9Arp0JdSNuO81aq9sX6ZW9gK9767867tgb',
      anexoTransaccionalUrl: 'http://10.10.7.19:5081/anexo/api',
      cxpUrl:'http://localhost:0000/cxp/api',
      conciliacionUrl:'http://10.10.7.19:5082/conciliacion/api',
      maintenanceRolUrl: 'http://10.10.7.19:5090/maintenance-rol/api',
      employeesUrl: 'http://10.10.7.19:5091/employees/api',
    nominaEspecialUrl: 'http://localhost:5092/nomina-especial/api',
    nominaUrl: 'http://localhost:5093/nomina/api',
    novedadeslUrl: 'http://localhost:5093/nomina/api',
};
