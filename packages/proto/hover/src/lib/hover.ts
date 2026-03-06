import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { ElementRenderer, injectElement, isomorphicEffect } from '@terseware/utils';

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
export class Hover {
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly #globalPointerEvents = inject(GlobalPointerEvents);

  get globalIgnoreMouseEvents(): boolean {
    return this.#globalPointerEvents.globalIgnoreMouseEvents;
  }

  readonly disabled = signal(false);
  readonly #isHovered = signal(false);
  readonly isHovered = this.#isHovered.asReadonly();

  constructor() {
    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.isHovered(),
      write: hovered => this.#renderer.setAttr(this.#element, 'data-hover', hovered() ? '' : null),
    });

    this.#renderer.listen(
      this.#element,
      'pointerenter',
      event => !this.disabled() && this.#onPointerEnter(event),
    );
    this.#renderer.listen(
      this.#element,
      'pointerleave',
      event => !this.disabled() && this.#onPointerLeave(event),
    );
    this.#renderer.listen(
      this.#element,
      'touchstart',
      () => !this.disabled() && this.#onTouchStart(),
    );
    this.#renderer.listen(
      this.#element,
      'mouseenter',
      event => !this.disabled() && this.#onMouseEnter(event),
    );
    this.#renderer.listen(
      this.#element,
      'mouseleave',
      event => !this.disabled() && this.#onMouseLeave(event),
    );
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
