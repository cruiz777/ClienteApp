import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface JsonEmpresaRequest {
  status: 'ACTIVE' | 'INACTIVE';
  licenceKey: string;
  licenseeName: string;
  licenseeGLN: string;

  streetAddress: string;
  canton: string;
  postalName: string;
  provincia: string;
  ciudad: string;

  postalCode: string;           // 1..10 (si viene vacío => default)
  // postOfficeBoxNumber?: string; // 👈 ya NO se usa; lo mandamos igual que postalCode

  email: string;
  telefono: string;             // puede venir como 593..., o +593...
  website: string;

  dapi: string;                 // URL destino
  capi: string;                 // API key

  countrySubdivisionCode?: string;
}

@Injectable({ providedIn: 'root' })
export class JsonEmpresaService {
  constructor(private http: HttpClient) {}

  // ✅ Mapa ISO 3166-2 Ecuador
  private readonly provinciasISO: Record<string, string> = {
    'AZUAY': 'EC-A',
    'BOLÍVAR': 'EC-B',
    'BOLIVAR': 'EC-B',
    'CAÑAR': 'EC-F',
    'CANAR': 'EC-F',
    'CARCHI': 'EC-C',
    'CHIMBORAZO': 'EC-H',
    'COTOPAXI': 'EC-X',
    'EL ORO': 'EC-O',
    'ESMERALDAS': 'EC-E',
    'GALÁPAGOS': 'EC-W',
    'GALAPAGOS': 'EC-W',
    'GUAYAS': 'EC-G',
    'IMBABURA': 'EC-I',
    'LOJA': 'EC-L',
    'LOS RÍOS': 'EC-R',
    'LOS RIOS': 'EC-R',
    'MANABÍ': 'EC-M',
    'MANABI': 'EC-M',
    'MORONA SANTIAGO': 'EC-S',
    'NAPO': 'EC-N',
    'ORELLANA': 'EC-D',
    'PASTAZA': 'EC-Y',
    'PICHINCHA': 'EC-P',
    'SANTA ELENA': 'EC-SE',
    'SANTO DOMINGO DE LOS TSÁCHILAS': 'EC-SD',
    'SANTO DOMINGO DE LOS TSACHILAS': 'EC-SD',
    'SUCUMBÍOS': 'EC-U',
    'SUCUMBIOS': 'EC-U',
    'TUNGURAHUA': 'EC-T',
    'ZAMORA CHINCHIPE': 'EC-Z'
  };

  private normalizarProvincia(valor: string): string {
    return (valor || '').trim().toUpperCase().replace(/\s+/g, ' ');
  }

  private getCodigoSubdivisionEC(provincia: string): string {
    const key = this.normalizarProvincia(provincia);
    return this.provinciasISO[key] || '';
  }

  private normalizarTelefonoE164(raw: string): string | null {
    let tel = (raw || '').trim().replace(/\s+/g, '').replace(/-/g, '');
    if (!tel) return null;

    // si viene como \u002B593 en JSON, al parsear ya es "+593"
    if (tel.startsWith('+')) return tel;
    if (tel.startsWith('593')) return `+${tel}`;

    // lo deja tal cual si no cumple (por si viene otro formato)
    return tel;
  }

  private buildPayload(data: JsonEmpresaRequest): any[] {
    // ✅ licenceKey: anteponer 786 solo si no está
    const rawKey = (data.licenceKey || '').trim();
    const licenceKeyFinal = rawKey.startsWith('786') ? rawKey : ('786' + rawKey);

    // ✅ postalCode: 1..10 (si viene vacío => default)
    let postalCode = (data.postalCode || '').trim();
    if (!postalCode) postalCode = '000000';
    if (postalCode.length > 10) postalCode = postalCode.substring(0, 10);

    // ✅ postOfficeBoxNumber: MISMO valor que postalCode (como pediste)
    let pob = postalCode;
    if (pob.length > 20) pob = pob.substring(0, 20);

    // ✅ ISO subdivision (si no viene explícito, se calcula con provincia)
    const subdivision =
      (data.countrySubdivisionCode || '').trim() ||
      this.getCodigoSubdivisionEC(data.provincia);

    const address: any = {
      streetAddress: { language: 'es', value: data.streetAddress || '' },
      addressLocality: { language: 'es', value: data.canton || '' },
      countryCode: 'EC',
      postalName: { language: 'es', value: (data.postalName || data.licenseeName || '').trim() },
      streetAddressLine2: { language: 'es', value: 's/n' },
      crossStreet: { language: 'es', value: 's/n' },
      addressSuburb: { language: 'es', value: data.ciudad || '' },
      addressRegion: { language: 'es', value: data.provincia || '' },
      postalCode,
      countrySubdivisionCode: subdivision,

      // ✅ siempre enviar y que sea igual a postalCode
      postOfficeBoxNumber: pob
    };

    const telE164 = this.normalizarTelefonoE164(data.telefono);

    // ✅ contactPoint sin duplicados y sin nulls
    const contact: any = {};
    if (data.email?.trim()) contact.email = data.email.trim();
    if (telE164) contact.telephone = telE164;
    if (data.website?.trim()) contact.website = data.website.trim();

    return [{
      licenceKey: licenceKeyFinal,
      licenceType: 'GCP',
      licenceStatus: data.status,
      licenseeName: data.licenseeName,
      licenseeGLN: data.licenseeGLN,
      address,
      contactPoint: [contact]
    }];
  }

  generarJsonEmpresa(data: JsonEmpresaRequest): Observable<unknown> {
    const jsonData = this.buildPayload(data);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'APIKey': data.capi
    });

    return this.http.post(data.dapi, jsonData, { headers });
  }

  descargarArchivo(jsonData: any, nombre: string): void {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const safeName = (nombre || 'empresa').trim().replace(/\s+/g, '_');
    const nombreArchivo = `gs1_ec_${safeName}_${fecha}.json`;

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }

  // Útil para que el componente descargue exactamente lo que se envió
  buildJson(data: JsonEmpresaRequest): any[] {
    return this.buildPayload(data);
  }
}
