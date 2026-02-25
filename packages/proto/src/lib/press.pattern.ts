import type { Injector } from '@angular/core';
import {
  computed,
  DOCUMENT,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { listener, type SignalLike, unwrap } from '@terseware/proto/utils';
import {
  ProtoPatternBase,
  type ProtoPatternOptions,
  type ProtoPatternPatternFields,
} from './proto-pattern';

export type PressPatternInputs = {
  readonly element?: HTMLElement;
  readonly disabled?: SignalLike<boolean>;
  readonly injector?: Injector;
};

export class PressPattern
  extends ProtoPatternBase
  implements ProtoPatternPatternFields<PressPattern>
{
  protected readonly document: Document;

  private disposableListeners: (() => void)[] = [];

  readonly disabled: Signal<boolean>;
  readonly _isPressed: WritableSignal<boolean>;
  readonly isPressed: Signal<boolean>;

  constructor(
    protected readonly inputs: PressPatternInputs = {},
    protected override readonly options: ProtoPatternOptions = {},
  ) {
    super(options);
    this.document = this.element.ownerDocument ?? inject(DOCUMENT);
    this.disabled = computed(() => unwrap(inputs.disabled) ?? false);
    this._isPressed = signal(false);
    this.isPressed = this._isPressed.asReadonly();
  }

  readonly 'attr.data-press' = computed(() => (!this.disabled() && this._isPressed() ? '' : null));

  private reset(): void {
    if (!this._isPressed()) return;
    this.disposableListeners.forEach(dispose => dispose());
    this._isPressed.set(false);
  }

  ['evt.pointerdown'](): void {
    this.disposableListeners.forEach(dispose => dispose());
    if (this.disabled()) return;
    this._isPressed.set(true);

    this.disposableListeners = [
      listener(this.document, 'pointerup', () => this.reset(), {
        injector: this.injector,
      }),
      listener(
        this.document,
        'pointermove',
        event => {
          if (this.element !== event.target && !this.element.contains(event.target as Node)) {
            this.reset();
          }
        },
        {
          injector: this.injector,
        },
      ),
      listener(this.document, 'pointercancel', () => this.reset(), {
        injector: this.injector,
      }),
    ];
  }
}
