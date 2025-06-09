import { TestBed } from '@angular/core/testing';

import { GenerarPresentacionesService } from './generar-presentaciones.service';

describe('GenerarPresentacionesService', () => {
  let service: GenerarPresentacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerarPresentacionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
