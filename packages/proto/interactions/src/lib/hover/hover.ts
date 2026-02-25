import { effect, isDevMode, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { runInDestroyer } from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';

// ── Global touch detection ──────────────────────────────────────────────────
// Tracks whether emulated mouse events should be globally ignored.
// After a touch event, the flag stays true for 50ms to suppress the emulated
// mouseenter that iOS fires immediately after a pointerup/touchend.

let _globalIgnoreMouseEvents = false;
let _touchTimeout: ReturnType<typeof setTimeout> | undefined;

function setIgnoreEmulatedMouseEvents(): void {
  _globalIgnoreMouseEvents = true;
  clearTimeout(_touchTimeout);
  _touchTimeout = setTimeout(() => {
    _globalIgnoreMouseEvents = false;
  }, 50);
}

function onGlobalPointerUp(event: PointerEvent): void {
  if (event.pointerType === 'touch') {
    setIgnoreEmulatedMouseEvents();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerup', onGlobalPointerUp, { capture: true, passive: true });
  document.addEventListener('touchend', setIgnoreEmulatedMouseEvents, {
    capture: true,
    passive: true,
  });
}

@Resolvable()
export class Hover {
  #localIgnoreMouseEvents = false;

  readonly disabled = bindable(false);
  readonly isHovered = signal(false);

  constructor() {
    hostBinding('attr.data-hover', () => (!this.disabled() && this.isHovered() ? '' : null));

    const createListeners = runInDestroyer(() => {
      hostBinding('(pointerenter)', event => this.#onPointerEnter(event));
      hostBinding('(pointerleave)', event => this.#onPointerLeave(event));
      hostBinding('(touchstart)', () => this.#onTouchStart());
      hostBinding('(mouseenter)', event => this.#onMouseEnter(event));
      hostBinding('(mouseleave)', event => this.#onMouseLeave(event));
    });

    effect(onCleanup => {
      if (!this.disabled()) {
        const listeners = createListeners();
        onCleanup(listeners.destroy);
      }
    });
  }

  #onHoverBegin(event: Event, pointerType: string): void {
    if (pointerType === 'touch' || this.isHovered()) {
      return;
    }

    if (!(event.currentTarget as Element)?.contains(event.target as Element)) {
      if (isDevMode()) {
        // eslint-disable-next-line no-console
        console.warn('ProtoHover: pointerenter target is outside currentTarget — event ignored', {
          currentTarget: event.currentTarget,
          target: event.target,
        });
      }
      return;
    }

    this.isHovered.set(true);
  }

  #onHoverFinished(pointerType: string): void {
    if (pointerType === 'touch' || !this.isHovered()) {
      return;
    }

    this.isHovered.set(false);
  }

  #onPointerEnter(event: PointerEvent): void {
    if (_globalIgnoreMouseEvents && event.pointerType === 'mouse') {
      return;
    }

    this.#onHoverBegin(event, event.pointerType);
  }

  #onPointerLeave(event: PointerEvent): void {
    if ((event.currentTarget as Element)?.contains(event.target as Element)) {
      this.#onHoverFinished(event.pointerType);
    }
  }

  #onTouchStart(): void {
    this.#localIgnoreMouseEvents = true;
  }

  #onMouseEnter(event: MouseEvent): void {
    if (!this.#localIgnoreMouseEvents && !_globalIgnoreMouseEvents) {
      this.#onHoverBegin(event, 'mouse');
    }

    this.#localIgnoreMouseEvents = false;
  }

  #onMouseLeave(event: MouseEvent): void {
    if ((event.currentTarget as Element)?.contains(event.target as Element)) {
      this.#onHoverFinished('mouse');
    }
  }
}
