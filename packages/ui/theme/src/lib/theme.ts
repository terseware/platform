import { DOCUMENT, isPlatformServer } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, tap } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class Theme {
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
  readonly #docDark = this.#document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  readonly #theme = signal<ThemeMode>(this.#docDark);
  readonly theme = this.#theme.asReadonly();
  readonly inverseTheme = computed(() => (this.theme() === 'dark' ? 'light' : 'dark'));

  constructor() {
    afterNextRender(() => {
      // On Alt+T, toggle the theme
      fromEvent<KeyboardEvent>(window, 'keydown')
        .pipe(tap(), takeUntilDestroyed(this.#destroyRef))
        .subscribe(e => (e.altKey && e.key === 't' ? this.toggleTheme() : null));
    });
  }

  setTheme(theme: ThemeMode): void {
    this.#theme.set(theme);
    if (this.#isServer) {
      return;
    }
    localStorage.setItem('theme', theme);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).syncTerseUiTheme();
  }

  toggleTheme(): void {
    this.setTheme(this.inverseTheme());
  }
}
