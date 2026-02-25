import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import { unwrap } from '@terseware/proto/utils';
import {
  ProtoPatternBase,
  type ProtoPatternOptions,
  type ProtoPatternPatternFields,
} from './proto-pattern';

// ── Global touch detection ──────────────────────────────────────────────────
// Tracks whether the last interaction was touch-based. After a touch event,
// the flag stays true for 50ms to suppress the emulated mouseenter that iOS
// fires immediately after a pointerup/touchend.

let _isTouchDevice = false;
let _touchTimeout: ReturnType<typeof setTimeout> | undefined;

function onGlobalPointerUp(event: PointerEvent): void {
  if (event.pointerType !== 'touch') return;
  _isTouchDevice = true;
  clearTimeout(_touchTimeout);
  _touchTimeout = setTimeout(() => {
    _isTouchDevice = false;
  }, 50);
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerup', onGlobalPointerUp, { capture: true, passive: true });
}

export type HoverPatternInputs = {
  readonly disabled?: Signal<boolean>;
};

export class HoverPattern
  extends ProtoPatternBase
  implements ProtoPatternPatternFields<HoverPattern>
{
  readonly disabled: Signal<boolean>;
  readonly _isHovered: WritableSignal<boolean>;
  readonly isHovered: Signal<boolean>;

  constructor(
    protected readonly inputs: HoverPatternInputs = {},
    protected override readonly options: ProtoPatternOptions = {},
  ) {
    super(options);
    this.disabled = computed(() => unwrap(inputs.disabled) ?? false);
    this._isHovered = signal(false);
    this.isHovered = this._isHovered.asReadonly();
  }

  readonly 'attr.data-hover' = computed(() => (!this.disabled() && this._isHovered() ? '' : null));

  ['evt.mouseenter'](): void {
    if (this.disabled() || _isTouchDevice) return;
    this._isHovered.set(true);
  }

  ['evt.mouseleave'](): void {
    if (_isTouchDevice) return;
    this._isHovered.set(false);
  }
}
