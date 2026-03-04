import type { FocusOrigin } from '@angular/cdk/a11y';
import { FocusMonitor } from '@angular/cdk/a11y';
import { computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Resolvable } from '@terseware/proto';
import {
  bindable,
  ElementRenderer,
  injectElement,
  isNull,
  isomorphicEffect,
} from '@terseware/utils';
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
export class Focus {
  readonly #element = injectElement();
  readonly #focusMonitor = inject(FocusMonitor);

  readonly disabled = bindable(false);
  readonly #disabled$ = toObservable(this.disabled);

  readonly checkChildren = bindable(false);
  readonly #checkChildren$ = toObservable(this.checkChildren);

  readonly focusOrigin = toSignal(
    combineLatest([this.#disabled$, this.#checkChildren$]).pipe(
      switchMap(([disabled, checkChildren]) =>
        disabled ? of(null) : this.#focusMonitor.monitor(this.#element, checkChildren),
      ),
    ),
    { initialValue: null },
  );

  readonly isFocused = computed(() => !isNull(this.focusOrigin()));
  readonly isFocusVisible = computed(() =>
    shouldShowFocusVisible(this.focusOrigin(), this.#element),
  );

  constructor() {
    const el = this.#element;
    const r = inject(ElementRenderer);

    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.isFocused(),
      write: focused => r.setAttr(el, 'data-focus', focused() ? '' : null),
    });
    isomorphicEffect({
      earlyRead: () => (this.disabled() ? null : this.focusOrigin()),
      write: focusOrigin => r.setAttr(el, 'data-focus-origin', focusOrigin()),
    });
    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.isFocusVisible(),
      write: focusVisible => r.setAttr(el, 'data-focus-visible', focusVisible() ? '' : null),
    });
  }

  focus(origin: FocusOrigin = 'program', focusOptions?: FocusOptions): void {
    if (origin) {
      this.#focusMonitor.focusVia(this.#element, origin, focusOptions);
    } else {
      this.#element.focus(focusOptions);
    }
  }

  blur(): void {
    this.#element.blur();
  }
}
