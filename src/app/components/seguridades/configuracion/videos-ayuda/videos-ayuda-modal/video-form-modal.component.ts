import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { SistemaResponse } from '../../../../../interfaces/responses/sistema-response';
import { CategoriaVideosResponse } from '../../../../../interfaces/responses/categoria-videos-response';
import { VideosAyudaService } from '../../../../../services/videos-ayuda.service';
import { CategoriaVideosService } from '../../../../../services/categoria-videos.service';
import { SistemaService } from '../../../../../services/sistema.service';
import { UsuarioService } from '../../../../../services/usuario.service';
import { CustomMessageBoxComponent, MessageBoxData } from '../../../../utils/messages/custom-message-box.component';

@Component({
  selector: 'app-video-form-modal',
  templateUrl: './video-form-modal.component.html',
  styleUrls: ['./video-form-modal.component.css']
})
export class VideoFormModalComponent implements OnInit {
  videoForm: FormGroup;
  isEditMode: boolean = false;
  sistemas: SistemaResponse[] = [];
  categorias: CategoriaVideosResponse[] = [];
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<VideoFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { videoId?: number },
    private videosService: VideosAyudaService,
    private categoriaService: CategoriaVideosService,
    private sistemaService: SistemaService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog
  ) {
    this.isEditMode = !!data?.videoId;
    this.videoForm = this.createForm();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  createForm(): FormGroup {
    return this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      urlVideo: ['', [Validators.required, this.youtubeUrlValidator]],
      idSistema: [null, Validators.required],
      idCategoria: [null, Validators.required],
      orden: [1, [Validators.required, Validators.min(1)]],
      activo: [true]
    });
  }

  cargarDatos(): void {
    this.loading = true;

    // Cargar sistemas
    this.sistemaService.getSistemas().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.sistemas = response.data.filter(s => s.status);
        }
        this.cargarCategorias();
      },
      error: (error) => {
        console.error('Error al cargar sistemas:', error);
        this.loading = false;
        this.mostrarMensaje({
          title: 'Error',
          message: 'No se pudieron cargar los sistemas',
          type: 'error',
          showCancel: false
        });
      }
    });
  }

  cargarCategorias(): void {
    this.categoriaService.getAll().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.categorias = response.data.filter(c => c.activo);
        }

        // Si es modo edición, cargar datos del video
        if (this.isEditMode && this.data.videoId) {
          this.cargarVideo(this.data.videoId);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.loading = false;
        this.mostrarMensaje({
          title: 'Error',
          message: 'No se pudieron cargar las categorías',
          type: 'error',
          showCancel: false
        });
      }
    });
  }

  cargarVideo(id: number): void {
    this.videosService.getById(id).subscribe({
      next: (response) => {
        if (response.data) {
          const video = response.data;
          this.videoForm.patchValue({
            titulo: video.titulo,
            urlVideo: video.urlVideo,
            idSistema: video.idSistema,
            idCategoria: video.idCategoria,
            orden: video.orden,
            activo: video.activo
          });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar video:', error);
        this.loading = false;
        this.mostrarMensaje({
          title: 'Error',
          message: 'No se pudo cargar el video',
          type: 'error',
          showCancel: false
        });
      }
    });
  }

  // Validador simple de URL de YouTube
  youtubeUrlValidator(control: any) {
    if (!control.value) return null;

    const url = control.value;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

    return youtubeRegex.test(url) ? null : { invalidYoutubeUrl: true };
  }

  onSubmit(): void {
    if (this.videoForm.invalid) {
      this.videoForm.markAllAsTouched();
      return;
    }

    const usuarioActual = this.usuarioService.getUsuarioActual();
    if (!usuarioActual) {
      this.mostrarMensaje({
        title: 'Error',
        message: 'No se pudo obtener el usuario actual',
        type: 'error',
        showCancel: false
      });
      return;
    }

    const formValue = this.videoForm.value;
    const request = {
      id: this.isEditMode ? this.data.videoId! : 0,
      titulo: formValue.titulo.trim(),
      urlVideo: formValue.urlVideo.trim(),
      idSistema: formValue.idSistema,
      idCategoria: formValue.idCategoria,
      orden: formValue.orden,
      activo: formValue.activo,
      usuarioCreacion: usuarioActual.nombre_usuario
    };

    const loadingRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: true,
      data: {
        title: this.isEditMode ? 'Actualizando' : 'Guardando',
        message: 'Por favor espera...',
        type: 'info',
        isLoading: true,
        loadingText: this.isEditMode ? 'Actualizando video...' : 'Guardando video...'
      } as MessageBoxData
    });

    const observable = this.isEditMode
      ? this.videosService.update(this.data.videoId!, request)
      : this.videosService.create(request);

    observable.subscribe({
      next: (response) => {
        loadingRef.close();

        if (response.data) {
          this.mostrarMensaje({
            title: '¡Éxito!',
            message: `El video ha sido ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
            type: 'success',
            showCancel: false
          });
          this.dialogRef.close(true);
        } else {
          this.mostrarMensaje({
            title: 'Error',
            message: response.message || 'No se pudo guardar el video',
            type: 'error',
            showCancel: false
          });
        }
      },
      error: (error) => {
        loadingRef.close();
        console.error('Error al guardar video:', error);
        this.mostrarMensaje({
          title: 'Error',
          message: 'Ocurrió un error al guardar el video',
          type: 'error',
          showCancel: false
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private mostrarMensaje(data: MessageBoxData): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: data
    });
  }

  // Getters para validaciones en el template
  get titulo() { return this.videoForm.get('titulo'); }
  get urlVideo() { return this.videoForm.get('urlVideo'); }
  get idSistema() { return this.videoForm.get('idSistema'); }
  get idCategoria() { return this.videoForm.get('idCategoria'); }
  get orden() { return this.videoForm.get('orden'); }
}
