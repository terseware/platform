import { inject } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { Focus } from '@terseware/proto/focus';
import { Hover } from '@terseware/proto/hover';
import { Interact } from '@terseware/proto/interact';
import { Press } from '@terseware/proto/press';
import {
  bindable,
  ElementRenderer,
  injectElement,
  isNativeAnchorTag,
  isNativeButtonTag,
  isNativeInputTag,
  isomorphicEffect,
} from '@terseware/utils';

@Resolvable()
export class Button {
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  get #isNativeButton(): boolean {
    return isNativeButtonTag(this.#element);
  }
  get #isValidLink(): boolean {
    return isNativeAnchorTag(this.#element, { validLink: true });
  }
  get #isNativeInput(): boolean {
    return isNativeInputTag(this.#element, {
      types: ['button', 'submit', 'reset', 'image'],
    });
  }

  readonly disabled = bindable(false);
  readonly focusableWhenDisabled = bindable(false);
  readonly tabIndex = bindable(0);
  readonly role = bindable<string | null>(null);
  readonly type = bindable<string | null>(null);

  constructor() {
    const interact = inject(Interact);
    interact.disabled.set(this.disabled);
    interact.focusableWhenDisabled.set(this.focusableWhenDisabled);
    interact.tabIndex.set(this.tabIndex);

    inject(Focus).disabled.set(interact.hardDisabled);
    inject(Hover).disabled.set(interact.disabled);
    inject(Press).disabled.set(interact.disabled);

    isomorphicEffect({
      earlyRead: () => {
        const role = this.role();
        if (role) {
          return role;
        }
        if (this.#isNativeButton || this.#isValidLink || this.#isNativeInput) {
          return null;
        }
        return 'button';
      },
      write: role => this.#renderer.setAttr(this.#element, 'role', role()),
    });

    isomorphicEffect({
      earlyRead: () => {
        const type = this.type();
        if (type) {
          return type;
        }
        if (this.#isNativeButton) {
          return 'button';
        }
        return null;
      },
      write: type => this.#renderer.setAttr(this.#element, 'type', type()),
    });

    this.#renderer.listen(this.#element, 'click', event => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    this.#renderer.listen(this.#element, 'mousedown', event => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    this.#renderer.listen(this.#element, 'pointerdown', event => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    this.#renderer.listen(this.#element, 'keydown', event => {
      // Only handle direct events (not bubbled from children) on non-native elements
      const shouldClick =
        event.target === event.currentTarget &&
        !this.#isNativeButton &&
        !this.#isValidLink && // Re-check at runtime; routerLink may have added href
        !this.disabled();

      const isSpaceKey = event.key === ' ';
      const isEnterKey = event.key === 'Enter';

      if (shouldClick) {
        // Prevent default to stop Space from scrolling the page
        if (isSpaceKey || isEnterKey) {
          event.preventDefault();
        }

        // Native button behavior: Enter fires immediately, Space waits for keyup
        // (allowing users to cancel by moving focus before releasing)
        if (isEnterKey) {
          this.#element.click();
        }
      }
    });

    this.#renderer.listen(this.#element, 'keyup', event => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.target === event.currentTarget && !this.#isNativeButton && event.key === ' ') {
        this.#element.click();
      }
    });
  }
}
