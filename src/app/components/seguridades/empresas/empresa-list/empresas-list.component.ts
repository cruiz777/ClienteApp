import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmpresaService } from 'src/app/services/empresa.service';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { Router } from '@angular/router';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { CiudadService } from 'src/app/services/ciudad.service';
import { LogoService } from 'src/app/services/logo.service';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { FirmaService } from 'src/app/services/firma.service';

@Component({
  selector: 'app-empresa-list',
  templateUrl: './empresas-list.component.html',
  styleUrls: ['./empresas-list.component.css']
})
export class EmpresasListComponent implements OnInit {
  empresaForm!: FormGroup;
  idEmpresa: number | null = null;
  ciudades: CiudadResumen[] = [];
  previewUrl: string | null = null;
  archivoLogo: File | null = null;

  firmaPreviewUrl: string | null = null;
  archivoFirma: File | null = null;

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private router: Router,
    private ciudadService: CiudadService,
    private logoService: LogoService,
    private firmaService: FirmaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarEmpresa();
    this.cargarCiudades();
  }

  initForm(): void {
    this.empresaForm = this.fb.group({
      nombre: ['', Validators.required],
      sistema: [''],
      ruc: ['', Validators.required],
      direccion: [''],
      telefono1: [''],
      telefono2: [''],
      fax: [''],
      email: [''],
      logo: [''],
      firma: [''],
      moneda: [''],
      tipo_cambio: [''],
      establecimiento: [''],
      tipo_facturacion: [''],
      contribuyente_especial: [''],
      obligado_contabilidad: ['', Validators.required],
      codigo_entidad: [''],
      directorio: [''],
      status: [''],
      id_ciudad: [''],
      gerenteNombreCompleto: [''],
      gerenteDocumento: [''],
      contadorNombreCompleto: [''],
      contadorDocumento: ['']
    });
  }

  cargarEmpresa(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (empresas: EmpresaResponse[]) => {
        if (empresas.length > 0) {
          const empresa = empresas[0];
          this.idEmpresa = empresa.empresaCodigo;

          this.previewUrl = empresa.empresaLogo
            ? this.logoService.getLogoUrl(empresa.empresaLogo)
            : null;

          this.firmaPreviewUrl = empresa.empresaFirma
            ? this.firmaService.getFirmaUrl(empresa.empresaFirma)
            : null;

          const mappedEmpresa = {
            nombre: empresa.empresaNombre,
            sistema: empresa.empresaSistema,
            ruc: empresa.empresaRuc,
            direccion: empresa.empresaDireccion,
            telefono1: empresa.empresaTelefono1,
            telefono2: empresa.empresaTelefono2,
            fax: empresa.empresaFax,
            email: empresa.empresaEmail,
            logo: empresa.empresaLogo,
            firma: empresa.empresaFirma,
            moneda: empresa.empresaMoneda,
            tipo_cambio: empresa.empresaTipoCambio,
            establecimiento: empresa.empresaEstablecimiento,
            tipo_facturacion: empresa.empresaTipoFacturacion,
            contribuyente_especial: empresa.empresaContribuyenteEspecial,
            obligado_contabilidad: empresa.empresaObligadoContabilidad,
            codigo_entidad: empresa.empresaCodigoEntidad,
            directorio: empresa.empresaDirectorio,
            status: empresa.status,
            id_ciudad: empresa.idCiudad,
            gerenteNombreCompleto: empresa.gerentes?.[0]?.nombresCompletos || '',
            gerenteDocumento: empresa.gerentes?.[0]?.documento || '',
            contadorNombreCompleto: empresa.contadores?.[0]?.nombresCompletos || '',
            contadorDocumento: empresa.contadores?.[0]?.documento || ''
          };

          this.empresaForm.patchValue(mappedEmpresa);
        }
      },
      error: () => {
        console.error('Error al cargar la empresa');
      }
    });
  }

  cargarCiudades(): void {
    this.ciudadService.getCiudades().subscribe({
      next: (data: CiudadResumen[]) => {
        this.ciudades = data;
      },
      error: (err) => {
        console.error('Error al cargar las ciudades', err);
      }
    });
  }
  // Método para seleccionar firma 
  triggerFirmaInput(): void {
    const input = document.getElementById('firmaInput') as HTMLInputElement;
    input?.click();
  }
  // Método para seleccionar logo
  triggerLogoInput(): void {
    const input = document.getElementById('logoInput') as HTMLInputElement;
    input?.click();
  }

  // Método para manejar selección de firma 
  onFirmaSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.archivoFirma = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.firmaPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.archivoLogo = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  guardar(): void {
    if (this.empresaForm.invalid) {
      const data: MessageBoxData = {
        title: 'Campos obligatorios',
        message: 'Debe completar los campos: nombre, RUC y obligado a contabilidad.',
        type: 'warning',
        confirmText: 'Entendido',
        showCancel: false
      };
      this.dialog.open(CustomMessageBoxComponent, { width: '400px', data });
      return;
    }

    const empresaDataRaw = this.empresaForm.value;
    const empresaData = {
      empresaCodigo: this.idEmpresa ?? 0,
      empresaNombre: empresaDataRaw.nombre,
      empresaSistema: empresaDataRaw.sistema,
      empresaRuc: empresaDataRaw.ruc,
      empresaDireccion: empresaDataRaw.direccion,
      empresaTelefono1: empresaDataRaw.telefono1,
      empresaTelefono2: empresaDataRaw.telefono2,
      empresaFax: empresaDataRaw.fax,
      empresaEmail: empresaDataRaw.email,
      empresaLogo: empresaDataRaw.logo,
      empresaFirma: empresaDataRaw.firma,
      empresaMoneda: empresaDataRaw.moneda,
      empresaTipoCambio: empresaDataRaw.tipo_cambio,
      empresaEstablecimiento: empresaDataRaw.establecimiento,
      empresaTipoFacturacion: empresaDataRaw.tipo_facturacion,
      empresaContribuyenteEspecial: empresaDataRaw.contribuyente_especial || 'NO',
      empresaObligadoContabilidad: empresaDataRaw.obligado_contabilidad || 'NO',
      empresaCodigoEntidad: empresaDataRaw.codigo_entidad,
      empresaDirectorio: empresaDataRaw.directorio,
      status: empresaDataRaw.status === true || empresaDataRaw.status === 'true',
      idCiudad: empresaDataRaw.id_ciudad
    };

    const mostrarMensaje = (message: string, type: 'success' | 'error') => {
      const data: MessageBoxData = {
        title: type === 'success' ? 'Operación exitosa' : 'Error',
        message,
        type,
        confirmText: 'Aceptar',
        showCancel: false
      };
      this.dialog.open(CustomMessageBoxComponent, { width: '400px', data }).afterClosed().subscribe(() => {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/seguridades/empresas']);
        });
      });
      
    };

    const realizarGuardar = () => {
      if (this.idEmpresa) {
        this.empresaService.updateEmpresa(this.idEmpresa, empresaData).subscribe(() => {
          mostrarMensaje('Empresa actualizada correctamente.', 'success');
        });
      } else {
        this.empresaService.createEmpresa(empresaData).subscribe(() => {
          mostrarMensaje('Empresa registrada correctamente.', 'success');
        });
      }
    };
    // Subir archivos en paralelo si existen
    let promesasPendientes = 0;
    let erroresSubida = false;

    // Función para manejar las promesas de subida
    const manejarSubida = () => {
      promesasPendientes--;
      if (promesasPendientes === 0 && !erroresSubida) {
        realizarGuardar();
      }
    };

    // Subir logo si existe
    if (this.archivoLogo) {
      promesasPendientes++;
      this.logoService.uploadLogo(this.archivoLogo).subscribe({
        next: (res) => {
          this.empresaForm.get('logo')?.setValue(res.nombreArchivo);
          this.previewUrl = this.logoService.getLogoUrl(res.nombreArchivo);
          this.logoService.updateLogo(res.nombreArchivo);
          empresaData.empresaLogo = res.nombreArchivo;
          manejarSubida();
        },
        error: (err) => {
          console.error('Error al subir logo:', err);
          erroresSubida = true;
          mostrarMensaje('Error al subir el logo. No se guardaron los datos.', 'error');
        }
      });
    }
    // Subir firma si existe
    if (this.archivoFirma) {
      promesasPendientes++;
      this.firmaService.uploadFirma(this.archivoFirma).subscribe({
        next: (res) => {
          this.empresaForm.get('firma')?.setValue(res.nombreArchivo);
          this.firmaPreviewUrl = this.firmaService.getFirmaUrl(res.nombreArchivo);
          this.firmaService.updateFirma(res.nombreArchivo);
          empresaData.empresaFirma = res.nombreArchivo;
          manejarSubida();
        },
        error: (err) => {
          console.error('Error al subir firma:', err);
          erroresSubida = true;
          mostrarMensaje('Error al subir la firma. No se guardaron los datos.', 'error');
        }
      });
    }

    // Si no hay archivos que subir, guardar directamente
    if (promesasPendientes === 0) {
      realizarGuardar();
    }
    
  }

  cancelar(): void {
    this.empresaForm.reset();
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/seguridades/empresas']);
    });
  }
}
