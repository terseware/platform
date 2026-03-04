import { computed, inject } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import {
  bindable,
  ElementRenderer,
  injectElement,
  isomorphicEffect,
  supportsDisabledAttribute,
} from '@terseware/utils';

@Resolvable()
export class Interact {
  readonly disabled = bindable(false);
  readonly focusableWhenDisabled = bindable(false);
  readonly tabIndex = bindable(0);

  readonly hardDisabled = computed(() => this.disabled() && !this.focusableWhenDisabled());
  readonly softDisabled = computed(() => this.disabled() && this.focusableWhenDisabled());

  constructor() {
    const el = injectElement();
    const nativeDisabled = supportsDisabledAttribute(el);
    const renderer = inject(ElementRenderer);

    isomorphicEffect({
      write: () => renderer.setAttr(el, 'data-disabled', this.disabled() ? '' : null),
    });

    isomorphicEffect({
      write: () => renderer.setAttr(el, 'data-disabled-focusable', this.softDisabled() ? '' : null),
    });

    if (nativeDisabled) {
      isomorphicEffect({
        write: () => renderer.prop(el, 'disabled', this.hardDisabled()),
      });
    }

    isomorphicEffect({
      earlyRead: () => {
        let tabIndex = this.tabIndex();
        if (!nativeDisabled && this.disabled()) {
          tabIndex = this.focusableWhenDisabled() ? tabIndex : -1;
        }
        return `${tabIndex}`;
      },
      write: tabIndex => renderer.setAttr(el, 'tabindex', tabIndex()),
    });

    isomorphicEffect({
      earlyRead: () => {
        if (
          (nativeDisabled && this.focusableWhenDisabled()) ||
          (!nativeDisabled && this.disabled())
        ) {
          return `${this.disabled()}`;
        }
        return null;
      },
      write: ariaDisabled => renderer.setAttr(el, 'aria-disabled', ariaDisabled()),
    });

    renderer.listen(el, 'keydown', event => {
      if (this.disabled()) {
        if (event.key !== 'Tab') {
          event.preventDefault();
        }
        event.stopImmediatePropagation();
      }
    });
  }
}
