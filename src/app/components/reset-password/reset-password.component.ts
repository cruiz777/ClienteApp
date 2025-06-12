import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioService } from 'src/app/services/usuario.service';
import { UpdateClaveRequest } from 'src/app/interfaces/requests/recuperar-clave-request';

// Valida que ambas contraseñas coincidan
export function matchPasswords(group: FormGroup): { [key: string]: boolean } | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  formReset: FormGroup;
  token: string = '';

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private router: Router,
    private usuarioService: UsuarioService
  ) {
    this.formReset = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: matchPasswords });
  }

  ngOnInit(): void {
    console.log('🟡 ngOnInit ejecutado');

    this.formReset.statusChanges.subscribe(status => {
      console.log('📋 Estado del formulario:', status);
    });

    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      alert('❌ Token inválido o expirado');
      this.router.navigate(['/login']);
    }
  }


  probarLlamada() {
    alert('✅ Método probarLlamada ejecutado');
  }


  guardar(): void {
    console.log('📢 MÉTODO guardar() EJECUTADO');

    // Mostrar estado actual del formulario
    console.log('📋 Valid:', this.formReset.valid);
    console.log('📋 Status:', this.formReset.status);
    console.log('📋 Values:', this.formReset.value);
    console.log('📋 Errors:', this.formReset.errors);
    console.log('🧪 Errores en password:', this.formReset.get('password')?.errors);
    console.log('🧪 Errores en confirmPassword:', this.formReset.get('confirmPassword')?.errors);


    // Validar formulario
    if (this.formReset.invalid) {
      if (this.formReset.errors?.['mismatch']) {
        console.warn('❌ Las contraseñas no coinciden');
      } else {
        console.warn('⚠️ El formulario es inválido (campos vacíos o mal formateados)');
      }
      return;
    }

    // Armar objeto de envío
    const data: UpdateClaveRequest = {
      token: this.token,
      nuevaClave: this.formReset.value.password
    };

    console.log('📤 Enviando datos al backend:', data);

    // Llamar al servicio
    this.usuarioService.actualizarClave(data).subscribe({
      next: (res) => {
        console.log('✅ Respuesta del backend:', res);
        alert('✅ ' + res.message);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('❌ Error al actualizar contraseña:', err);
        alert('❌ Error al actualizar contraseña');
      }
    });
  }


}


