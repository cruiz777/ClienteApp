import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VideosAyudaResponse } from '../../../../interfaces/responses/videos-ayuda-response';
import { VideosAyudaService } from '../../../../services/videos-ayuda.service';

interface VideosPorSistema {
  nombreSistema: string;
  idSistema: number;
  videos: VideosAyudaResponse[];
}

@Component({
  selector: 'app-videos-ayuda-modal',
  templateUrl: './videos-ayuda-modal.component.html',
  styleUrls: ['./videos-ayuda-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideosAyudaModalComponent implements OnInit {
  videosPorSistema: VideosPorSistema[] = [];
  sistemaSeleccionado: number = 0;
  videoSeleccionado: VideosAyudaResponse | null = null;
  videoEmbedUrl: SafeResourceUrl | null = null;
  loading: boolean = true;

  // NUEVA PROPIEDAD: Cachear categorías
  categoriasActuales: Array<{ key: string; value: VideosAyudaResponse[] }> = [];

  constructor(
    private videosService: VideosAyudaService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarVideos();
  }

  cargarVideos(): void {
    this.loading = true;

    this.videosService.getAll().subscribe({
      next: (response) => {
        console.log('Respuesta del API:', response); // Para debug

        if (response.data && response.data.length > 0) {
          // Filtrar solo activos
          const videosActivos = response.data.filter(v => v.activo);

          if (videosActivos.length > 0) {
            // Organizar videos por sistema
            this.organizarVideosPorSistema(videosActivos);

            // Seleccionar el primer video del primer sistema
            if (this.videosPorSistema.length > 0 && this.videosPorSistema[0].videos.length > 0) {
              this.seleccionarSistema(0); // Usar el método para cachear las categorías
            }
          }
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar videos:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private organizarVideosPorSistema(videos: VideosAyudaResponse[]): void {
    const sistemaMap = new Map<number, VideosAyudaResponse[]>();

    videos.forEach(video => {
      if (!sistemaMap.has(video.idSistema)) {
        sistemaMap.set(video.idSistema, []);
      }
      sistemaMap.get(video.idSistema)?.push(video);
    });

    this.videosPorSistema = Array.from(sistemaMap.entries()).map(([idSistema, videosDelSistema]) => ({
      idSistema: idSistema,
      nombreSistema: videosDelSistema[0].nombreSistema || 'Sin nombre',
      videos: videosDelSistema.sort((a, b) => a.orden - b.orden)
    }));

    this.videosPorSistema.sort((a, b) => a.idSistema - b.idSistema);
  }

  seleccionarSistema(index: number): void {
    this.sistemaSeleccionado = index;

    if (this.videosPorSistema[index].videos.length > 0) {
      // Cachear categorías cuando cambia de sistema
      this.actualizarCategorias(this.videosPorSistema[index].videos);

      // Seleccionar primer video
      this.seleccionarVideo(this.videosPorSistema[index].videos[0]);
    }
  }

  seleccionarVideo(video: VideosAyudaResponse): void {
    this.videoSeleccionado = video;
    this.videoEmbedUrl = this.getYoutubeEmbedUrl(video.urlVideo);
    this.cdr.markForCheck();
  }

  // NUEVO MÉTODO: Actualizar categorías cacheadas
  private actualizarCategorias(videos: VideosAyudaResponse[]): void {
    const porCategoria = new Map<string, VideosAyudaResponse[]>();

    videos.forEach(video => {
      const categoria = video.nombreCategoria || 'Sin categoría';
      if (!porCategoria.has(categoria)) {
        porCategoria.set(categoria, []);
      }
      porCategoria.get(categoria)?.push(video);
    });

    // Convertir Map a Array para usar en el template
    this.categoriasActuales = Array.from(porCategoria.entries()).map(([key, value]) => ({
      key,
      value
    }));
  }

  private getYoutubeEmbedUrl(url: string): SafeResourceUrl {
    const videoId = this.extractVideoId(url);
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  private extractVideoId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  }
}
