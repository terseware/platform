import type { ErrorHandler } from '@angular/core';
import { Injectable } from '@angular/core';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}
