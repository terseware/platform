import { computed } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { injectElement, supportsDisabledAttribute } from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';

@Resolvable()
export class Interact {
  readonly #element = injectElement();

  get #hasDisabledAttr(): boolean {
    return supportsDisabledAttribute(this.#element);
  }

  readonly disabled = bindable(false);
  readonly focusableWhenDisabled = bindable(false);
  readonly tabIndex = bindable(0);

  readonly hardDisabled = computed(() => this.disabled() && !this.focusableWhenDisabled());
  readonly softDisabled = computed(() => this.disabled() && this.focusableWhenDisabled());

  constructor() {
    hostBinding('attr.data-disabled', () => (this.disabled() ? '' : null));

    hostBinding('attr.data-disabled-focusable', () => (this.softDisabled() ? '' : null));

    hostBinding('attr.disabled', () => (this.#hasDisabledAttr && this.hardDisabled() ? '' : null));

    hostBinding('attr.tabindex', () => {
      let tabIdx = this.tabIndex();
      if (!this.#hasDisabledAttr && this.disabled()) {
        tabIdx = this.focusableWhenDisabled() ? tabIdx : -1;
      }
      return `${tabIdx}`;
    });

    hostBinding('attr.aria-disabled', () => {
      if (
        (this.#hasDisabledAttr && this.focusableWhenDisabled()) ||
        (!this.#hasDisabledAttr && this.disabled())
      ) {
        return `${this.disabled()}`;
      }
      return null;
    });

    hostBinding('(keydown)', event => {
      if (this.disabled()) {
        if (event.key !== 'Tab') {
          event.preventDefault();
        }
        event.stopImmediatePropagation();
      }
    });
  }
}
