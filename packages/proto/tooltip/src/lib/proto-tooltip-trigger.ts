import type { Signal, Type } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  DOCUMENT,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Anchor } from '@terseware/proto/anchor';
import { Focus } from '@terseware/proto/focus';
import { Hover } from '@terseware/proto/hover';
import {
  disposable,
  ElementRenderer,
  injectElement,
  isNumber,
  isomorphicEffect,
  onChange,
  scoped,
} from '@terseware/utils';
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
  readonly #doc = inject(DOCUMENT);
  readonly #renderer = inject(ElementRenderer);
  readonly #anchor = inject(Anchor);
  readonly #hover = inject(Hover);
  readonly #focus = inject(Focus);
  readonly element = injectElement();

  readonly anchorName = this.#anchor.name;

  readonly content = model<
    Type<unknown> | TemplateRef<{ $implicit: ProtoTooltipTrigger }> | null | undefined
  >(null, { alias: 'protoTooltipTrigger' });

  readonly tooltipOpen = model<boolean>(false);
  readonly tooltipShowDelay = input<number>(600);
  readonly tooltipHideDelay = input<number>(0);
  readonly tooltipSide = input<TooltipSide>('top');
  readonly tooltipOffset = input<string, string | number>('0px', {
    transform: v => (isNumber(v) ? `${v}px` : v || '0px'),
  });

  readonly gap = computed(() => {
    const offset = this.tooltipOffset();
    const size = this.arrow()?.arrowSize() ?? '0px';
    // Theoretically this should be sqrt(2)/2, but it looks better with 0.8
    return `calc(${offset} + ${size} * 0.8)`;
  });

  readonly #tooltip = signal<ProtoTooltip | null>(null);
  readonly tooltip = this.#tooltip.asReadonly();
  setTooltip(tooltip: ProtoTooltip, injector?: Injector | null | undefined): () => void {
    return disposable(this.setTooltip, injector, () => {
      this.#tooltip.set(tooltip);
      return () => this.#tooltip.set(null);
    });
  }

  readonly #arrow = signal<ProtoTooltipArrow | null>(null);
  readonly arrow = this.#arrow.asReadonly();
  setArrow(arrow: ProtoTooltipArrow, injector?: Injector | null | undefined): () => void {
    return disposable(this.setArrow, injector, () => {
      this.#arrow.set(arrow);
      return () => this.#arrow.set(null);
    });
  }

  readonly tooltipSideFlip = computed(() => sideFlip[this.tooltipSide()]);
  readonly align = computed(() => this.tooltip()?.align() || null);

  readonly #isInstant = signal(false);
  readonly isInstant = this.#isInstant.asReadonly();

  readonly #hoverSources = signal([linkedSignal(() => this.#hover.isHovered())]);

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

    isomorphicEffect({
      earlyRead: () => this.tooltip()?.id,
      write: tooltipId => {
        const id = tooltipId();
        id && scoped(() => this.#renderer.addAttr(this.element, 'aria-describedby', id));
      },
    });

    this.#setupListeners();
  }

  addHoverSource(source: Signal<boolean>, injector?: Injector | null | undefined): () => void {
    return disposable(this.addHoverSource, injector, () => {
      const ctrl = linkedSignal(source);
      this.#hoverSources.update(src => [...src, ctrl]);
      return () => this.#hoverSources.update(src => src.filter(s => s !== ctrl));
    });
  }

  #setupListeners() {
    this.#renderer.listen(this.#doc, 'keydown', event => {
      if (event.key === 'Escape') {
        this.#isInstant.set(true);
        setTimeout(() => this.tooltipOpen.set(false));
      }
    });

    this.#renderer.listen(this.#doc, 'click', () => {
      this.#isInstant.set(true);
      setTimeout(() => this.tooltipOpen.set(false));
    });

    this.#renderer.listen(this.element, 'pointerdown', () => {
      // Reset hover sources to prevent tooltip from showing if the user immediately clicks away
      this.#hoverSources().forEach(source => source.set(false));
      this.#isInstant.set(true);
      setTimeout(() => this.tooltipOpen.set(false));
    });

    onChange(this.#focus.isFocusVisible, focused => {
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
    'aria-hidden': 'true',
    '[style.--trigger]': 'triggerAnchorName',
    '[style.--tooltip]': 'tooltipAnchorName()',
    '[style.--gap]': 'gap()',
    '[style.--side]': 'side()',
    '[attr.data-align]': 'align()',
  },
  styles: `
    :host {
      --hover-buffer: 6px;
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
      width: calc(var(--hover-buffer) + anchor-size(var(--tooltip) width));
      height: calc(var(--hover-buffer) + anchor-size(var(--tooltip) height) + var(--gap));
    }
    :host[data-align='left'],
    :host[data-align='right'] {
      width: calc(var(--hover-buffer) + anchor-size(var(--tooltip) width) + var(--gap));
      height: calc(
        var(--hover-buffer) +
          min(anchor-size(var(--tooltip) height), anchor-size(var(--trigger) height))
      );
    }
  `,
})
class TooltipHoverContainer {
  readonly trigger = inject(ProtoTooltipTrigger);
  readonly hover = inject(Hover);
  readonly align = this.trigger.align;

  readonly triggerAnchorName = this.trigger.anchorName;
  readonly tooltipAnchorName = computed(() => this.trigger.tooltip()?.anchorName || null);
  readonly gap = this.trigger.gap;
  readonly side = this.trigger.tooltipSide;

  constructor() {
    this.trigger.addHoverSource(this.hover.isHovered);
  }
}
