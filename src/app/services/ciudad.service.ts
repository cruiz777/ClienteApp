import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CiudadResumen } from '../interfaces/responses/ciudad-response';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

export interface Ciudad {
  id_ciudad: number;
  ciudad:string;
  canton: string;
  provincia: string;
  idzona:number;
}
@Injectable({
  providedIn: 'root'
})
export class CiudadService {

  private apiBaseUrl = environment.clientsUrl;
    private apiUrl = `${this.apiBaseUrl}/Ciudades`;
    private ciudadesUrl = `${environment.applicationUrl}/Ciudades/resume`;
    constructor(private http: HttpClient) {}

    obtenerCiudad(): Observable<Ciudad[]> {
      return this.http.get<any>(this.apiUrl).pipe(
        map(response => {
          console.log('✅ Respuesta del backend->:', response); // Verifica que llega al método
          debugger
          return response.data.map((item: any) => ({
            id_ciudad: item.id_ciudad,
            ciudad: item.ciudad,
            canton: item.canton,
            provincia:item.provincia,
            idzona:item.idzona
          }));
        })
      );
    }

    getCiudades(): Observable<CiudadResumen[]> {
      return this.http.get<ApiListResponse<CiudadResumen[]>>(this.ciudadesUrl).pipe(
        map(response => response.data)  // Extraemos solo el array de ciudades
      );
    }
    getCiudadById(id: number): Observable<Ciudad> {
  const url = `${this.apiUrl}/${id}`;  // Por ejemplo: /Ciudades/1

  return this.http.get<any>(url).pipe(
    map(response => {
      const data = response.data;
      return {
        id_ciudad: data.id_ciudad,
        ciudad: data.ciudad,
        canton: data.canton,
        provincia: data.provincia,
        idzona: data.idzona
      } as Ciudad;
    })
  );
}

}
