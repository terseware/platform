import type { FocusOrigin } from '@angular/cdk/a11y';
import { FocusMonitor } from '@angular/cdk/a11y';
import { computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ProtoHost, Resolvable } from '@terseware/proto';
import { isNull } from '@terseware/utils';
import { combineLatest, of, switchMap } from 'rxjs';

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
  if (origin === null) {
    return false;
  }
  if (origin === 'keyboard') {
    return true;
  }
  return alwaysShowFocus(element);
}

@Resolvable()
export class FocusProto {
  readonly #host = inject(ProtoHost);
  readonly #focusMonitor = inject(FocusMonitor);

  readonly disabled = signal(false);
  readonly #disabled$ = toObservable(this.disabled);

  readonly checkChildren = signal(false);
  readonly #checkChildren$ = toObservable(this.checkChildren);

  readonly focusOrigin = toSignal(
    combineLatest([this.#disabled$, this.#checkChildren$]).pipe(
      switchMap(([disabled, checkChildren]) =>
        disabled ? of(null) : this.#focusMonitor.monitor(this.#host.element, checkChildren),
      ),
    ),
    { initialValue: null },
  );

  readonly isFocused = computed(() => !isNull(this.focusOrigin()));
  readonly isFocusVisible = computed(() =>
    shouldShowFocusVisible(this.focusOrigin(), this.#host.element),
  );

  constructor() {
    this.#host.bindAttr('data-focus', () => (!this.disabled() && this.isFocused() ? '' : null));
    this.#host.bindAttr('data-focus-origin', () => (this.disabled() ? null : this.focusOrigin()));
    this.#host.bindAttr('data-focus-visible', () =>
      !this.disabled() && this.isFocusVisible() ? '' : null,
    );
  }

  focus(origin: FocusOrigin = 'program', focusOptions?: FocusOptions): void {
    if (origin) {
      this.#focusMonitor.focusVia(this.#host.element, origin, focusOptions);
    } else {
      this.#host.element.focus(focusOptions);
    }
  }

  blur(): void {
    this.#host.element.blur();
  }
}
