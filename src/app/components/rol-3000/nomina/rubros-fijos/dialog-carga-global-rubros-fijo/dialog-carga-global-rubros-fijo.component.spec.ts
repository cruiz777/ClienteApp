import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogCargaGlobalRubrosFijoComponent } from './dialog-carga-global-rubros-fijo.component';

describe('DialogCargaGlobalRubrosFijoComponent', () => {
  let component: DialogCargaGlobalRubrosFijoComponent;
  let fixture: ComponentFixture<DialogCargaGlobalRubrosFijoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogCargaGlobalRubrosFijoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogCargaGlobalRubrosFijoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
