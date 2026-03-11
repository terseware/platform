import { Directive, inject } from '@angular/core';
import { Behavior } from '@terseware/proto';
import { ElementRenderer, injectElement } from '@terseware/utils';
import { MenuTrigger } from './menu-trigger';

@Behavior()
export class Menu {
  readonly element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly ctx = inject(MenuTrigger);
  readonly id = this.#renderer.id(this.element, 'menu');

  constructor() {
    this.ctx.setMenu(this);
    this.#renderer.setAttr(this.element, 'role', 'menu');

    // Set aria-labelledby to reference the trigger element
    this.#renderer.setAttr(this.element, 'aria-labelledby', this.ctx.triggerId);

    // Close on focusout when focus moves outside the menu
    this.#renderer.listen(this.element, 'focusout', event => {
      const related = event.relatedTarget as Node | null;
      if (!this.ctx.expanded()) {
        return;
      }
      // If relatedTarget is null, focus left the document entirely
      if (!related) {
        this.ctx.expanded.set(false);
        return;
      }

      if (related.contains(this.ctx.element)) {
        return;
      }

      if (!this.element.contains(related)) {
        this.ctx.expanded.set(false);
      }
    });
  }
}

@Directive({
  selector: '[protoMenu],proto-menu',
  exportAs: 'protoMenu',
})
export class ProtoMenu {
  readonly menu = inject(Menu);
}
