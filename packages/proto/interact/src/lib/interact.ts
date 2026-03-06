import { computed, inject, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import {
  ElementRenderer,
  injectElement,
  isomorphicEffect,
  supportsDisabledAttribute,
} from '@terseware/utils';

@Resolvable({ inherit: true })
export class Interact {
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly #nativeDisabled = supportsDisabledAttribute(this.#element);

  readonly disabled = signal(false);
  readonly focusableWhenDisabled = signal(false);
  readonly tabIndex = signal(0);

  readonly hardDisabled = computed(() => this.disabled() && !this.focusableWhenDisabled());
  readonly softDisabled = computed(() => this.disabled() && this.focusableWhenDisabled());

  constructor() {
    isomorphicEffect({
      write: () =>
        this.#renderer.setAttr(this.#element, 'data-disabled', this.disabled() ? '' : null),
    });

    isomorphicEffect({
      write: () =>
        this.#renderer.setAttr(
          this.#element,
          'data-disabled-focusable',
          this.softDisabled() ? '' : null,
        ),
    });

    if (this.#nativeDisabled) {
      isomorphicEffect({
        write: () =>
          this.#renderer.setAttr(this.#element, 'disabled', this.hardDisabled() ? '' : null),
      });
    }

    isomorphicEffect({
      earlyRead: () => {
        let tabIndex = this.tabIndex();
        if (!this.#nativeDisabled && this.disabled()) {
          tabIndex = this.focusableWhenDisabled() ? tabIndex : -1;
        }
        return `${tabIndex}`;
      },
      write: tabIndex => this.#renderer.setAttr(this.#element, 'tabindex', tabIndex()),
    });

    isomorphicEffect({
      earlyRead: () => {
        if (
          (this.#nativeDisabled && this.focusableWhenDisabled()) ||
          (!this.#nativeDisabled && this.disabled())
        ) {
          return `${this.disabled()}`;
        }
        return null;
      },
      write: ariaDisabled => this.#renderer.setAttr(this.#element, 'aria-disabled', ariaDisabled()),
    });

    this.#renderer.listen(this.#element, 'keydown', event => {
      if (this.disabled()) {
        if (event.key !== 'Tab') {
          event.preventDefault();
        }
        event.stopImmediatePropagation();
      }
    });
  }
}
