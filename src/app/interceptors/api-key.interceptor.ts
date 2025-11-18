import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // Debug simple
    console.log('🔍 INTERCEPTOR:', req.method, req.url);
    
    const gatewayUrls = [
      environment.securityApiUrl,
      environment.applicationUrl,
      environment.clientsUrl,
      environment.invoicesUrl,
      environment.validationUrl,
      environment.reportUrl,
      environment.invoices_sic,
      environment.rucUlr,
      environment.cedulaUrl,
      environment.inventoryUrl,
      environment.transactionUrl,
      
    ];
    
    // Verificar si es una petición a través del gateway
    const isGatewayRequest = gatewayUrls.some(url => req.url.startsWith(url));
    
    if (!isGatewayRequest) {
      console.log('🌐 EXTERNAL REQUEST - sin API Key');
      return next.handle(req);
    }
    
    // TODAS las peticiones al gateway llevan API Key
    // El middleware del backend decidirá cuáles realmente la necesitan
    console.log('✅ GATEWAY REQUEST - agregando API Key');
    
    const apiKeyReq = req.clone({
      setHeaders: {
        'X-API-Key': environment.apiKey
      }
    });
    
    return next.handle(apiKeyReq).pipe(
      tap({
        next: (event) => console.log('✅ Respuesta exitosa:', req.url),
        error: (error) => {
          console.error('❌ Error:', req.url, 'Status:', error.status);
        }
      })
    );
  }
}