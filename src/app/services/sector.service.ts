// src/app/services/sector.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface Sector {
  id_sector: number;
  descripcion: string;
  estado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SectorService {
   private apiBaseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) {}

obtenerSectores(): Observable<Sector[]> {
  return this.http.get<{ data: Sector[] }>(`${this.apiBaseUrl}/Sector`).pipe(
    map(response => response.data)
  );
}

}
