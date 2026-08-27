import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class CedulaService {
  
  private baseUrl = environment.cedulaUrl;

  constructor(private http: HttpClient) {}

  obtenerDatosCedula(cedula: string): Observable<{ nombreCompleto: string }> {
    const url = `${this.baseUrl}${cedula}`;

    return this.http.get<any>(url).pipe(
      map(res => {
        return { nombreCompleto: res.consulta.nombreCompleto };
      })
    );
  }
}
