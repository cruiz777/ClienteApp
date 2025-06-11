import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// ✅ Función de validación declarada afuera
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
    private router: Router
  ) {
    this.formReset = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: matchPasswords }); // ✅ nota: plural "validators"
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      alert('❌ Token inválido o expirado');
      this.router.navigate(['/login']);
    }
  }

  guardar(): void {
    if (this.formReset.invalid) return;

    const nuevaClave = this.formReset.value.password;
    console.log('🔐 Token:', this.token);
    console.log('✅ Nueva contraseña:', nuevaClave);

    alert('✅ Contraseña actualizada con éxito');
    this.router.navigate(['/login']);
  }
}

