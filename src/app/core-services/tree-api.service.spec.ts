import { TestBed } from '@angular/core/testing';

import { TreeAPIService } from './tree-api.service';

describe('TreeAPIService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TreeAPIService = TestBed.get(TreeAPIService);
    expect(service).toBeTruthy();
  });
});
