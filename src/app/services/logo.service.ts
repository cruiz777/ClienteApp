import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private baseUrl = `${environment.securityApiUrl}/logo`; // Ajusta a tu dominio real
  private logoSubject = new BehaviorSubject<string | null>(null);
  logoUrl$ = this.logoSubject.asObservable();
  constructor(private http: HttpClient) {}

  /**
   * Sube un archivo (logo) al backend
   */
  uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ nombreArchivo: string }>(`${this.baseUrl}/upload`, formData);
  }
  updateLogo(fileName: string) {
    const url = this.getLogoUrl(fileName);
    this.logoSubject.next(url);
  }
  /**
   * Devuelve la URL absoluta para mostrar un logo
   */
  getLogoUrl(nombreArchivo: string): string {
    return `${environment.securityApiUrl}/Logo/${nombreArchivo}`;
  }

}
