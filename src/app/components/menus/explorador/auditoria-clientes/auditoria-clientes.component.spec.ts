import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditoriaClientesComponent } from './auditoria-clientes.component';

describe('AuditoriaClientesComponent', () => {
  let component: AuditoriaClientesComponent;
  let fixture: ComponentFixture<AuditoriaClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaClientesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditoriaClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
