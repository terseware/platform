import { Directive, effect, inject } from '@angular/core';
import { ProtoHost, Resolvable } from '@terseware/proto';
import { ButtonBehavior } from '@terseware/proto/button';
import { FocusProto } from '@terseware/proto/focus';
import { injectElement } from '@terseware/utils';
import { MenuTriggerProto } from './menu-trigger';

/** Debounce timer for typeahead search reset. */
const TYPEAHEAD_DEBOUNCE_MS = 500;

@Resolvable()
export class MenuItemProto {
  readonly element = injectElement();
  readonly #host = inject(ProtoHost);
  readonly button = inject(ButtonBehavior);
  readonly focus = inject(FocusProto);
  readonly ctx = inject(MenuTriggerProto);

  readonly id = this.#host.id('menu-item');

  /** Typeahead debounce state. */
  #typeaheadBuffer = '';
  #typeaheadTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.ctx.addItem(this);

    this.button.isComposite.set(true);
    this.button.role.set('menuitem');

    effect(() => {
      const isActive = this.ctx.activeItem() === this;
      this.button.interact.tabIndex.set(isActive ? 0 : -1);
    });

    this.#host.bindAttr('data-active', () => (this.focus.isFocused() ? 'true' : null));

    this.#host.on('mouseup', () => this.#activate());

    this.#host.on('keydown', ({ event, next }) => {
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

    // this.#host.onKeys(
    //   new KeyboardEventManager()
    //     .on('ArrowDown', () => this.ctx.focusNext(), { ignoreRepeat: false })
    //     .on('ArrowUp', () => this.ctx.focusPrevious(), { ignoreRepeat: false })
    //     .on('Home', () => this.ctx.focusFirst())
    //     .on('End', () => this.ctx.focusLast())
    //     .on('Enter', () => this.#activate())
    //     .on(' ', () => this.#activate())
    //     .on('Escape', () => this.ctx.close())
    //     .on(/^[a-z0-9]$/i, event => this.#handleTypeahead(event.key), {
    //       preventDefault: false,
    //       stopPropagation: false,
    //     }),
    // );
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

  // /** Accumulate typed characters and search for matching items. */
  // #handleTypeahead(char: string): void {
  //   if (this.#typeaheadTimeout) {
  //     clearTimeout(this.#typeaheadTimeout);
  //   }
  //   this.#typeaheadBuffer += char;
  //   this.ctx.typeahead(this.#typeaheadBuffer);
  //   this.#typeaheadTimeout = setTimeout(() => {
  //     this.#typeaheadBuffer = '';
  //     this.#typeaheadTimeout = null;
  //   }, TYPEAHEAD_DEBOUNCE_MS);
  // }
}

@Directive({
  selector: '[protoMenuItem],proto-menu-item',
  exportAs: 'protoMenuItem',
})
export class ProtoMenuItem {
  readonly item = inject(MenuItemProto);
}
