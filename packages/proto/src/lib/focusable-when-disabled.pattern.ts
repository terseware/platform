import { type Signal } from '@angular/core';
import { computedConst, supportsDisabledAttribute } from '@terseware/proto/utils';
import {
  ProtoPatternBase,
  type ProtoPatternOptions,
  type ProtoPatternPatternFields,
} from './proto-pattern';

export type FocusableWhenDisabledPatternInputs = {
  readonly disabled?: Signal<boolean>;
  readonly focusableWhenDisabled?: Signal<boolean>;
  readonly tabIndex?: Signal<number>;
};

export class FocusableWhenDisabledPattern
  extends ProtoPatternBase
  implements ProtoPatternPatternFields<FocusableWhenDisabledPattern>
{
  readonly disabled = computedConst(() => false);
  readonly focusableWhenDisabled = computedConst(() => false);
  readonly tabIndex = computedConst(() => 0);

  constructor(
    protected readonly inputs: FocusableWhenDisabledPatternInputs = {},
    protected override readonly options: ProtoPatternOptions = {},
  ) {
    super(options);
    if (inputs.disabled) this.disabled = inputs.disabled;
    if (inputs.focusableWhenDisabled) this.focusableWhenDisabled = inputs.focusableWhenDisabled;
    if (inputs.tabIndex) this.tabIndex = inputs.tabIndex;
  }

  readonly hardDisabled = computedConst(() => this.disabled() && !this.focusableWhenDisabled());
  readonly softDisabled = computedConst(() => this.disabled() && this.focusableWhenDisabled());

  get nativeDisabled(): boolean {
    return supportsDisabledAttribute(this.element);
  }

  readonly 'attr.data-disabled' = computedConst(() => (this.disabled() ? '' : null));

  readonly 'attr.data-disabled-focusable' = computedConst(() => (this.softDisabled() ? '' : null));

  readonly 'attr.disabled' = computedConst(() =>
    this.nativeDisabled && this.hardDisabled() ? '' : null,
  );

  readonly 'attr.tabindex' = computedConst(() => {
    let tabIndex = this.tabIndex();
    if (!this.nativeDisabled && this.disabled()) {
      tabIndex = this.focusableWhenDisabled() ? tabIndex : -1;
    }
    return `${tabIndex}`;
  });

  readonly 'attr.aria-disabled' = computedConst(() => {
    if (
      (this.nativeDisabled && this.focusableWhenDisabled()) ||
      (!this.nativeDisabled && this.disabled())
    ) {
      return `${this.disabled()}` as const;
    }
    return null;
  });

  ['evt.keydown'](event: HTMLElementEventMap['keydown']): void {
    if (this.disabled()) {
      // Allow tabbing away to prevent focus trapping
      if (event.key !== 'Tab') {
        event.preventDefault();
      }

      event.stopImmediatePropagation();
    }
  }
}
