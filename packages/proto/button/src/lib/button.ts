import { Resolvable, resolve } from '@terseware/proto';
import { Focus, Hover, Interact, Press } from '@terseware/proto/interactions';
import {
  injectElement,
  isNativeAnchorTag,
  isNativeButtonTag,
  isNativeInputTag,
} from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';

@Resolvable()
export class Button {
  readonly #element = injectElement();

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
    const interact = resolve(Interact, {
      disabled: this.disabled,
      focusableWhenDisabled: this.focusableWhenDisabled,
      tabIndex: this.tabIndex,
    });

    resolve(Hover, { disabled: interact.disabled });
    resolve(Press, { disabled: interact.disabled });

    // When focusableWhenDisabled is true, still allow focus interactions
    resolve(Focus, { disabled: interact.hardDisabled });

    hostBinding('attr.role', () => {
      const val = this.role();
      if (val) {
        return val;
      }
      if (this.#isNativeButton || this.#isValidLink || this.#isNativeInput) {
        return null;
      }
      return 'button';
    });

    hostBinding('attr.type', () => {
      const val = this.type();
      if (val) {
        return val;
      }
      if (this.#isNativeButton) {
        return 'button';
      }
      return null;
    });

    hostBinding('(click)', event => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    hostBinding('(mousedown)', event => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    hostBinding('(keydown)', event => {
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

    hostBinding('(keyup)', event => {
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
