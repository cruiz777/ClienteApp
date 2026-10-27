import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VideosAyudaResponse } from '../../../../../interfaces/responses/videos-ayuda-response';
import { VideosAyudaService } from '../../../../../services/videos-ayuda.service';
import { CustomMessageBoxComponent, MessageBoxData } from '../../../../utils/messages/custom-message-box.component';
import { VideoFormModalComponent } from '../videos-ayuda-modal/video-form-modal.component';

@Component({
  selector: 'app-videos-ayuda',
  templateUrl: './videos-ayuda.component.html',
  styleUrls: ['./videos-ayuda.component.css']
})
export class VideosAyudaComponent implements OnInit {
  videos: VideosAyudaResponse[] = [];
  filteredVideos: VideosAyudaResponse[] = [];
  searchTerm: string = '';
  loading: boolean = false;

  constructor(
    private videosService: VideosAyudaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarVideos();
  }

  cargarVideos(): void {
    this.loading = true;
    this.videosService.getAll().subscribe({
      next: (response) => {
        // ✅ CORRECCIÓN: Usar estructura correcta de ApiListResponse
        if (response.data && Array.isArray(response.data)) {
          this.videos = response.data;
          this.filteredVideos = [...this.videos];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar videos:', error);
        this.mostrarMensaje({
          title: 'Error',
          message: 'No se pudieron cargar los videos de ayuda',
          type: 'error',
          showCancel: false
        });
        this.loading = false;
      }
    });
  }

  search(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredVideos = [...this.videos];
      return;
    }

    this.filteredVideos = this.videos.filter(video =>
      video.titulo.toLowerCase().includes(term) ||
      video.nombreSistema?.toLowerCase().includes(term) ||
      video.nombreCategoria?.toLowerCase().includes(term)
    );
  }

  nuevoVideo(): void {
    const dialogRef = this.dialog.open(VideoFormModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: { videoId: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarVideos();
      }
    });
  }

  editarVideo(id: number): void {
    const dialogRef = this.dialog.open(VideoFormModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: { videoId: id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarVideos();
      }
    });
  }

  eliminarVideo(id: number, titulo: string): void {
    // Primero obtener los datos del video para saber si es local
    const video = this.filteredVideos.find(v => v.id === id);

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Estás seguro?',
        message: `¿Deseas eliminar el video <strong>"${titulo}"</strong>?<br><br>Esta acción no se puede deshacer.`,
        type: 'warning',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const loadingRef = this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          disableClose: true,
          data: {
            title: 'Eliminando',
            message: 'Por favor espera...',
            type: 'info',
            isLoading: true,
            loadingText: 'Eliminando video...'
          } as MessageBoxData
        });

        this.videosService.softDelete(id).subscribe({
          next: (response) => {
            // Si es un video local (no YouTube), eliminar archivo físico
            if (video && !this.videosService.isYouTubeUrl(video.urlVideo)) {
              this.videosService.deleteVideoFile(video.urlVideo).subscribe({
                next: () => console.log('Archivo físico eliminado'),
                error: (err) => console.error('Error al eliminar archivo físico:', err)
              });
            }

            loadingRef.close();

            if (response.data) {
              this.mostrarMensaje({
                title: '¡Eliminado!',
                message: 'El video ha sido eliminado correctamente.',
                type: 'success',
                showCancel: false
              });
              this.cargarVideos();
            } else {
              this.mostrarMensaje({
                title: 'Error',
                message: response.message || 'No se pudo eliminar el video',
                type: 'error',
                showCancel: false
              });
            }
          },
          error: (error) => {
            loadingRef.close();
            console.error('Error al eliminar:', error);
            this.mostrarMensaje({
              title: 'Error',
              message: 'Ocurrió un error al eliminar el video',
              type: 'error',
              showCancel: false
            });
          }
        });
      }
    });
  }

  cambiarEstado(video: VideosAyudaResponse): void {
    const nuevoEstado = !video.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Confirmar cambio?',
        message: `¿Deseas ${accion} el video <strong>"${video.titulo}"</strong>?`,
        type: 'info',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Mostrar loading
        const loadingRef = this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          disableClose: true,
          data: {
            title: 'Actualizando',
            message: 'Por favor espera...',
            type: 'info',
            isLoading: true,
            loadingText: 'Cambiando estado...'
          } as MessageBoxData
        });

        const request = {
          id: video.id,
          titulo: video.titulo,
          urlVideo: video.urlVideo,
          orden: video.orden,
          activo: nuevoEstado,
          idSistema: video.idSistema,
          idCategoria: video.idCategoria,
          usuarioCreacion: video.usuarioCreacion
        };

        this.videosService.update(video.id, request).subscribe({
          next: (response) => {
            loadingRef.close();

            // ✅ CORRECCIÓN: Validar response.data
            if (response.data) {
              this.mostrarMensaje({
                title: '¡Actualizado!',
                message: `El video ha sido ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`,
                type: 'success',
                showCancel: false
              });
              this.cargarVideos();
            } else {
              this.mostrarMensaje({
                title: 'Error',
                message: response.message || 'No se pudo cambiar el estado',
                type: 'error',
                showCancel: false
              });
            }
          },
          error: (error) => {
            loadingRef.close();
            console.error('Error al cambiar estado:', error);
            this.mostrarMensaje({
              title: 'Error',
              message: 'Ocurrió un error al cambiar el estado',
              type: 'error',
              showCancel: false
            });
          }
        });
      }
    });
  }

  // ✅ Método auxiliar para mostrar mensajes
  private mostrarMensaje(data: MessageBoxData): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: data
    });
  }
}
