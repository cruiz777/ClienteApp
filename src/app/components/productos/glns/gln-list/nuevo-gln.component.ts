import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TipoLocalizacionRequest } from 'src/app/interfaces/requests/tipo-localizacion-request';
import { GlnService, GlnRequest } from 'src/app/services/gln.service';
import { PrefijoService, Prefijo } from 'src/app/services/prefijo.service';

@Component({
  selector: 'app-gln',
  templateUrl: './nuevo-gln.component.html',
  styleUrls: ['./nuevo-gln.component.css']
})
export class GlnComponent implements OnInit {
  formGln!: FormGroup;
  cliente = {
    nombre: 'Edgar Ramos',
    ruc: '1234567890001',
    clientesCodigo: 1001
  };
  prefijos: Prefijo[] = [];
  glns: GlnRequest[] = [];
  indiceActual: number = 0;
  glnExistente: GlnRequest | null = null;
  tiposLocalizacion: TipoLocalizacionRequest[] = [];
  paises: { id: number; nombre: string }[] = [];
  provincias: { id: number; nombre: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private glnService: GlnService,
    private prefijoService: PrefijoService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();

    this.prefijoService.obtenerPorClienteCodigo(this.cliente.clientesCodigo).subscribe({
      next: data => this.prefijos = data,
      error: err => console.error('❌ Error al cargar prefijos', err)
    });

    this.formGln.get('idPrefijos')?.valueChanges.subscribe(() => {
      this.cargarGlnsPorPrefijo();
    });
  }

  inicializarFormulario(): void {
    this.formGln = this.fb.group({
      idGln: [0],
      idPrefijos: [null],
      clientesCodigo: [this.cliente.clientesCodigo],
      gln1: [''],
      glnPrefijogs1: [''],
      glnOrigenprefijo: [''],
      serie: [false],
      idTipoLocalizacion: [null],
      nombreLocalizacion: [''],
      direccion: [''],
      glnLatitud: [''],
      glnLongitud: [''],
      paisCodigo: [null],
      provinciaCodigo: [null],
      ciudad: [''],
      glnCodigopostal: [''],
      documentoIdentidad: [''],
      clienteNombre: [this.cliente.nombre],
    });
  }

  cargarGlnsPorPrefijo(): void {
    const idPrefijo = this.formGln.get('idPrefijos')?.value;
    if (!idPrefijo) return;

    this.glnService.obtenerGlnPorClienteCodigo(this.cliente.clientesCodigo).subscribe({
      next: data => {
        this.glns = data.filter(g => g.idPrefijos === idPrefijo);
        this.indiceActual = 0;

        if (this.glns.length > 0) {
          this.formGln.patchValue(this.glns[0]);
          this.glnExistente = this.glns[0];
        } else {
          this.formGln.patchValue({ gln1: '', direccion: '' });
          this.glnExistente = null;
        }
      },
      error: err => console.error('❌ Error al cargar GLNs', err)
    });
  }

  onNext(): void {
    if (this.indiceActual < this.glns.length - 1) {
      this.indiceActual++;
      const gln = this.glns[this.indiceActual];
      this.formGln.patchValue(gln);
      this.glnExistente = gln;
    }
  }

  onBack(): void {
    if (this.indiceActual > 0) {
      this.indiceActual--;
      const gln = this.glns[this.indiceActual];
      this.formGln.patchValue(gln);
      this.glnExistente = gln;
    }
  }

  irAlPrimero(): void {
    if (this.glns.length > 0) {
      this.indiceActual = 0;
      this.formGln.patchValue(this.glns[0]);
      this.glnExistente = this.glns[0];
    }
  }

  irAlUltimo(): void {
    if (this.glns.length > 0) {
      this.indiceActual = this.glns.length - 1;
      this.formGln.patchValue(this.glns[this.indiceActual]);
      this.glnExistente = this.glns[this.indiceActual];
    }
  }

  nuevo(): void {
    this.formGln.reset({
      clientesCodigo: this.cliente.clientesCodigo,
      clienteNombre: this.cliente.nombre
    });
    this.glnExistente = null;
  }

  guardar(): void {
    const gln: GlnRequest = this.formGln.value;

    if (this.glnExistente) {
      // lógica para PUT si deseas actualizar
    } else {
      this.glnService.insertarGln({ request: gln }).subscribe({
        next: () => alert('✅ GLN guardado exitosamente.'),
        error: err => console.error('❌ Error al guardar GLN', err)
      });
    }
  }

  modificar(): void {
  if (!this.glnExistente || this.glnExistente.idGln === undefined) return;

  const gln: GlnRequest = this.formGln.value;

  this.glnService.actualizarGln(this.glnExistente.idGln, gln).subscribe({
    next: () => alert('✅ GLN actualizado correctamente.'),
    error: err => console.error('❌ Error al actualizar GLN', err)
  });
}

  cancelar(): void {
    if (this.glnExistente) {
      this.formGln.patchValue(this.glnExistente);
    } else {
      this.nuevo();
    }
  }

  goTo(tab: string): void {
    console.log(`Navegando a la pestaña: ${tab}`);
  }
}
