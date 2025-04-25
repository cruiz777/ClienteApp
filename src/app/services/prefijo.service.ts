import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PrefijoService {

  private apiBaseUrl = environment.applicationUrl;

  // ✅ Inyección de HttpClient
  constructor(private http: HttpClient) {}

  guardarPrefijo(data: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/Prefijos`, data);
  }
}
