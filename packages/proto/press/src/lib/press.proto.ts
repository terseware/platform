import { inject, signal } from '@angular/core';
import { on, ProtoHost, Resolvable } from '@terseware/proto';
import { injectElement, onDestroy } from '@terseware/utils';

@Resolvable()
export class PressProto {
  readonly #element = injectElement();
  readonly #host = inject(ProtoHost);

  readonly disabled = signal(false);

  readonly #isPressed = signal(false);
  readonly isPressed = this.#isPressed.asReadonly();

  constructor() {
    this.#host.bindAttr('data-press', () => (!this.disabled() && this.#isPressed() ? '' : null));

    let disposableListeners: (() => void)[] = [];
    onDestroy(() => disposableListeners.forEach(dispose => dispose()));

    const reset = () => {
      if (this.#isPressed()) {
        disposableListeners.forEach(dispose => dispose());
        this.#isPressed.set(false);
      }
    };

    on('pointerdown', ({ event, next }) => {
      next(event);

      if (this.disabled()) {
        return;
      }

      disposableListeners.forEach(dispose => dispose());
      this.#isPressed.set(true);
      disposableListeners = [
        this.#host.docEvent('pointerup', () => reset()),
        this.#host.docEvent(
          'pointermove',
          e => this.#element !== e.target && !this.#element.contains(e.target as Node) && reset(),
        ),
        this.#host.docEvent('pointercancel', () => reset()),
      ];
    });
  }
}
