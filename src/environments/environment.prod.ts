export const environment = {
  production: true,
   securityApiUrl: 'http://localhost:8000/security/api', // URL de la API en desarrollo
 applicationUrl: 'http://localhost:8000/security/api',  //Cambiar por la url de clientes en el merge

  //mantenimiento contable
 maintenanceUrl: 'http://localhost:5030/maintenance/api',
 transactionUrl: 'http://localhost:5070/transaction/api',
 clientsUrl: 'http://localhost:8000/clients/api',

  invoicesUrl: 'http://localhost:8000/invoices/api',

  validationUrl:'http://localhost:8000/validations/api',

  reportUrl: 'http://localhost:8000/reports/api',
  
  inventoryUrl: 'http://localhost:8000/inventories/api',

    invoices_sic:'http://localhost:8000/invoices-sic/api',
  rucUlr:'http://10.10.7.4:8080/api/services/ruc/',
  cedulaUrl:'http://10.10.7.4:8080/api/services/cedula/',
      apiKey: 'ilGxoWJ9Arp0JdSNuO81aq9sX6ZW9gK9767867tgb',

};
