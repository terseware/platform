import type { FocusOrigin } from '@angular/cdk/a11y';
import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, inject, input, output } from '@angular/core';
import { onChange, signalBind } from '@terseware/utils';
import { Focus } from './focus';

@Directive({
  selector: '[protoFocus]',
  exportAs: 'protoFocus',
})
export class ProtoFocus {
  readonly #focus = inject(Focus);

  /**
   * Whether focus tracking is disabled.
   * When disabled becomes true, the focus state is automatically reset.
   */
  readonly disabled = input<boolean, BooleanInput>(this.#focus.disabled(), {
    transform: booleanAttribute,
    alias: 'protoFocusDisabled',
  });

  /**
   * Whether to count the element as focused when its children are focused.
   * Useful for composite components like menus, toolbars, or form groups.
   */
  readonly checkChildren = input<boolean, BooleanInput>(this.#focus.checkChildren(), {
    transform: booleanAttribute,
    alias: 'protoFocusCheckChildren',
  });

  /**
   * Emits the focus origin when the element is focused or blurred.
   */
  readonly focusChange = output<FocusOrigin>({ alias: 'protoFocusChange' });

  /**
   * Whether the element is currently focused.
   */
  readonly isFocused = this.#focus.isFocused;

  /**
   * The origin of the current focus event.
   */
  readonly focusOrigin = this.#focus.focusOrigin;

  constructor() {
    signalBind(this.#focus.disabled, this.disabled);
    signalBind(this.#focus.checkChildren, this.checkChildren);
    onChange(this.focusOrigin, origin => this.focusChange.emit(origin));
  }

  /**
   * Programmatically focuses the element.
   *
   * @param origin The focus origin to use. Defaults to 'program'.
   * @param focusOptions Standard FocusOptions (preventScroll, etc.)
   */
  focus(origin: FocusOrigin = 'program', focusOptions?: FocusOptions): void {
    this.#focus.focus(origin, focusOptions);
  }

  /**
   * Programmatically blurs the element.
   */
  blur(): void {
    this.#focus.blur();
  }
}
