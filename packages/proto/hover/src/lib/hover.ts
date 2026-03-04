import { DOCUMENT, inject, Injectable, isDevMode, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { ElementRenderer, injectElement, isomorphicEffect } from '@terseware/utils';

// ── Global touch detection ──────────────────────────────────────────────────
// Tracks whether emulated mouse events should be globally ignored.
// After a touch event, the flag stays true for 50ms to suppress the emulated
// mouseenter that iOS fires immediately after a pointerup/touchend.

@Injectable({ providedIn: 'root' })
class GlobalPointerEvents {
  #globalIgnoreMouseEvents = false;
  #touchTimeout: ReturnType<typeof setTimeout> | undefined;

  get globalIgnoreMouseEvents(): boolean {
    return this.#globalIgnoreMouseEvents;
  }

  constructor() {
    const doc = inject(DOCUMENT);
    doc.addEventListener('pointerup', this.#onGlobalPointerUp, { capture: true, passive: true });
    doc.addEventListener('touchend', this.#ignoreEmulatedMouse, { capture: true, passive: true });
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
export class Hover {
  readonly #globalPointerEvents = inject(GlobalPointerEvents);

  get globalIgnoreMouseEvents(): boolean {
    return this.#globalPointerEvents.globalIgnoreMouseEvents;
  }

  readonly disabled = signal(false);
  readonly #isHovered = signal(false);
  readonly isHovered = this.#isHovered.asReadonly();

  constructor() {
    const el = injectElement();
    const renderer = inject(ElementRenderer);

    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.isHovered(),
      write: hovered => renderer.setAttr(el, 'data-hover', hovered() ? '' : null),
    });

    renderer.listen(el, 'pointerenter', e => !this.disabled() && this.#onPointerEnter(e));
    renderer.listen(el, 'pointerleave', e => !this.disabled() && this.#onPointerLeave(e));
    renderer.listen(el, 'touchstart', () => !this.disabled() && this.#onTouchStart());
    renderer.listen(el, 'mouseenter', e => !this.disabled() && this.#onMouseEnter(e));
    renderer.listen(el, 'mouseleave', e => !this.disabled() && this.#onMouseLeave(e));
  }

  #localIgnoreMouseEvents = false;

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
