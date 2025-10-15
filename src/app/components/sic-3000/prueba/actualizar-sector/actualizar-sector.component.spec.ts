import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarSectorComponent } from './actualizar-sector.component';

describe('ActualizarSectorComponent', () => {
  let component: ActualizarSectorComponent;
  let fixture: ComponentFixture<ActualizarSectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarSectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualizarSectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
