import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirmaService {
  private baseUrl = `${environment.securityApiUrl}/firma`; // Ajusta a tu dominio real
  private firmaSubject = new BehaviorSubject<string | null>(null);
  firmaUrl$ = this.firmaSubject.asObservable();
  
  constructor(private http: HttpClient) {}

  /**
   * Sube un archivo (firma) al backend
   */
  uploadFirma(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ nombreArchivo: string }>(`${this.baseUrl}/upload`, formData);
  }

  /**
   * Actualiza la firma actual en el observable
   */
  updateFirma(fileName: string) {
    const url = this.getFirmaUrl(fileName);
    this.firmaSubject.next(url);
  }

  /**
   * Devuelve la URL absoluta para mostrar una firma
   */
  getFirmaUrl(nombreArchivo: string): string {
    return `${environment.securityApiUrl}/Firma/${nombreArchivo}`;
  }
}