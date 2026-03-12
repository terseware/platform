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
  linkedSignal,
  model,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ProtoHost } from '@terseware/proto';
import { Anchor } from '@terseware/proto/anchor';
import { FocusProto } from '@terseware/proto/focus';
import { HoverProto } from '@terseware/proto/hover';
import { injectElement, isNumber, isomorphicEffect, onChange } from '@terseware/utils';
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
  readonly #host = inject(ProtoHost);
  readonly #hover = inject(HoverProto);
  readonly #focus = inject(FocusProto);

  readonly element = injectElement();
  readonly anchorName = inject(Anchor).name;

  readonly content = model<Type<unknown> | TemplateRef<{ $implicit: ProtoTooltipTrigger }> | null>(
    null,
    { alias: 'protoTooltipTrigger' },
  );

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
  setTooltip(tooltip: ProtoTooltip): () => void {
    this.#tooltip.set(tooltip);
    return () => this.#tooltip.set(null);
  }

  readonly #arrow = signal<ProtoTooltipArrow | null>(null);
  readonly arrow = this.#arrow.asReadonly();
  setArrow(arrow: ProtoTooltipArrow): () => void {
    this.#arrow.set(arrow);
    return () => this.#arrow.set(null);
  }

  readonly tooltipSideFlip = computed(() => sideFlip[this.tooltipSide()]);
  readonly align = computed(() => this.tooltip()?.align() || null);

  readonly #isInstant = signal(false);
  readonly isInstant = this.#isInstant.asReadonly();

  // #openTimeoutId: ReturnType<typeof setTimeout> | null = null;

  #set(data: { isInstant: boolean; tooltipOpen: boolean }): void {
    this.#isInstant.set(data.isInstant);
    this.tooltipOpen.set(data.tooltipOpen);
    // this.#openTimeoutId && clearTimeout(this.#openTimeoutId);
    // this.#openTimeoutId = setTimeout(() => this.tooltipOpen.set(data.tooltipOpen));
  }

  readonly #hoverSources = signal([linkedSignal(() => this.#hover.isHovered())]);
  addHoverSource(source: Signal<boolean>): () => void {
    const ctrl = linkedSignal(source);
    this.#hoverSources.update(src => [...src, ctrl]);
    return () => this.#hoverSources.update(src => src.filter(s => s !== ctrl));
  }

  constructor() {
    // onDestroy(() => this.#openTimeoutId && clearTimeout(this.#openTimeoutId));

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

      const hoverContainer = this.#vcr.createComponent(TooltipContainer, {
        injector: this.#injector,
      });

      onCleanup(() => {
        hoverContainer.destroy();
        ref.destroy();
      });
    });

    isomorphicEffect({
      write: onCleanup => {
        const id = this.tooltip()?.id || null;
        const removeAttr = this.#host.arrayAttr('aria-describedby', id);
        onCleanup(() => removeAttr());
      },
    });

    this.#host.docEvent('keydown', event => {
      if (event.key === 'Escape') {
        this.#set({ isInstant: true, tooltipOpen: false });
      }
    });

    this.#host.docEvent('click', () => {
      this.#set({ isInstant: true, tooltipOpen: false });
    });

    this.#host.on('pointerdown', ({ event, next }) => {
      // Reset hover sources to prevent tooltip from showing if the user immediately clicks away
      this.#hoverSources().forEach(source => source.set(false));
      this.#set({ isInstant: true, tooltipOpen: false });
      next(event);
    });

    onChange(this.#focus.isFocusVisible, focused => {
      this.#set({ isInstant: true, tooltipOpen: focused });
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
        this.#set({ isInstant: false, tooltipOpen: open });
      });
  }
}

@Component({
  selector: 'proto-tooltip-container',
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
class TooltipContainer {
  readonly trigger = inject(ProtoTooltipTrigger);
  readonly hover = inject(HoverProto);
  readonly align = this.trigger.align;

  readonly triggerAnchorName = this.trigger.anchorName;
  readonly tooltipAnchorName = computed(() => this.trigger.tooltip()?.anchorName || null);
  readonly gap = this.trigger.gap;
  readonly side = this.trigger.tooltipSide;

  constructor() {
    this.trigger.addHoverSource(this.hover.isHovered);
  }
}
