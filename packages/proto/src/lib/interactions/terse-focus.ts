import type { FocusOrigin } from '@angular/cdk/a11y';
import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, computed, Directive, inject, input, output } from '@angular/core';
import { onChange } from '@terseware/proto/utils';
import { FocusInteraction } from './focus.interaction';

@Directive({
  selector: '[protoFocus]',
  exportAs: 'protoFocus',
  providers: [FocusInteraction],
})
export class ProtoFocus {
  protected readonly store = inject(FocusInteraction);

  /**
   * Whether focus tracking is disabled.
   * When disabled becomes true, the focus state is automatically reset.
   */
  readonly disabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
    alias: 'protoFocusDisabled',
  });

  /**
   * Whether to count the element as focused when its children are focused.
   * Useful for composite components like menus, toolbars, or form groups.
   */
  readonly checkChildren = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
    alias: 'protoFocusCheckChildren',
  });

  /**
   * Emits the focus origin when the element is focused or blurred.
   */
  readonly focusChange = output<FocusOrigin>({ alias: 'protoFocusChange' });

  /**
   * Emits true when the element is focused and visible, false when it is not.
   */
  readonly focusVisibleChange = output<boolean>({ alias: 'protoFocusVisibleChange' });

  /**
   * Whether the element is currently focused.
   */
  readonly isFocused = computed(() => this.store.isFocused());

  /**
   * Whether the element is currently focused.
   */
  readonly isFocusVisible = computed(() => this.store.isFocusVisible());

  /**
   * The origin of the current focus event.
   */
  readonly focusOrigin = computed(() => this.store.focusOrigin());

  constructor() {
    this.store.setDisabled(this.disabled);
    this.store.setCheckChildren(this.checkChildren);
    onChange(this.store.focusOrigin, o => this.focusChange.emit(o));
    onChange(this.store.isFocusVisible, v => this.focusVisibleChange.emit(v));
  }

  /**
   * Programmatically focuses the element.
   *
   * @param origin The focus origin to use. Defaults to 'program'.
   * @param focusOptions Standard FocusOptions (preventScroll, etc.)
   */
  focus(origin: FocusOrigin = 'program', focusOptions?: FocusOptions): void {
    this.store.focus(origin, focusOptions);
  }

  /**
   * Programmatically blurs the element.
   */
  blur(): void {
    this.store.blur();
  }
}
