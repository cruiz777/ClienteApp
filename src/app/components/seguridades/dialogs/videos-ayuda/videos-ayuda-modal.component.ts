import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VideosAyudaResponse } from '../../../../interfaces/responses/videos-ayuda-response';
import { VideosAyudaService } from '../../../../services/videos-ayuda.service';

interface VideosPorSistema {
  nombreSistema: string;
  idSistema: number;
  videos: VideosAyudaResponse[];
  expandido: boolean; // ⬅️ NUEVO
}

interface CategoriaConEstado {
  key: string;
  value: VideosAyudaResponse[];
  expandido: boolean; // ⬅️ NUEVO
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
  categoriasPorSistema: Map<number, CategoriaConEstado[]> = new Map();
  videoStreamUrl: string | null = null;
  isYouTubeVideo: boolean = true;
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
    this.cdr.markForCheck();

    this.videosService.getAll().subscribe({
      next: (response) => {
        console.log('✅ Respuesta del API:', response);

        if (response.data && response.data.length > 0) {
          const videosActivos = response.data.filter(v => v.activo);

          if (videosActivos.length > 0) {
            this.organizarVideosPorSistema(videosActivos);

            // Auto-seleccionar primer video
        if (this.videosPorSistema.length > 0) {
          this.videosPorSistema[0].expandido = true;
          const primeraCategoria = this.getCategoriasPorSistema(this.videosPorSistema[0].idSistema)[0];
              if (primeraCategoria) {
                primeraCategoria.expandido = true; // Expandir primera categoría
                if (primeraCategoria.value.length > 0) {
                  this.seleccionarVideo(primeraCategoria.value[0]);
                }
              }
            }
          }
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Error al cargar videos:', error);
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
      videos: videosDelSistema.sort((a, b) => a.orden - b.orden),
      expandido: false // ⬅️ NUEVO
    }));
    this.videosPorSistema.forEach(sistema => {
      const categorias = this.crearCategoriasPorSistema(sistema.videos);
      this.categoriasPorSistema.set(sistema.idSistema, categorias);
    });
    this.videosPorSistema.sort((a, b) => a.idSistema - b.idSistema);
  }

  //Toggle sistema
  toggleSistema(index: number): void {
    this.videosPorSistema[index].expandido = !this.videosPorSistema[index].expandido;
    this.cdr.markForCheck();
  }

  // Toggle categoría
  toggleCategoria(categoria: CategoriaConEstado): void {
    categoria.expandido = !categoria.expandido;
    console.log('🔄 Categoría toggled:', categoria.key, 'Expandido:', categoria.expandido, 'Videos:', categoria.value.length);
    this.cdr.markForCheck();
  }

  //Seleccionar video y asegurar que el sistema esté seleccionado
  seleccionarVideoDirecto(video: VideosAyudaResponse): void {
    this.seleccionarVideo(video);

    // Opcional: cerrar otras categorías
    this.videosPorSistema.forEach(sistema => {
      const categorias = this.getCategoriasPorSistema(sistema.idSistema);
      categorias.forEach(cat => {
        // Cerrar todas excepto la del video seleccionado
        if (!cat.value.find(v => v.id === video.id)) {
          cat.expandido = false;
        }
      });
    });

    this.cdr.markForCheck();
  }

  seleccionarVideo(video: VideosAyudaResponse): void {
    this.videoSeleccionado = video;
    this.isYouTubeVideo = this.videosService.isYouTubeUrl(video.urlVideo);

    if (this.isYouTubeVideo) {
      // Es YouTube - usar iframe
      this.videoEmbedUrl = this.getYoutubeEmbedUrl(video.urlVideo);
      this.videoStreamUrl = null;
    } else {
      // Es video local - usar tag <video>
      this.videoStreamUrl = this.videosService.getVideoStreamUrl(video.urlVideo);
      this.videoEmbedUrl = null;
    }

    this.cdr.markForCheck();
  }

  // Retorna con estado expandido
  private crearCategoriasPorSistema(videos: VideosAyudaResponse[]): CategoriaConEstado[] {
    const porCategoria = new Map<string, VideosAyudaResponse[]>();

    videos.forEach(video => {
      const categoria = video.nombreCategoria || 'Sin categoría';
      if (!porCategoria.has(categoria)) {
        porCategoria.set(categoria, []);
      }
      porCategoria.get(categoria)?.push(video);
    });

    return Array.from(porCategoria.entries())
      .map(([key, value]) => ({
        key,
        value: value.sort((a, b) => a.orden - b.orden),
        expandido: false
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  private getYoutubeEmbedUrl(url: string): SafeResourceUrl {
    const videoId = this.extractVideoId(url);
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }
  getCategoriasPorSistema(idSistema: number): CategoriaConEstado[] {
    return this.categoriasPorSistema.get(idSistema) || [];
  }

  private extractVideoId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  }
}
