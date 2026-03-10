import '@angular/compiler';

import { provideProto } from '@terseware/proto';

import '@analogjs/vitest-angular/setup-snapshots';

import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

import '@testing-library/jest-dom/vitest';

setupTestBed({ providers: [provideProto()] });
