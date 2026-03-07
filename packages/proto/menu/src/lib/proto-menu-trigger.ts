import { Directive, input } from '@angular/core';
import { resolve } from '@terseware/proto';
import { signalBind } from '@terseware/utils';

import type { MenuContent } from './menu-ctx';
import { Menu, MenuCtx, MenuItem } from './menu-ctx';

@Directive({
  selector: '[protoMenuTrigger],proto-menu-trigger',
  exportAs: 'protoMenuTrigger',
})
export class ProtoMenuTrigger {
  readonly ctx = resolve(MenuCtx);

  readonly content = input<MenuContent | null>(null, { alias: 'protoMenuTrigger' });

  constructor() {
    signalBind(this.ctx.content, this.content);
  }
}

@Directive({
  selector: '[protoMenu],proto-menu',
  exportAs: 'protoMenu',
})
export class ProtoMenu {
  readonly menu = resolve(Menu);
}

@Directive({
  selector: '[protoMenuItem],proto-menu-item',
  exportAs: 'protoMenuItem',
})
export class ProtoMenuItem {
  readonly item = resolve(MenuItem);

  readonly disabled = input(false, { alias: 'protoMenuItemDisabled' });

  constructor() {
    signalBind(this.item.disabled, this.disabled);
  }
}
