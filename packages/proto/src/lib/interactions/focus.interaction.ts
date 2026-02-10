import type { FocusOrigin } from '@angular/cdk/a11y';
import { FocusMonitor } from '@angular/cdk/a11y';
import { computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalMethod,
  signalStore,
  signalStoreFeature,
  withComputed,
  withFeature,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { injectElementRef, isNull, withAttrBinding } from '@terseware/proto/utils';
import { combineLatest, of, switchMap } from 'rxjs';

export const FocusInteraction = signalStore(
  withState({ disabled: false, checkChildren: false }),
  withProps(store => ({
    _focusMonitor: inject(FocusMonitor),
    _elementRef: injectElementRef(),
    _checkChildren$: toObservable(store.checkChildren),
    _disabled$: toObservable(store.disabled),
  })),
  withComputed(store => ({
    focusOrigin: toSignal(
      combineLatest([store._disabled$, store._checkChildren$]).pipe(
        switchMap(([disabled, checkChildren]) =>
          disabled
            ? of(null)
            : store._focusMonitor.monitor(store._elementRef.nativeElement, checkChildren),
        ),
      ),
      { initialValue: null },
    ),
  })),
  withComputed(store => ({
    isFocused: computed(() => !isNull(store.focusOrigin())),
    isFocusVisible: computed(() =>
      shouldShowFocusVisible(store.focusOrigin(), store._elementRef.nativeElement),
    ),
  })),
  withFeature(store =>
    signalStoreFeature(
      withAttrBinding('data-focus', () => (store.isFocused() ? '' : null)),
      withAttrBinding('data-focus-origin', () => store.focusOrigin()),
      withAttrBinding('data-focus-visible', () => (store.isFocusVisible() ? '' : null)),
    ),
  ),
  withHooks({
    onDestroy(store) {
      store._focusMonitor.stopMonitoring(store._elementRef.nativeElement);
    },
  }),
  withMethods(store => ({
    setDisabled: signalMethod((v: boolean) => patchState(store, { disabled: v })),
    setCheckChildren: signalMethod((v: boolean) => patchState(store, { checkChildren: v })),
    focus(origin: FocusOrigin = 'program', focusOptions?: FocusOptions): void {
      if (origin) {
        store._focusMonitor.focusVia(store._elementRef.nativeElement, origin, focusOptions);
      } else {
        store._elementRef.nativeElement.focus(focusOptions);
      }
    },
    blur(): void {
      store._elementRef.nativeElement.blur();
    },
  })),
);

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
