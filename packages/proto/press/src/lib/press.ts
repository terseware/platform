import { DOCUMENT, inject, Injector, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { ElementRenderer, injectElement, isomorphicEffect, onDestroy } from '@terseware/utils';

@Resolvable()
export class Press {
  readonly #injector = inject(Injector);
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly #doc = inject(DOCUMENT);

  readonly disabled = signal(false);

  readonly #isPressed = signal(false);
  readonly isPressed = this.#isPressed.asReadonly();

  constructor() {
    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.#isPressed(),
      write: pressed => this.#renderer.setAttr(this.#element, 'data-press', pressed() ? '' : null),
    });

    let disposableListeners: (() => void)[] = [];
    onDestroy(() => disposableListeners.forEach(dispose => dispose()));

    const reset = () => {
      if (this.#isPressed()) {
        disposableListeners.forEach(dispose => dispose());
        this.#isPressed.set(false);
      }
    };

    this.#renderer.listen(this.#element, 'pointerdown', () => {
      if (this.disabled()) {
        return;
      }

      disposableListeners.forEach(dispose => dispose());
      this.#isPressed.set(true);
      disposableListeners = [
        this.#renderer.listen(this.#doc, 'pointerup', () => reset(), { injector: this.#injector }),
        this.#renderer.listen(
          this.#doc,
          'pointermove',
          event =>
            this.#element !== event.target &&
            !this.#element.contains(event.target as Node) &&
            reset(),
          { injector: this.#injector },
        ),
        this.#renderer.listen(this.#doc, 'pointercancel', () => reset(), {
          injector: this.#injector,
        }),
      ];
    });
  }
}
