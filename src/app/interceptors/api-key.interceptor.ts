import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    const gatewayUrls = [
      environment.securityApiUrl,
      environment.applicationUrl,
      environment.clientsUrl,
      environment.invoicesUrl,
      environment.validationUrl,
      environment.reportUrl
    ];
    
    // Debug detallado
    console.log('🔍 INTERCEPTOR DEBUG:');
    console.log('   URL solicitada:', req.url);
    console.log('   Method:', req.method);
    console.log('   securityApiUrl:', environment.securityApiUrl);
    console.log('   apiKey presente:', !!environment.apiKey);
    
    const isGatewayRequest = gatewayUrls.some(url => {
      const matches = req.url.startsWith(url);
      console.log(`   ¿${req.url} inicia con ${url}? ${matches}`);
      return matches;
    });
    
    if (isGatewayRequest) {
      console.log('✅ AGREGANDO API KEY');
      
      const apiKeyReq = req.clone({
        setHeaders: {
          'X-API-Key': environment.apiKey
        }
      });
      
      console.log('   Headers agregados:', apiKeyReq.headers.get('X-API-Key') ? 'SÍ' : 'NO');
      
      return next.handle(apiKeyReq).pipe(
        tap({
          next: (event) => console.log('✅ Respuesta exitosa para:', req.url),
          error: (error) => {
            console.error('❌ Error en petición:', req.url);
            console.error('   Status:', error.status);
            console.error('   Message:', error.message);
            console.error('   Headers enviados:', apiKeyReq.headers.keys());
          }
        })
      );
    }
    
    console.log('❌ NO ES GATEWAY REQUEST - enviando sin API Key');
    return next.handle(req);
  }
}