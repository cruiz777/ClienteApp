import { Component, OnInit, ViewChild } from '@angular/core';
import { PersonasService } from 'src/app/services/personas.service';
import { PersonaResponse } from 'src/app/interfaces/responses/persona-response';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { TipoDocumentoService } from 'src/app/services/tipo-documento.service';

@Component({
  selector: 'app-entidad-list',
  templateUrl: './entidad-list.component.html',
  styleUrls: ['./entidad-list.component.css']
})
export class EntidadListComponent implements OnInit {
  dataSource = new MatTableDataSource<PersonaResponse>([]);
  displayedColumns: string[] = ['identificacion', 'nombresCompletos', 'tipoPersona', 'ciudad', 'correos', 'telefonos', 'direcciones','status', 'acciones'];
  isLoading = false;
  errorMessage = '';

  allPersonas: PersonaResponse[] = [];  // Guardamos todas las personas aquí
  currentFilterText: string = '';       // Para combinar filtros
  selectedTipoDocumento: string = '';

  tiposDocumento: { idTipoDocumento: number; descripcion: string }[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private personaService: PersonasService, private router: Router, private dialog: MatDialog, private tipoDocumentoService: TipoDocumentoService) {}

  ngOnInit(): void {
    this.loadPersonas();
    this.loadTiposDocumento();
  }

  loadPersonas() {
    this.isLoading = true;
    this.personaService.getPersonas().subscribe({
      next: (data) => {
        this.allPersonas = data;
        this.dataSource = new MatTableDataSource<PersonaResponse>(data);
        this.dataSource.paginator = this.paginator;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar las personas.';
        this.isLoading = false;
      }
    });
  }
  nuevaEntidad(tipo: 'CÉDULA' | 'RUC' | 'PASAPORTE') {
    this.router.navigate(['/seguridades/entidades/crear'], {
      queryParams: { tipoIdentificacion: tipo }
    });
  }
  // Filtro por texto (Nombre o Identificación)
  applyFilter(event: Event) {
    this.currentFilterText = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.applyCombinedFilters();
  }
  // Método para aplicar filtro por tipo de documento
  applyTipoDocumentoFilter(tipo: string) {
    this.selectedTipoDocumento = tipo;
    this.applyCombinedFilters();
  }
  // Nuevo método para filtrar por estado
  applyStatusFilter(status: string) {
    this.selectedStatus = status;
    this.applyCombinedFilters();
  }

  // Variables internas para manejar estado
  selectedStatus: string = '';

  // Aplicar ambos filtros combinados
  private applyCombinedFilters() {
    let filteredData = this.allPersonas;

    // Filtrar por estado si corresponde
    if (this.selectedStatus) {
      const isActive = this.selectedStatus === 'activo';
      filteredData = filteredData.filter(persona => persona.status === isActive);
    }
    // Filtrar por tipo de documento si corresponde
    if (this.selectedTipoDocumento) {
      filteredData = filteredData.filter(persona =>
        persona.idTipoDocumento === +this.selectedTipoDocumento
      );
    }
    // Filtrar por texto si corresponde
    if (this.currentFilterText) {
      filteredData = filteredData.filter(persona =>
        persona.nombresCompletos?.toLowerCase().includes(this.currentFilterText) ||
        persona.identificacion?.toLowerCase().includes(this.currentFilterText)
      );

    }

    this.dataSource.data = filteredData;
  }

  private loadTiposDocumento() {
    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (data) => {
        this.tiposDocumento = data;
      },
      error: () => {
        console.error('❌ Error al cargar tipos de documento');
      }
    });
  }
  editarPersona(id: number) {
    this.router.navigate(['/seguridades/entidades/editar', id]);
  }

  eliminarPersona(id: number) {
      const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
        width: '400px',
        data: {
          title: '¿Está seguro?',
          message: 'Esta acción desactivará la entidad seleccionada.',
          type: 'warning',
          confirmText: 'Sí, desactivar',
          cancelText: 'Cancelar',
          showCancel: true
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.personaService.softDeletePersona(id).subscribe(() => this.loadPersonas());
        }
      });
    }
}
