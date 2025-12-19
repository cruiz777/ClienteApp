import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse } from './producto.service';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { VideosAyudaResponse } from '../interfaces/responses/videos-ayuda-response';
import { VideosAyudaRequest } from '../interfaces/requests/videos-ayuda-request';

@Injectable({
  providedIn: 'root'
})
export class VideosAyudaService {
  private apiUrl = `${environment.securityApiUrl}/VideosAyuda`;

  constructor(private http: HttpClient) {}

  // ============= ENDPOINTS DE YOUTUBE =============

  getAll(): Observable<ApiListResponse<VideosAyudaResponse[]>> {
    return this.http.get<ApiListResponse<VideosAyudaResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<VideosAyudaResponse>> {
    return this.http.get<ApiResponse<VideosAyudaResponse>>(`${this.apiUrl}/${id}`);
  }

  getBySistema(idSistema: number): Observable<ApiListResponse<VideosAyudaResponse[]>> {
    return this.http.get<ApiListResponse<VideosAyudaResponse[]>>(`${this.apiUrl}/sistema/${idSistema}`);
  }

  getActivosBySistema(idSistema: number): Observable<ApiListResponse<VideosAyudaResponse[]>> {
    return this.http.get<ApiListResponse<VideosAyudaResponse[]>>(`${this.apiUrl}/sistema/${idSistema}/activos`);
  }

  create(data: VideosAyudaRequest): Observable<ApiResponse<VideosAyudaResponse>> {
    return this.http.post<ApiResponse<VideosAyudaResponse>>(this.apiUrl, data);
  }

  update(id: number, data: VideosAyudaRequest): Observable<ApiResponse<VideosAyudaResponse>> {
    return this.http.put<ApiResponse<VideosAyudaResponse>>(`${this.apiUrl}/${id}`, data);
  }

  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}/soft`);
  }

  // =============NUEVOS ENDPOINTS PARA ARCHIVOS =============

  /**
   * Sube un archivo de video al servidor
   * @param file Archivo MP4 a subir
   * @returns Observable con el nombre del archivo generado
   */
  uploadVideoFile(file: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/files/upload`, formData);
  }

  /**
   * Sube un archivo con reporte de progreso
   * @param file Archivo MP4 a subir
   * @returns Observable con eventos de progreso y respuesta final
   */
  uploadVideoFileWithProgress(file: File): Observable<HttpEvent<ApiResponse<string>>> {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.apiUrl}/files/upload`, formData, {
      reportProgress: true
    });

    return this.http.request<ApiResponse<string>>(req);
  }

  /**
   * Obtiene la URL completa para reproducir un video local
   * @param filename Nombre del archivo (ej: "video-123456.mp4")
   * @returns URL completa para el tag <video>
   */
  getVideoStreamUrl(filename: string): string {
    return `${this.apiUrl}/files/stream/${filename}`;
  }

  /**
   * Elimina un archivo físico del servidor
   * @param filename Nombre del archivo a eliminar
   * @returns Observable con resultado de la operación
   */
  deleteVideoFile(filename: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/files/delete/${filename}`);
  }

  /**
   * Detecta si una URL es de YouTube o archivo local
   * @param urlVideo URL del video
   * @returns true si es YouTube, false si es local
   */
  isYouTubeUrl(urlVideo: string): boolean {
    return urlVideo.startsWith('http://') || urlVideo.startsWith('https://');
  }

  /**
   * Extrae el ID del video de YouTube de una URL
   * @param url URL de YouTube
   * @returns ID del video o null si no es válida
   */
  extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}
