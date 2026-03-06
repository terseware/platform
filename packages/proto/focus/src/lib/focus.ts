import type { FocusOrigin } from '@angular/cdk/a11y';
import { FocusMonitor } from '@angular/cdk/a11y';
import { computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Resolvable } from '@terseware/proto';
import { ElementRenderer, injectElement, isNull, isomorphicEffect } from '@terseware/utils';
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
  readonly #renderer = inject(ElementRenderer);
  readonly #focusMonitor = inject(FocusMonitor);

  readonly disabled = signal(false);
  readonly #disabled$ = toObservable(this.disabled);

  readonly checkChildren = signal(false);
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
    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.isFocused(),
      write: focused => this.#renderer.setAttr(this.#element, 'data-focus', focused() ? '' : null),
    });
    isomorphicEffect({
      earlyRead: () => (this.disabled() ? null : this.focusOrigin()),
      write: focusOrigin =>
        this.#renderer.setAttr(this.#element, 'data-focus-origin', focusOrigin()),
    });
    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.isFocusVisible(),
      write: focusVisible =>
        this.#renderer.setAttr(this.#element, 'data-focus-visible', focusVisible() ? '' : null),
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
