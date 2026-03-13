import { Directive, effect, inject } from '@angular/core';
import { on, ProtoHost, Resolvable, resolve } from '@terseware/proto';
import { ButtonProto } from '@terseware/proto/button';
import { FocusProto } from '@terseware/proto/focus';
import { injectElement, onDestroy } from '@terseware/utils';
import { MenuTriggerProto } from './menu-trigger.proto';

/** Debounce timer for typeahead search reset. */
const TYPEAHEAD_DEBOUNCE_MS = 500;

@Resolvable()
export class MenuItemProto {
  readonly element = injectElement();
  readonly #host = inject(ProtoHost);
  readonly button = resolve(ButtonProto);
  readonly focus = resolve(FocusProto);
  readonly ctx = inject(MenuTriggerProto);

  readonly id = this.#host.id('menu-item');

  /** Typeahead debounce state. */
  #typeaheadBuffer = '';
  #typeaheadTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    onDestroy(this.ctx.addItem(this));

    this.button.isComposite.set(true);
    this.button.role.set('menuitem');

    effect(() => {
      const isActive = this.ctx.activeItem() === this;
      this.button.interact.tabIndex.set(isActive ? 0 : -1);
    });

    this.#host.bindAttr('data-active', () => (this.focus.isFocused() ? 'true' : null));

    on('click', () => this.#activate());

    on('keydown', ({ event, next }) => {
      switch (event.key) {
        case 'ArrowDown':
          this.ctx.focusNext();
          event.preventDefault();
          break;
        case 'ArrowUp':
          this.ctx.focusPrevious();
          event.preventDefault();
          break;
        case 'Home':
          this.ctx.focusFirst();
          event.preventDefault();
          break;
        case 'End':
          this.ctx.focusLast();
          event.preventDefault();
          break;
        case 'Enter':
          this.#activate();
          event.preventDefault();
          break;
        case ' ':
          this.#activate();
          event.preventDefault();
          break;
        case 'Escape':
          this.ctx.close();
          event.preventDefault();
          break;
      }

      if (event.key.match(/^[a-z0-9]$/i)) {
        if (this.#typeaheadTimeout) {
          clearTimeout(this.#typeaheadTimeout);
        }
        this.#typeaheadBuffer += event.key;
        this.ctx.typeahead(this.#typeaheadBuffer);
        this.#typeaheadTimeout = setTimeout(() => {
          this.#typeaheadBuffer = '';
          this.#typeaheadTimeout = null;
        }, TYPEAHEAD_DEBOUNCE_MS);
      }

      next(event);
    });
  }

  /** Activate: click the element and close the menu (WAI-ARIA menuitem behavior). */
  #activate(): void {
    if (this.button.interact.disabled()) {
      return;
    }
    this.element.click();
    this.ctx.activeItem.set(null);
    this.ctx.close();
  }
}

@Directive({
  selector: '[protoMenuItem],proto-menu-item',
  exportAs: 'protoMenuItem',
})
export class ProtoMenuItem {
  readonly item = resolve(MenuItemProto);
}
