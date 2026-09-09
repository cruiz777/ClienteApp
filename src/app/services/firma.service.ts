import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EmpresaService } from './empresa.service';

@Injectable({
  providedIn: 'root'
})
export class FirmaService {
  private firmaSubject = new BehaviorSubject<string | null>(null);
  firmaUrl$ = this.firmaSubject.asObservable();

  constructor(
    private http: HttpClient,
    private empresaService: EmpresaService
  ) {}

  /**
   * Carga la firma desde la empresa (usando su ID)
   */
  loadFirmaFromEmpresa(idEmpresa: number) {
    this.empresaService.getLogoFirma(idEmpresa).subscribe({
      next: (data) => {
        if (data.firma) {
          const fullUrl = this.getFirmaUrl(data.firma);
          this.firmaSubject.next(fullUrl);
        } else {
          this.firmaSubject.next(null);
        }
      },
      error: () => this.firmaSubject.next(null)
    });
  }
  updateFirmaUrl(url: string) {
    this.firmaSubject.next(url);
  }

  /**
   * Sube un archivo (firma)
   */
  uploadFirma(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ nombreArchivo: string }>(`${environment.securityApiUrl}/firma/upload`, formData);
  }
  
  /**
   * Actualiza la firma actual en el observable
   */
  updateFirma(fileName: string) {
    const url = this.getFirmaUrl(fileName);
    this.firmaSubject.next(url);
  }
  /**
   * Devuelve la URL absoluta para mostrar la firma
   */
  getFirmaUrl(nombreArchivo: string): string {
    return `${environment.securityApiUrl}/firma/${nombreArchivo}`;
  }
  
}
