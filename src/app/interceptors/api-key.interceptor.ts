// api-key.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // Lista de URLs que usan el gateway (desde environment)
    //Aniadir los endpoints a la lista conforme se vaya necesitando
    const gatewayUrls = [
      environment.securityApiUrl,
      environment.applicationUrl,
      environment.clientsUrl,
      environment.invoicesUrl,
      environment.validationUrl,
      environment.reportUrl
    ];

    // Verificar si la petición es para alguna de nuestras APIs del gateway
    const isGatewayRequest = gatewayUrls.some(url => req.url.startsWith(url));

    if (isGatewayRequest) {
      // Clonar la petición y agregar el header
      const apiKeyReq = req.clone({
        setHeaders: {
          'X-API-Key': environment.apiKey
        }
      });
      
      return next.handle(apiKeyReq);
    }

    // Si no es para el gateway, enviar sin modificar
    return next.handle(req);
  }
}