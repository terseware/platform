import { afterNextRender, inject, Renderer2 } from '@angular/core';
import {
  signalStore,
  signalStoreFeature,
  withComputed,
  withFeature,
  withHooks,
  withMethods,
  withProps,
} from '@ngrx/signals';
import {
  injectElementRef,
  isNativeAnchorTag,
  isNativeButtonTag,
  isNativeInputTag,
  isNull,
  withEventListener,
} from '@terseware/proto/utils';
import { DisableBehavior } from './disable.behavior';

export const ButtonBehavior = signalStore(
  withProps(() => {
    const _disableBehavior = inject(DisableBehavior, { optional: true });
    if (!_disableBehavior) {
      throw new Error('ButtonBehavior: Provided DisableBehavior is required');
    }
    const _elementRef = injectElementRef();
    return { _disableBehavior, _elementRef };
  }),
  withMethods(({ _elementRef }) => ({
    _getRoleAttr: () => _elementRef.nativeElement.getAttribute('role'),
    _getTypeAttr: () => _elementRef.nativeElement.getAttribute('type'),
    _nativeButton: () => isNativeButtonTag(_elementRef.nativeElement),
    _nativeAnchor: () => isNativeAnchorTag(_elementRef.nativeElement, { validLink: true }),
    _nativeInput: () =>
      isNativeInputTag(_elementRef.nativeElement, {
        types: ['button', 'submit', 'reset', 'image'],
      }),
  })),
  withComputed(store => ({ _disabled: store._disableBehavior.disabled })),
  withHooks({
    onInit(store) {
      const renderer = inject(Renderer2);

      afterNextRender({
        earlyRead() {
          const roleAttr = store._getRoleAttr();
          if (!isNull(roleAttr)) {
            return false;
          }
          if (store._nativeButton() || store._nativeInput() || store._nativeAnchor()) {
            return false;
          }
          return true;
        },
        write(setRoleToButton) {
          if (setRoleToButton) {
            renderer.setAttribute(store._elementRef.nativeElement, 'role', 'button');
          }
        },
      });

      afterNextRender({
        earlyRead() {
          const typeAttr = store._getTypeAttr();
          if (!isNull(typeAttr)) {
            return false;
          }
          return store._nativeButton();
        },
        write(setTypeToButton) {
          if (setTypeToButton) {
            renderer.setAttribute(store._elementRef.nativeElement, 'type', 'button');
          }
        },
      });
    },
  }),
  withFeature(store =>
    signalStoreFeature(
      withEventListener('keydown', event => {
        // Only handle direct events (not bubbled from children) on non-native elements
        const shouldClick =
          event.target === event.currentTarget &&
          !store._nativeButton() &&
          !store._nativeAnchor() && // Re-check at runtime; routerLink may have added href
          !store._disabled();

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
            store._elementRef.nativeElement.click();
          }
        }
      }),
      withEventListener('keyup', event => {
        if (
          event.target === event.currentTarget &&
          !store._nativeButton() &&
          !store._nativeAnchor() &&
          !store._disabled() &&
          event.key === ' '
        ) {
          store._elementRef.nativeElement.click();
        }
      }),
    ),
  ),
);
