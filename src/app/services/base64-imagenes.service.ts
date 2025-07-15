import { Injectable } from "@angular/core";
import { FirmaService } from "./firma.service";
import { LogoService } from "./logo.service";
import { EmpresaService } from "./empresa.service";
import { UsuarioService } from "./usuario.service";

@Injectable({ providedIn: 'root' })
export class ConversionImagenService {
  constructor(
    private logoService: LogoService,
    private firmaService: FirmaService,
    private empresaService: EmpresaService,
    private usuarioService: UsuarioService
  ) {}

  async getLogoBase64(): Promise<string> {
    const url = this.logoService.getLogoUrl('logo-default.png');
    return this.convertirABase64(url);
  }

  async getFirmaBase64(): Promise<string> {
    const url = this.firmaService.getFirmaUrl('firma-default.png');
    return this.convertirABase64(url);
  }

  private async convertirABase64(url: string): Promise<string> {
    const blob = await fetch(url).then(r => r.blob());
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async cargarLogoYFirmaPorEmpresa(idEmpresa: number): Promise<void> {
    try {
      const response = await this.empresaService.getLogoFirma(idEmpresa).toPromise();
      if (response?.logo) {
        const logoUrl = this.logoService.getLogoUrl(response.logo);
        this.logoService.updateLogoUrl(logoUrl);
      }
      if (response?.firma) {
        const firmaUrl = this.firmaService.getFirmaUrl(response.firma);
        this.firmaService.updateFirmaUrl(firmaUrl);
      }
    } catch (error) {
      console.warn('❌ Error al cargar logo y firma:', error);
    }
  }

  async getLogoActualBase64(): Promise<string | null> {
    const idEmpresa = this.usuarioService.getEmpresaId();
    if (idEmpresa) {
      const response = await this.empresaService.getLogoFirma(idEmpresa).toPromise();
      if (response?.logo) {
        const logoUrl = this.logoService.getLogoUrl(response.logo);
        return this.convertirABase64(logoUrl);
      }
    }
    return null;
  }

  async getFirmaActualBase64(): Promise<string | null> {
    const idEmpresa = this.usuarioService.getEmpresaId();
    if (idEmpresa) {
      const response = await this.empresaService.getLogoFirma(idEmpresa).toPromise();
      if (response?.firma) {
        const firmaUrl = this.firmaService.getFirmaUrl(response.firma);
        return this.convertirABase64(firmaUrl);
      }
    }
    return null;
  }
}
