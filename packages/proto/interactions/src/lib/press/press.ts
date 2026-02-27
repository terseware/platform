import { effect, inject, Injector, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { injectElement, listener, runInDestroyer } from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';

@Resolvable({ host: true })
export class Press {
  readonly #element = injectElement();
  readonly #injector = inject(Injector);

  #disposableListeners: (() => void)[] = [];

  readonly disabled = bindable(false);

  readonly #isPressed = signal(false);
  readonly isPressed = this.#isPressed.asReadonly();

  constructor() {
    hostBinding('attr.data-press', () => (!this.disabled() && this.#isPressed() ? '' : null));

    const createListeners = runInDestroyer(() => {
      hostBinding('(pointerdown)', () => {
        this.#disposableListeners.forEach(dispose => dispose());
        this.#isPressed.set(true);

        const onPointerUp = listener('pointerup', () => this.#reset(), {
          injector: this.#injector,
          document: true,
        });

        const onPointerMove = listener(
          'pointermove',
          event => {
            if (this.#element !== event.target && !this.#element.contains(event.target as Node)) {
              this.#reset();
            }
          },
          { injector: this.#injector, document: true },
        );

        const onPointerCancel = listener('pointercancel', () => this.#reset(), {
          injector: this.#injector,
          document: true,
        });

        this.#disposableListeners = [onPointerUp, onPointerMove, onPointerCancel];
      });
    });

    effect(onCleanup => !this.disabled() && onCleanup(createListeners()));
  }

  #reset(): void {
    if (this.#isPressed()) {
      this.#disposableListeners.forEach(dispose => dispose());
      this.#isPressed.set(false);
    }
  }
}
