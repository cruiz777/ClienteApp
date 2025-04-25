import { TestBed } from '@angular/core/testing';

import { CedulaService } from './cedula.service';

describe('CedulaService', () => {
  let service: CedulaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CedulaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
