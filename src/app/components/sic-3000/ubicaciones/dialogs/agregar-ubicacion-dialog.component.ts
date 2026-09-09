import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LocalesResponse } from 'src/app/interfaces/responses/local-response';
import { UbicacionAreaService } from 'src/app/services/ubicacion-area.service';
import { UbicacionColumnaService } from 'src/app/services/ubicacion-columna.service';
import { UbicacionNivelService } from 'src/app/services/ubicacion-nivel.service';
import { UbicacionAreaResponse } from 'src/app/interfaces/responses/ubicacion-area-response';
import { UbicacionColumnaResponse } from 'src/app/interfaces/responses/ubicacion-columna-response';
import { UbicacionNivelResponse } from 'src/app/interfaces/responses/ubicacion-nivel-response';

@Component({
  selector: 'app-agregar-ubicacion-dialog',
  templateUrl: './agregar-ubicacion-dialog.component.html',
  styleUrls: ['./agregar-ubicacion-dialog.component.css']
})
export class AgregarUbicacionDialogComponent implements OnInit {
  form: FormGroup;
  guardando: boolean = false;
  modoEdicion: boolean = false;

  // Listas para los combos
  areas: UbicacionAreaResponse[] = [];
  columnas: UbicacionColumnaResponse[] = [];
  niveles: UbicacionNivelResponse[] = [];
  
  // Estados de carga
  cargandoAreas: boolean = false;
  cargandoColumnas: boolean = false;
  cargandoNiveles: boolean = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AgregarUbicacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      idProducto: number; 
      locales: LocalesResponse[];
      nombreProducto?: string;
      ubicacionExistente?: any;
    },
    private areaService: UbicacionAreaService,
    private columnaService: UbicacionColumnaService,
    private nivelService: UbicacionNivelService
  ) {
    this.form = this.fb.group({
      id_local: [null, Validators.required],
      idarea: [null],
      idcolumna: [null],
      idnivel: [null]
    });
  }

  ngOnInit(): void {
    // Cargar catálogos
    this.cargarAreas();
    this.cargarColumnas();
    this.cargarNiveles();
    
    // Si solo hay una bodega, seleccionarla automáticamente
    if (this.data.ubicacionExistente) {
      this.modoEdicion = true;
      this.form.patchValue({
        id_local: this.data.ubicacionExistente.id_local,
        idarea: this.data.ubicacionExistente.idarea,
        idcolumna: this.data.ubicacionExistente.idcolumna,
        idnivel: this.data.ubicacionExistente.idnivel
      });
    } else if (this.data.locales && this.data.locales.length === 1) {
      this.form.patchValue({
        id_local: this.data.locales[0].id
      });
    }
  }

  /**
   * Carga las áreas activas
   */
  cargarAreas(): void {
    this.cargandoAreas = true;
    this.areaService.getAll(true).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          this.areas = resp.data;
          console.log('✅ Áreas cargadas:', this.areas.length);
        }
        this.cargandoAreas = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar áreas:', err);
        this.cargandoAreas = false;
      }
    });
  }

  /**
   * Carga las columnas activas
   */
  cargarColumnas(): void {
    this.cargandoColumnas = true;
    this.columnaService.getAll(true).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          this.columnas = resp.data;
          console.log('✅ Columnas cargadas:', this.columnas.length);
        }
        this.cargandoColumnas = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar columnas:', err);
        this.cargandoColumnas = false;
      }
    });
  }

  /**
   * Carga los niveles activos
   */
  cargarNiveles(): void {
    this.cargandoNiveles = true;
    this.nivelService.getAll(true).subscribe({
      next: (resp) => {
        if (resp.type === 'Success' && resp.data) {
          this.niveles = resp.data;
          console.log('✅ Niveles cargados:', this.niveles.length);
        }
        this.cargandoNiveles = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar niveles:', err);
        this.cargandoNiveles = false;
      }
    });
  }

  /**
   * Verifica si un campo del formulario es inválido
   */
  isInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    
    if (field?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    return '';
  }

  /**
   * Guarda la ubicación y cierra el diálogo
   */
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;

    const request = {
      id_producto: this.data.idProducto,
      id_local: this.form.value.id_local,
      idarea: this.form.value.idarea || null,
      idcolumna: this.form.value.idcolumna || null,
      idnivel: this.form.value.idnivel || null
    };
    
    if (this.modoEdicion && this.data.ubicacionExistente) {
      (request as any).idProductoUbicacion = this.data.ubicacionExistente.idProductoUbicacion;
    }
    // Simular pequeño delay para mejor UX
    setTimeout(() => {
      this.dialogRef.close(request);
    }, 300);
  }

  /**
   * Cancela y cierra el diálogo
   */
  cancelar(): void {
    this.dialogRef.close();
  }

  /**
   * Obtiene el nombre de la bodega seleccionada
   */
  get bodegaSeleccionadaNombre(): string {
    const idLocal = this.form.get('id_local')?.value;
    if (!idLocal) return '';
    
    const bodega = this.data.locales.find(l => l.id === idLocal);
    return bodega ? bodega.nombre! : '';
  }

  /**
   * Verifica si el formulario tiene ubicación específica
   */
  get tieneUbicacionCompleta(): boolean {
    const valores = this.form.value;
    return !!(valores.idarea || valores.idcolumna || valores.idnivel);
  }

  /**
   * Obtiene el código del área seleccionada
   */
  getAreaCodigo(id: number | null): string {
    if (!id) return '';
    const area = this.areas.find(a => a.idarea === id);
    return area ? area.codigo! : '';
  }

  /**
   * Obtiene el código de la columna seleccionada
   */
  getColumnaCodigo(id: number | null): string {
    if (!id) return '';
    const columna = this.columnas.find(c => c.idcolumna === id);
    return columna ? columna.codigo! : '';
  }

  /**
   * Obtiene el código del nivel seleccionado
   */
  getNivelCodigo(id: number | null): string {
    if (!id) return '';
    const nivel = this.niveles.find(n => n.idnivel === id);
    return nivel ? nivel.codigo! : '';
  }
}