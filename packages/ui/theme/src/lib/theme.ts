import { DOCUMENT, isPlatformServer } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  private readonly _theme = signal<ThemeMode>(
    this.document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  readonly theme = this._theme.asReadonly();

  setTheme(theme: ThemeMode): void {
    this._theme.set(theme);
    if (this.isServer) return;
    localStorage.setItem('theme', theme);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).syncTerseUiTheme();
  }

  toggleTheme(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }
}
