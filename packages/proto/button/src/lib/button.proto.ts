import { inject, signal } from '@angular/core';
import { on, ProtoHost, Resolvable, resolve } from '@terseware/proto';
import { InteractProto } from '@terseware/proto/interact';
import { isNativeAnchorTag, isNativeButtonTag, isNativeInputTag } from '@terseware/utils';

@Resolvable()
export class ButtonProto {
  readonly #host = inject(ProtoHost);
  readonly interact = resolve(InteractProto);

  // Using getters here in case of DOM changes between events.

  get #isButton(): boolean {
    return isNativeButtonTag(this.#host.element);
  }
  get #isLink(): boolean {
    return isNativeAnchorTag(this.#host.element, { validLink: true });
  }
  get #isInput(): boolean {
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
    this.#host.bindAttr('role', () => {
      const role = this.role();
      if (role) {
        return role;
      }
      if (this.#isButton || this.#isLink || this.#isInput) {
        return null;
      }
      return 'button';
    });

    this.#host.bindAttr('type', () => {
      const type = this.type();
      if (type) {
        return type;
      }
      if (this.#isButton) {
        return 'button';
      }
      return null;
    });

    on('click', ({ event, next }) => {
      if (this.interact.disabled()) {
        event.preventDefault();
        return;
      }
      next(event);
    });

    on('mousedown', ({ event, next }) => {
      if (this.interact.disabled()) {
        return;
      }
      next(event);
    });

    on('pointerdown', ({ event, next }) => {
      if (this.interact.disabled()) {
        event.preventDefault();
        return;
      }
      next(event);
    });

    on('keydown', ({ event, next }) => {
      if (this.interact.hardDisabled()) {
        return;
      }

      const isSpaceKey = event.key === ' ';
      const isEnterKey = event.key === 'Enter';

      if (this.interact.softDisabled() && (isSpaceKey || isEnterKey)) {
        return;
      }

      next(event);
      if (event.protoHandlerPrevented) {
        return;
      }

      const isCurrentTarget = event.target === event.currentTarget;
      const currentTarget = event.currentTarget as HTMLElement;
      const shouldClick = isCurrentTarget && !this.#isButton && !this.#isLink;

      if (isCurrentTarget && this.isComposite() && isSpaceKey) {
        if (event.defaultPrevented && this.#isTextNavigationRole) {
          return;
        }

        event.preventDefault();

        if (this.#isLink || this.#isButton) {
          currentTarget.click();
          event.preventProtoHandler();
        } else if (shouldClick) {
          next.event('click', event);
          event.preventProtoHandler();
        }

        return;
      }

      if (shouldClick) {
        // Prevent default to stop Space from scrolling the page
        if (isSpaceKey || isEnterKey) {
          event.preventDefault();
        }

        // Native button behavior: Enter fires immediately, Space waits for keyup
        // (allowing users to cancel by moving focus before releasing)
        if (isEnterKey) {
          next.event('click', event);
        }
      }
    });

    on('keyup', ({ event, next }) => {
      if (this.interact.disabled()) {
        return;
      }

      next(event);

      if (
        event.target === event.currentTarget &&
        this.#isButton &&
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
        !this.#isButton &&
        !this.isComposite() &&
        event.key === ' '
      ) {
        this.#host.element.click();
      }
    });
  }
}
