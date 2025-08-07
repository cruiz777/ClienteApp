import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EmpresaService } from './empresa.service';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private logoSubject = new BehaviorSubject<string | null>(null);
  logoUrl$ = this.logoSubject.asObservable();

  constructor(
    private http: HttpClient,
    private empresaService: EmpresaService
  ) {}

  /**
   * Carga el logo desde la empresa (usando su ID)
   */
  loadLogoFromEmpresa(idEmpresa: number) {
    this.empresaService.getLogoFirma(idEmpresa).subscribe({
      next: (data) => {
        if (data.logo) {
          const fullUrl = this.getLogoUrl(data.logo);
          this.logoSubject.next(fullUrl);
        } else {
          this.logoSubject.next(null);
        }
      },
      error: () => this.logoSubject.next(null)
    });
  }
  updateLogoUrl(url: string) {
    this.logoSubject.next(url);
  }

  /**
   * Sube un archivo (logo)
   */
  uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ nombreArchivo: string }>(`${environment.securityApiUrl}/logo/upload`, formData);
  }

  updateLogo(fileName: string) {
    const url = this.getLogoUrl(fileName);
    this.logoSubject.next(url);
  }
  /**
   * Devuelve la URL absoluta para mostrar el logo
   */
  getLogoUrl(nombreArchivo: string): string {
    return `${environment.securityApiUrl}/logo/${nombreArchivo}`;
  }
}
