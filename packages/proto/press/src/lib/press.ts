import { DOCUMENT, inject, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { ElementRenderer, injectElement, isomorphicEffect, onDestroy } from '@terseware/utils';

@Resolvable()
export class Press {
  readonly disabled = signal(false);

  readonly #isPressed = signal(false);
  readonly isPressed = this.#isPressed.asReadonly();

  constructor() {
    const el = injectElement();
    const renderer = inject(ElementRenderer);
    const doc = inject(DOCUMENT);

    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.#isPressed(),
      write: pressed => renderer.setAttr(el, 'data-press', pressed() ? '' : null),
    });

    let disposableListeners: (() => void)[] = [];
    onDestroy(() => disposableListeners.forEach(dispose => dispose()));

    const reset = () => {
      if (this.#isPressed()) {
        disposableListeners.forEach(dispose => dispose());
        this.#isPressed.set(false);
      }
    };

    renderer.listen(el, 'pointerdown', () => {
      if (this.disabled()) {
        return;
      }

      disposableListeners.forEach(dispose => dispose());
      this.#isPressed.set(true);
      disposableListeners = [
        renderer.listen(doc, 'pointerup', () => reset()),
        renderer.listen(
          doc,
          'pointermove',
          event => el !== event.target && !el.contains(event.target as Node) && reset(),
        ),
        renderer.listen(doc, 'pointercancel', () => reset()),
      ];
    });
  }
}
