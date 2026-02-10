import { computed } from '@angular/core';
import {
  patchState,
  signalMethod,
  signalStore,
  signalStoreFeature,
  withComputed,
  withFeature,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  injectElementRef,
  supportsDisabledAttribute,
  withAttrBinding,
  withEventListener,
} from '@terseware/proto/utils';

export const DisableBehavior = signalStore(
  withState({
    disabled: false,
    focusable: false,
    tabIndex: 0,
  }),
  withMethods(store => ({
    setDisabled: signalMethod((v: boolean) => patchState(store, { disabled: v })),
    setFocusable: signalMethod((v: boolean) => patchState(store, { focusable: v })),
    setTabIndex: signalMethod((v: number) => patchState(store, { tabIndex: v })),
  })),
  withProps(() => {
    const _elementRef = injectElementRef();
    return {
      _elementRef,
      hasNativeDisabled: supportsDisabledAttribute(_elementRef.nativeElement),
    };
  }),
  withComputed(store => ({
    hardDisabled: computed(() => store.disabled() && !store.focusable()),
    softDisabled: computed(() => store.disabled() && store.focusable()),
  })),
  withFeature(store =>
    signalStoreFeature(
      withAttrBinding('data-disabled', () => (store.disabled() ? '' : null)),
      withAttrBinding('data-disabled-focusable', () => (store.softDisabled() ? '' : null)),
      withAttrBinding('disabled', () =>
        store.hasNativeDisabled && store.hardDisabled() ? '' : null,
      ),
      withAttrBinding('tabindex', () => {
        let tabIndex = store.tabIndex();
        if (!store.hasNativeDisabled && store.disabled()) {
          tabIndex = store.focusable() ? tabIndex : -1;
        }
        return String(tabIndex) as `${number}`;
      }),
      withAttrBinding('aria-disabled', () => {
        let ariaDisabled = false;
        if (
          (store.hasNativeDisabled && store.focusable()) ||
          (!store.hasNativeDisabled && store.disabled())
        ) {
          ariaDisabled = store.disabled();
        }
        return ariaDisabled ? 'true' : null;
      }),
    ),
  ),
  withFeature(store => {
    function blockEvent(event: Event): void {
      if (store.disabled() && event.target === event.currentTarget) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    function blockKeydown(event: KeyboardEvent): void {
      if (store.disabled() && event.key !== 'Tab' && event.target === event.currentTarget) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    return signalStoreFeature(
      withEventListener('click', event => blockEvent(event)),
      withEventListener('keydown', event => blockKeydown(event)),
      withEventListener('keyup', event => blockEvent(event)),
      withEventListener('pointerdown', event => blockEvent(event)),
      withEventListener('mousedown', event => blockEvent(event)),
    );
  }),
);
