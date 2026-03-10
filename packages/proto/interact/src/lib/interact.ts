import { computed, signal } from '@angular/core';
import { Host, Resolvable, resolve } from '@terseware/proto';
import { supportsDisabledAttribute } from '@terseware/utils';

@Resolvable()
export class Interact {
  readonly #host = resolve(Host);

  get #nativeDisabled(): boolean {
    return supportsDisabledAttribute(this.#host.element);
  }

  readonly disabled = signal(false);
  readonly focusableWhenDisabled = signal(false);
  readonly tabIndex = signal(0);

  readonly hardDisabled = computed(() => this.disabled() && !this.focusableWhenDisabled());
  readonly softDisabled = computed(() => this.disabled() && this.focusableWhenDisabled());

  constructor() {
    this.#host.bindAttr('data-disabled', () => (this.disabled() ? '' : null));
    this.#host.bindAttr('data-disabled-focusable', () => (this.softDisabled() ? '' : null));

    if (this.#nativeDisabled) {
      this.#host.bindAttr('disabled', () => (this.hardDisabled() ? '' : null));
    }

    this.#host.bindAttr('tabindex', () => {
      let tabIndex = this.tabIndex();
      if (!this.#nativeDisabled && this.disabled()) {
        tabIndex = this.focusableWhenDisabled() ? tabIndex : -1;
      }
      return `${tabIndex}`;
    });

    this.#host.bindAttr('aria-disabled', () => {
      if (
        (this.#nativeDisabled && this.focusableWhenDisabled()) ||
        (!this.#nativeDisabled && this.disabled())
      ) {
        return `${this.disabled()}`;
      }
      return null;
    });

    this.#host.on('keydown', (next, event) => {
      if (this.softDisabled() && event.key !== 'Tab') {
        event.preventDefault();
      }
      next(event);
    });
  }
}
