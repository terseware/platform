import type { Signal, Type } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  effect,
  inject,
  Injector,
  input,
  model,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { resolve, SharedAttributes } from '@terseware/proto';
import { Anchor } from '@terseware/proto/anchor';
import { Focus, Hover } from '@terseware/proto/interactions';
import { injectElement, isNumber, onChange, onDestroy } from '@terseware/proto/internal';
import { hostBinding } from '@terseware/proto/utils';
import { debounce, skip, timer } from 'rxjs';
import type { ProtoTooltip } from './proto-tooltip';
import type { ProtoTooltipArrow } from './proto-tooltip-arrow';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

const sideFlip: Record<TooltipSide, TooltipSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

@Directive({
  selector: '[protoTooltipTrigger]',
  exportAs: 'protoTooltipTrigger',
})
export class ProtoTooltipTrigger {
  readonly #vcr = inject(ViewContainerRef);
  readonly #injector = inject(Injector);
  readonly #anchor = resolve(Anchor);
  readonly #hover = resolve(Hover);
  readonly #focus = resolve(Focus);
  readonly element = injectElement();
  readonly sharedAttr = resolve(SharedAttributes);

  readonly anchorName = this.#anchor.name;

  readonly content = model<
    Type<unknown> | TemplateRef<{ $implicit: ProtoTooltipTrigger }> | null | undefined
  >(null, { alias: 'protoTooltipTrigger' });

  readonly tooltipOpen = model<boolean>(false);
  readonly tooltipShowDelay = input<number>(600);
  readonly tooltipHideDelay = input<number>(0);
  readonly tooltipSide = input<TooltipSide>('left');
  readonly tooltipOffset = input<string, string | number>('0px', {
    transform: v => (isNumber(v) ? `${v}px` : v || '0px'),
  });

  readonly gap = computed(() => {
    const offset = this.tooltipOffset();
    const size = this.arrow()?.arrowSize() ?? '0px';
    const sizeHalf = this.arrow()?.sizeHalf() ?? '0px';
    return `calc(${offset} + calc(${size} + ${sizeHalf}) / 2)`;
  });

  readonly tooltip = signal<ProtoTooltip | null>(null);
  readonly arrow = signal<ProtoTooltipArrow | null>(null);
  readonly tooltipSideFlip = computed(() => sideFlip[this.tooltipSide()]);
  readonly align = computed(() => this.tooltip()?.align() || null);

  readonly #isInstant = signal(false);
  readonly isInstant = this.#isInstant.asReadonly();

  readonly #hoverSources = signal([this.#hover.isHovered.asReadonly()]);

  constructor() {
    effect(onCleanup => {
      const isOpen = this.tooltipOpen();
      const content = this.content();

      if (!isOpen || !content) {
        return;
      }

      const ref =
        content instanceof TemplateRef
          ? this.#vcr.createEmbeddedView(content, { $implicit: this }, { injector: this.#injector })
          : this.#vcr.createComponent(content, { injector: this.#injector });

      const hoverContainer = this.#vcr.createComponent(TooltipHoverContainer, {
        injector: this.#injector,
      });

      onCleanup(() => {
        hoverContainer.destroy();
        ref.destroy();
      });
    });

    this.#setupListeners();
  }

  addHoverSource(source: Signal<boolean>): () => void {
    this.#hoverSources.update(sources => [...sources, source]);
    return () => {
      this.#hoverSources.update(sources => sources.filter(s => s !== source));
    };
  }

  #setupListeners() {
    hostBinding(
      '(keydown)',
      event => {
        if (event.key === 'Escape') {
          this.#isInstant.set(true);
          setTimeout(() => this.tooltipOpen.set(false));
        }
      },
      { document: true },
    );

    hostBinding('(pointerdown)', () => {
      this.#isInstant.set(true);
      setTimeout(() => this.tooltipOpen.set(false));
    });

    onChange(this.#focus.isFocused, focused => {
      this.#isInstant.set(true);
      setTimeout(() => this.tooltipOpen.set(focused));
    });

    toObservable(computed(() => this.#hoverSources().some(s => s())))
      .pipe(
        debounce(() =>
          timer(this.tooltipOpen() ? this.tooltipHideDelay() : this.tooltipShowDelay()),
        ),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(open => {
        this.#isInstant.set(false);
        setTimeout(() => this.tooltipOpen.set(open));
      });
  }
}

@Component({
  selector: 'proto-tooltip-hover-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  host: {
    tabindex: '-1',
    'aria-hidden': 'true',
    '[style.--trigger]': 'triggerAnchorName',
    '[style.--tooltip]': 'tooltipAnchorName()',
    '[style.--gap]': 'gap()',
    '[style.--side]': 'side()',
    '[attr.data-align]': 'align()',
  },
  styles: `
    :host {
      container-type: anchored;
      position-anchor: var(--trigger);
      position-area: var(--side);
      position-try-fallbacks:
        flip-block,
        flip-inline,
        flip-block flip-inline;
      position: fixed;
    }
    :host[data-align='top'],
    :host[data-align='bottom'] {
      width: calc(8px + anchor-size(var(--tooltip) width));
      height: calc(4px + anchor-size(var(--tooltip) height) + var(--gap));
    }
    :host[data-align='left'],
    :host[data-align='right'] {
      width: calc(4px + anchor-size(var(--tooltip) width) + var(--gap));
      height: calc(
        8px + min(anchor-size(var(--tooltip) height), anchor-size(var(--trigger) height))
      );
    }
  `,
})
class TooltipHoverContainer {
  readonly trigger = inject(ProtoTooltipTrigger);
  readonly hover = resolve(Hover);
  readonly align = this.trigger.align;

  readonly triggerAnchorName = this.trigger.anchorName;
  readonly tooltipAnchorName = computed(() => this.trigger.tooltip()?.anchorName || null);
  readonly gap = this.trigger.gap;
  readonly side = this.trigger.tooltipSide;

  constructor() {
    onDestroy(this.trigger.addHoverSource(this.hover.isHovered));
  }
}
