import { computed, type Signal } from '@angular/core';
import { isNativeAnchorTag, isNativeButtonTag, isNativeInputTag } from '@terseware/proto/utils';
import {
  FocusableWhenDisabledPattern,
  type FocusableWhenDisabledPatternInputs,
} from './focusable-when-disabled.pattern';
import type { ProtoPatternOptions, ProtoPatternPatternFields } from './proto-pattern';

export type ButtonPatternInputs = FocusableWhenDisabledPatternInputs & {
  readonly role?: Signal<string | null>;
  readonly type?: Signal<string | null>;
};

export class ButtonPattern
  extends FocusableWhenDisabledPattern
  implements ProtoPatternPatternFields<ButtonPattern>
{
  readonly role = computed<string | null>(() => null);
  readonly type = computed<string | null>(() => null);

  get nativeButton(): boolean {
    return isNativeButtonTag(this.element);
  }

  get nativeAnchor(): boolean {
    return isNativeAnchorTag(this.element, { validLink: true });
  }

  get nativeInput(): boolean {
    return isNativeInputTag(this.element, {
      types: ['button', 'submit', 'reset', 'image'],
    });
  }

  constructor(
    protected override readonly inputs: ButtonPatternInputs = {},
    protected override readonly options: ProtoPatternOptions = {},
  ) {
    super(inputs, options);
    if (inputs.role) this.role = inputs.role;
    if (inputs.type) this.type = inputs.type;
  }

  readonly ['attr.role'] = computed(() => {
    const role = this.role();
    if (role) return role;
    return this.nativeButton || this.nativeAnchor || this.nativeInput ? null : 'button';
  });

  readonly ['attr.type'] = computed(() => {
    const type = this.type();
    if (type) return type;
    return this.nativeButton ? 'button' : null;
  });

  ['evt.click'](event: HTMLElementEventMap['click']): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  ['evt.mousedown'](event: HTMLElementEventMap['mousedown']): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  override ['evt.keydown'](event: HTMLElementEventMap['keydown']): void {
    super['evt.keydown'](event);

    // Only handle direct events (not bubbled from children) on non-native elements
    const shouldClick =
      event.target === event.currentTarget &&
      !this.nativeButton &&
      !this.nativeAnchor && // Re-check at runtime; routerLink may have added href
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
        this.element.click();
      }
    }
  }

  ['evt.keyup'](event: HTMLElementEventMap['keyup']): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.target === event.currentTarget && !this.nativeButton && event.key === ' ') {
      this.element.click();
    }
  }
}
