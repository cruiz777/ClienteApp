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
  tipoVideo: 'youtube' | 'local' = 'youtube';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;

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
  /**
 * Maneja la selección de archivo
 */
  onFileSelected(event: any): void {
    const file = event.target.files[0];

    if (!file) return;

    // Validar tipo
    if (file.type !== 'video/mp4') {
      this.mostrarMensaje({
        title: 'Error',
        message: 'Solo se permiten archivos MP4',
        type: 'error',
        showCancel: false
      });
      return;
    }

    // Validar tamaño (60MB)
    const maxSize = 60 * 1024 * 1024; // 60MB en bytes
    if (file.size > maxSize) {
      this.mostrarMensaje({
        title: 'Error',
        message: 'El archivo no debe superar 60MB',
        type: 'error',
        showCancel: false
      });
      return;
    }

    this.selectedFile = file;

    // Generar preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Limpia el archivo seleccionado
   */
  clearFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.uploadProgress = 0;
  }

  /**
   * Cambia el tipo de video
   */
  onTipoVideoChange(tipo: 'youtube' | 'local'): void {
    this.tipoVideo = tipo;

    // Limpiar validaciones según el tipo
    if (tipo === 'youtube') {
      this.videoForm.get('urlVideo')?.setValidators([Validators.required, this.youtubeUrlValidator]);
      this.clearFile();
    } else {
      this.videoForm.get('urlVideo')?.clearValidators();
    }
    this.videoForm.get('urlVideo')?.updateValueAndValidity();
  }
  onSubmit(): void {
    // Validación según el tipo de video
    if (this.tipoVideo === 'youtube') {
      if (this.videoForm.invalid) {
        this.videoForm.markAllAsTouched();
        return;
      }
    } else {
      // Para video local, el archivo es obligatorio solo en creación
      if (!this.isEditMode && !this.selectedFile) {
        this.mostrarMensaje({
          title: 'Error',
          message: 'Debes seleccionar un archivo de video',
          type: 'error',
          showCancel: false
        });
        return;
      }

      // Validar otros campos (excepto urlVideo)
      const controls = this.videoForm.controls;
      const requiredControls = ['titulo', 'idSistema', 'idCategoria', 'orden'];

      for (const controlName of requiredControls) {
        if (controls[controlName].invalid) {
          this.videoForm.markAllAsTouched();
          return;
        }
      }
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

    // Si es video local Y no es edición, primero subir el archivo
    if (this.tipoVideo === 'local' && this.selectedFile && !this.isEditMode) {
      this.uploadAndCreate(usuarioActual);
    } else {
      // YouTube o edición sin cambio de archivo
      this.saveVideo(usuarioActual, this.videoForm.value.urlVideo);
    }
  }
  /**
 * Sube el archivo y luego crea el registro
 */
  private uploadAndCreate(usuarioActual: any): void {
    this.isUploading = true;

    const loadingRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: true,
      data: {
        title: 'Subiendo video',
        message: 'Por favor espera...',
        type: 'info',
        isLoading: true,
        loadingText: 'Subiendo archivo al servidor...'
      } as MessageBoxData
    });

    this.videosService.uploadVideoFile(this.selectedFile!).subscribe({
      next: (response) => {
        loadingRef.close();
        this.isUploading = false;

        if (response.data) {
          // Archivo subido exitosamente, ahora guardar en BD
          this.saveVideo(usuarioActual, response.data);
        } else {
          this.mostrarMensaje({
            title: 'Error',
            message: response.message || 'No se pudo subir el archivo',
            type: 'error',
            showCancel: false
          });
        }
      },
      error: (error) => {
        loadingRef.close();
        this.isUploading = false;
        console.error('Error al subir archivo:', error);
        this.mostrarMensaje({
          title: 'Error',
          message: 'Ocurrió un error al subir el archivo',
          type: 'error',
          showCancel: false
        });
      }
    });
  }

  /**
   * Guarda el video en la base de datos
   */
  private saveVideo(usuarioActual: any, urlVideo: string): void {
    const formValue = this.videoForm.value;
    const request = {
      id: this.isEditMode ? this.data.videoId! : 0,
      titulo: formValue.titulo.trim(),
      urlVideo: urlVideo.trim(), // ← Aquí va la URL de YouTube o el nombre del archivo
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
