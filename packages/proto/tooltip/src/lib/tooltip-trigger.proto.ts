import type { Signal, Type } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  linkedSignal,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { on, ProtoHost, Resolvable, resolve } from '@terseware/proto';
import { AnchorProto } from '@terseware/proto/anchor';
import { FocusProto } from '@terseware/proto/focus';
import { HoverProto } from '@terseware/proto/hover';
import { injectElement, isomorphicEffect, onChange } from '@terseware/utils';
import { debounce, skip, timer } from 'rxjs';
import type { TooltipArrowProto } from './tooltip-arrow.proto';
import type { TooltipProto } from './tooltip.proto';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

const sideFlip: Record<TooltipSide, TooltipSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

@Resolvable()
export class TooltipTriggerProto {
  readonly #vcr = inject(ViewContainerRef);
  readonly #injector = inject(Injector);
  readonly #host = inject(ProtoHost);
  readonly #hover = resolve(HoverProto);
  readonly #focus = resolve(FocusProto);

  readonly element = injectElement();
  readonly anchorName = resolve(AnchorProto).name;

  readonly content = signal<Type<unknown> | TemplateRef<{ $implicit: TooltipTriggerProto }> | null>(
    null,
  );

  readonly tooltipOpen = signal<boolean>(false);
  readonly tooltipShowDelay = signal<number>(600);
  readonly tooltipHideDelay = signal<number>(0);
  readonly tooltipSide = signal<TooltipSide>('top');
  readonly tooltipOffset = signal<string>('0px');

  readonly gap = computed(() => {
    const offset = this.tooltipOffset();
    const size = this.arrow()?.arrowSize() ?? '0px';
    // Theoretically this should be sqrt(2)/2, but it looks better with 0.8
    return `calc(${offset} + ${size} * 0.8)`;
  });

  readonly #tooltip = signal<TooltipProto | null>(null);
  readonly tooltip = this.#tooltip.asReadonly();
  setTooltip(tooltip: TooltipProto): () => void {
    this.#tooltip.set(tooltip);
    return () => this.#tooltip.set(null);
  }

  readonly #arrow = signal<TooltipArrowProto | null>(null);
  readonly arrow = this.#arrow.asReadonly();
  setArrow(arrow: TooltipArrowProto): () => void {
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

    on('pointerdown', ({ event, next }) => {
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
  readonly trigger = inject(TooltipTriggerProto);
  readonly hover = resolve(HoverProto);
  readonly align = this.trigger.align;

  readonly triggerAnchorName = this.trigger.anchorName;
  readonly tooltipAnchorName = computed(() => this.trigger.tooltip()?.anchorName || null);
  readonly gap = this.trigger.gap;
  readonly side = this.trigger.tooltipSide;

  constructor() {
    this.trigger.addHoverSource(this.hover.isHovered);
  }
}
