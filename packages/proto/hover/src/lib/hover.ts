import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { ProtoHost, Resolvable } from '@terseware/proto';

// ── Global touch detection ──────────────────────────────────────────────────
// Tracks whether emulated mouse events should be globally ignored.
// After a touch event, the flag stays true for 50ms to suppress the emulated
// mouseenter that iOS fires immediately after a pointerup/touchend.

@Injectable({ providedIn: 'root' })
class GlobalPointerEvents {
  readonly #doc = inject(DOCUMENT);

  #globalIgnoreMouseEvents = false;
  #touchTimeout: ReturnType<typeof setTimeout> | undefined;

  get globalIgnoreMouseEvents(): boolean {
    return this.#globalIgnoreMouseEvents;
  }

  constructor() {
    this.#doc.addEventListener('pointerup', this.#onGlobalPointerUp, {
      capture: true,
      passive: true,
    });
    this.#doc.addEventListener('touchend', this.#ignoreEmulatedMouse, {
      capture: true,
      passive: true,
    });
  }

  #ignoreEmulatedMouse(): void {
    this.#globalIgnoreMouseEvents = true;
    clearTimeout(this.#touchTimeout);
    this.#touchTimeout = setTimeout(() => (this.#globalIgnoreMouseEvents = false), 50);
  }

  #onGlobalPointerUp(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.#ignoreEmulatedMouse();
    }
  }
}

@Resolvable()
export class HoverProto {
  readonly #host = inject(ProtoHost);
  readonly #globalPointerEvents = inject(GlobalPointerEvents);

  get globalIgnoreMouseEvents(): boolean {
    return this.#globalPointerEvents.globalIgnoreMouseEvents;
  }

  readonly disabled = signal(false);
  readonly #isHovered = signal(false);
  readonly isHovered = this.#isHovered.asReadonly();

  constructor() {
    this.#host.bindAttr('data-hover', () => (!this.disabled() && this.isHovered() ? '' : null));

    this.#host.on('pointerenter', ({ event, next }) => {
      !this.disabled() && this.#onPointerEnter(event);
      next(event);
    });

    this.#host.on('pointerleave', ({ event, next }) => {
      !this.disabled() && this.#onPointerLeave(event);
      next(event);
    });

    this.#host.on('touchstart', ({ event, next }) => {
      !this.disabled() && this.#onTouchStart();
      next(event);
    });

    this.#host.on('mouseenter', ({ event, next }) => {
      !this.disabled() && this.#onMouseEnter(event);
      next(event);
    });

    this.#host.on('mouseleave', ({ event, next }) => {
      !this.disabled() && this.#onMouseLeave(event);
      next(event);
    });
  }

  #localIgnoreMouseEvents = false;

  #onHoverBegin(event: Event, pointerType: string): void {
    if (pointerType === 'touch' || this.isHovered()) {
      return;
    }

    if (!(event.currentTarget as Element)?.contains(event.target as Element)) {
      return;
    }

    this.#isHovered.set(true);
  }

  #onHoverFinished(pointerType: string): void {
    if (pointerType === 'touch' || !this.isHovered()) {
      return;
    }

    this.#isHovered.set(false);
  }

  #onPointerEnter(event: PointerEvent): void {
    if (this.globalIgnoreMouseEvents && event.pointerType === 'mouse') {
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
    if (!this.#localIgnoreMouseEvents && !this.globalIgnoreMouseEvents) {
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
