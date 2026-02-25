import { CdkPortalOutlet, ComponentPortal, DomPortal, TemplatePortal } from '@angular/cdk/portal';
import type { Signal, Type } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Resolvable, resolve } from '@terseware/proto';
import type { PositionTryFallback } from '@terseware/proto/anchor';
import { Anchor, AnchorTarget } from '@terseware/proto/anchor';
import { Focus, Hover } from '@terseware/proto/interactions';
import { onChange, uniqueId } from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';
import { debounce, timer } from 'rxjs';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export const TOOLTIP_SIDE_FLIP = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
} as const satisfies Record<TooltipSide, TooltipSide>;
const FLIP_FALLBACK: Record<TooltipSide, PositionTryFallback[]> = {
  top: ['flip-inline', 'bottom'],
  bottom: ['flip-inline', 'top'],
  left: ['flip-inline', 'right'],
  right: ['flip-inline', 'left'],
};

export type TooltipContent = TemplateRef<unknown> | Type<unknown> | HTMLElement | null;

@Resolvable()
export class TooltipTrigger {
  readonly #vcr = inject(ViewContainerRef);
  readonly #injector = inject(Injector);
  readonly #hover = inject(Hover);
  readonly #focus = inject(Focus);

  readonly anchorName = resolve(AnchorTarget).anchorName;
  readonly tooltipId = uniqueId('tooltip');

  readonly content = bindable<TooltipContent>(null);
  readonly side = bindable<TooltipSide>('top');
  readonly offsetX = bindable<number>(0);
  readonly offsetY = bindable<number>(0);
  readonly showDelay = bindable<number>(600);
  readonly hideDelay = bindable<number>(0);

  readonly open = signal(false);

  readonly #isInstant = signal(false);
  readonly isInstant = this.#isInstant.asReadonly();

  readonly #hoverSources = signal([this.#hover.isHovered.asReadonly()]);

  constructor() {
    hostBinding('attr.aria-describedby', () => (this.open() ? this.tooltipId : null));

    onChange(this.#focus.isFocusVisible, isFocusVisible => {
      this.open.set(isFocusVisible);
    });

    hostBinding(
      '(keydown)',
      event => {
        if (event.key === 'Escape') {
          this.open.set(false);
        }
      },
      { document: true },
    );

    hostBinding('(pointerdown)', () => {
      this.open.set(false);
    });

    effect(onCleanup => {
      if (this.open()) {
        const ref = this.#vcr.createComponent(ProtoTooltipContainer, { injector: this.#injector });
        ref.changeDetectorRef.detectChanges();
        onCleanup(() => ref.destroy());
      }
    });

    toObservable(computed(() => this.#hoverSources().some(s => s())))
      .pipe(
        debounce(() => timer(this.open() ? this.hideDelay() : this.showDelay())),
        takeUntilDestroyed(),
      )
      .subscribe(open => {
        this.#isInstant.set(false);
        this.open.set(open);
      });
  }

  addHoverSource(source: Signal<boolean>): () => void {
    this.#hoverSources.update(sources => [...sources, source]);
    return () => {
      this.#hoverSources.update(sources => sources.filter(s => s !== source));
    };
  }
}

@Component({
  selector: 'proto-tooltip-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkPortalOutlet],
  template: `<ng-container [cdkPortalOutlet]="outlet()" />`,
  host: {
    '[attr.id]': 'tooltipId',
    '[style.padding.px]': '(arrowSize() / 2) + offsetX()',
  },
})
class ProtoTooltipContainer {
  readonly #vcr = inject(ViewContainerRef);
  readonly #trigger = inject(TooltipTrigger);
  readonly #hover = inject(Hover);

  readonly tooltipId = this.#trigger.tooltipId;
  readonly offsetX = input<number>(9);
  readonly offsetY = input<number>(9);
  readonly arrowSize = signal<number>(0);

  readonly outlet = computed(() => {
    const content = this.#trigger.content();
    if (!content) {
      return null;
    }
    if (content instanceof TemplateRef) {
      return new TemplatePortal(content, this.#vcr);
    }
    if (content instanceof HTMLElement) {
      return new DomPortal(content);
    }
    return new ComponentPortal(content, this.#vcr);
  });

  constructor() {
    resolve(Anchor, {
      anchorName: this.#trigger.anchorName,
      positionTryFallbacks: computed(() => FLIP_FALLBACK[this.#trigger.side()]),
      positionArea: this.#trigger.side,
      offsetX: this.#trigger.offsetX,
      offsetY: this.#trigger.offsetY,
    });

    hostBinding('attr.data-instant', () => (this.#trigger.isInstant() ? '' : null));

    effect(onCleanup => {
      const removeHover = this.#trigger.addHoverSource(this.#hover.isHovered);
      onCleanup(removeHover);
    });

    console.log('host', inject(ElementRef, { optional: true, host: true })?.nativeElement);
    console.log('self', inject(ElementRef, { optional: true, self: true })?.nativeElement);
    console.log('skipSelf', inject(ElementRef, { optional: true, skipSelf: true })?.nativeElement);

    let i = 0;
    let inj = inject(Injector, { optional: true });
    while ((inj &&= inj.get(Injector, null, { skipSelf: true })) && i++ < 10) {
      console.log('walk', inj.get(ElementRef, null)?.nativeElement);
    }
  }
}
