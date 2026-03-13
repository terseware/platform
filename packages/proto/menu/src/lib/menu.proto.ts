import { Directive, inject } from '@angular/core';
import { on, ProtoHost, Resolvable, resolve } from '@terseware/proto';
import { onDestroy } from '@terseware/utils';
import { MenuTriggerProto } from './menu-trigger.proto';

@Resolvable()
export class MenuProto {
  readonly #host = inject(ProtoHost);
  readonly element = this.#host.element;
  readonly ctx = inject(MenuTriggerProto);
  readonly id = this.#host.id('menu');

  constructor() {
    onDestroy(this.ctx.setMenu(this));

    this.#host.setAttr('role', 'menu');

    // Set aria-labelledby to reference the trigger element
    this.#host.bindAttr('aria-labelledby', () => this.ctx.triggerId);

    // Close on focusout when focus moves outside the menu
    on('focusout', ({ event, next }) => {
      const related = event.relatedTarget as Node | null;
      if (!this.ctx.expanded()) {
        return;
      }
      // If relatedTarget is null, focus left the document entirely
      if (!related) {
        this.ctx.expanded.set(false);
        return;
      }

      if (related.contains(this.#host.element)) {
        return;
      }

      if (!this.#host.element.contains(related)) {
        this.ctx.expanded.set(false);
      }
      next(event);
    });
  }
}

@Directive({
  selector: '[protoMenu],proto-menu',
  exportAs: 'protoMenu',
})
export class ProtoMenu {
  readonly menu = resolve(MenuProto);
}
