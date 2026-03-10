import { signal } from '@angular/core';
import { Host, Resolvable, resolve } from '@terseware/proto';
import { Focus } from '@terseware/proto/focus';
import { Hover } from '@terseware/proto/hover';
import { Interact } from '@terseware/proto/interact';
import { Press } from '@terseware/proto/press';
import {
  isNativeAnchorTag,
  isNativeButtonTag,
  isNativeInputTag,
  signalBind,
} from '@terseware/utils';

@Resolvable()
export class Button {
  readonly #host = resolve(Host);
  readonly interact = resolve(Interact);
  readonly hover = resolve(Hover);
  readonly press = resolve(Press);
  readonly focus = resolve(Focus);

  get #isNativeButton(): boolean {
    return isNativeButtonTag(this.#host.element);
  }
  get #isValidLink(): boolean {
    return isNativeAnchorTag(this.#host.element, { validLink: true });
  }
  get #isNativeInput(): boolean {
    return isNativeInputTag(this.#host.element, {
      types: ['button', 'submit', 'reset', 'image'],
    });
  }
  get #isTextNavigationRole(): boolean {
    const role = this.role();
    return role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';
  }

  readonly isComposite = signal(false);
  readonly role = signal<string | null>(null);
  readonly type = signal<string | null>(null);

  constructor() {
    signalBind(this.hover.disabled, this.interact.disabled);
    signalBind(this.press.disabled, this.interact.disabled);
    signalBind(this.focus.disabled, this.interact.hardDisabled); // Allow focus when focusable when disabled is true

    this.#host.bindAttr('role', () => {
      const role = this.role();
      if (role) {
        return role;
      }
      if (this.#isNativeButton || this.#isValidLink || this.#isNativeInput) {
        return null;
      }
      return 'button';
    });

    this.#host.bindAttr('type', () => {
      const type = this.type();
      if (type) {
        return type;
      }
      if (this.#isNativeButton) {
        return 'button';
      }
      return null;
    });

    this.#host.on('click', (next, event) => {
      if (this.interact.disabled()) {
        event.preventDefault();
        return;
      }
      next(event);
    });

    this.#host.on('mousedown', (next, event) => {
      if (this.interact.disabled()) {
        return;
      }
      next(event);
    });

    this.#host.on('pointerdown', (next, event) => {
      if (this.interact.disabled()) {
        event.preventDefault();
        return;
      }
      next(event);
    });

    this.#host.on('keydown', (next, event) => {
      if (this.interact.disabled()) {
        return;
      }

      next(event);
      if (event.protoHandlerPrevented) {
        return;
      }

      const isCurrentTarget = event.target === event.currentTarget;
      const currentTarget = event.currentTarget as HTMLElement;
      const isSpaceKey = event.key === ' ';

      if (isCurrentTarget && this.isComposite() && isSpaceKey) {
        if (event.defaultPrevented && this.#isTextNavigationRole) {
          return;
        }

        event.preventDefault();

        if (this.#isValidLink || this.#isNativeButton) {
          currentTarget.click();
          event.preventProtoHandler();
        }

        return;
      }

      const isEnterKey = event.key === 'Enter';
      const shouldClick = isCurrentTarget && !this.#isNativeButton && !this.#isValidLink;

      if (shouldClick) {
        // Prevent default to stop Space from scrolling the page
        if (isSpaceKey || isEnterKey) {
          event.preventDefault();
        }

        // Native button behavior: Enter fires immediately, Space waits for keyup
        // (allowing users to cancel by moving focus before releasing)
        if (isEnterKey) {
          this.#host.element.click();
        }
      }
    });

    this.#host.on('keyup', (next, event) => {
      if (this.interact.disabled()) {
        return;
      }

      next(event);

      if (
        event.target === event.currentTarget &&
        this.#isNativeButton &&
        this.isComposite() &&
        event.key === ' '
      ) {
        event.preventDefault();
        return;
      }

      if (event.protoHandlerPrevented) {
        return;
      }

      // Keyboard accessibility for non interactive elements
      if (
        event.target === event.currentTarget &&
        !this.#isNativeButton &&
        !this.isComposite() &&
        event.key === ' '
      ) {
        this.#host.element.click();
      }
    });
  }
}
