import { FocusMonitor, type FocusOrigin } from '@angular/cdk/a11y';
import { computed, inject, type Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { SignalLike } from '@terseware/proto/utils';
import { isNull, unwrap } from '@terseware/proto/utils';
import { combineLatest, of, switchMap } from 'rxjs';
import {
  ProtoPatternBase,
  type ProtoPatternOptions,
  type ProtoPatternPatternFields,
} from './proto-pattern';

export type FocusPatternInputs = {
  readonly element?: HTMLElement;
  readonly focusMonitor?: FocusMonitor;
  readonly disabled?: SignalLike<boolean>;
  readonly checkChildren?: SignalLike<boolean>;
};

export class FocusPattern
  extends ProtoPatternBase
  implements ProtoPatternPatternFields<FocusPattern>
{
  protected readonly focusMonitor: FocusMonitor;

  readonly disabled: Signal<boolean>;
  readonly checkChildren: Signal<boolean>;

  readonly isFocused: Signal<boolean>;
  readonly isFocusVisible: Signal<boolean>;
  readonly focusOrigin: Signal<FocusOrigin | null>;

  constructor(
    protected readonly inputs: FocusPatternInputs,
    protected override readonly options: ProtoPatternOptions = {},
  ) {
    super(options);
    this.focusMonitor = inputs.focusMonitor ?? inject(FocusMonitor);

    this.disabled = computed(() => unwrap(inputs.disabled) ?? false);
    this.checkChildren = computed(() => unwrap(inputs.checkChildren) ?? false);

    this.focusOrigin = toSignal(
      combineLatest([toObservable(this.disabled), toObservable(this.checkChildren)]).pipe(
        switchMap(([disabled, checkChildren]) =>
          disabled ? of(null) : this.focusMonitor.monitor(this.element, checkChildren),
        ),
      ),
      { initialValue: null },
    );

    this.isFocused = computed(() => !isNull(this.focusOrigin()));
    this.isFocusVisible = computed(() => shouldShowFocusVisible(this.focusOrigin(), this.element));
  }

  readonly 'attr.data-focus' = computed(() => (this.isFocused() ? '' : null));
  readonly 'attr.data-focus-visible' = computed(() => (this.isFocusVisible() ? '' : null));
  readonly 'attr.data-focus-origin' = computed(() => this.focusOrigin());

  /** Focus the element. */
  focusElement(origin: FocusOrigin = 'program', focusOptions?: FocusOptions): void {
    if (origin) {
      this.focusMonitor.focusVia(this.element, origin, focusOptions);
    } else {
      this.element.focus(focusOptions);
    }
  }

  /** Blur the element. */
  blurElement(): void {
    this.element.blur();
  }
}

/**
 * Text-like input types that have a visible cursor, so focus should
 * always be visible regardless of how the element received focus.
 */
const TEXT_INPUT_TYPES = new Set(['text', 'password', 'email', 'number', 'search', 'tel', 'url']);

function alwaysShowFocus(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(element.type.toLowerCase())) {
    return true;
  }

  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  if (element.isContentEditable || element.hasAttribute('contenteditable')) {
    return true;
  }

  return false;
}

function shouldShowFocusVisible(origin: FocusOrigin, element: HTMLElement): boolean {
  if (origin === null) return false;
  if (origin === 'keyboard') return true;
  return alwaysShowFocus(element);
}
