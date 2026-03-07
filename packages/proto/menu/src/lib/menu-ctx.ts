import type { Type } from '@angular/core';
import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  runInInjectionContext,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { Resolvable, resolve } from '@terseware/proto';
import { Anchor } from '@terseware/proto/anchor';
import { Button } from '@terseware/proto/button';
import { Hover } from '@terseware/proto/hover';
import { Interact } from '@terseware/proto/interact';
import {
  disposable,
  ElementRenderer,
  injectElement,
  isomorphicEffect,
  signalBind,
} from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';

export type MenuSide = 'top' | 'bottom' | 'left' | 'right';

const sideFlip: Record<MenuSide, MenuSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

export type MenuContent = Type<object> | TemplateRef<{ $implicit: MenuCtx }>;

@Resolvable({ resolveIn: 'any' })
// @Resolvable({ ref: () => inject(ProtoMenuTrigger, { host: true }) })
export class MenuCtx {
  readonly #vcr = inject(ViewContainerRef);
  readonly #injector = inject(Injector);
  readonly #renderer = inject(ElementRenderer);
  readonly #element = injectElement();

  readonly button = resolve(Button);
  readonly interact = resolve(Interact);
  readonly anchorName = resolve(Anchor).name;

  readonly content = signal<MenuContent | null>(null);
  readonly expanded = signal(false);
  readonly hasBeenFocused = signal(false);
  readonly offset = signal<string | number>('0px');
  readonly side = signal<MenuSide>('bottom');
  readonly sideFlip = computed(() => sideFlip[this.side()]);
  readonly align = computed(() => this.menu()?.align() || null);
  readonly gap = computed(() => {
    const offset = this.offset();
    const size = /*this.arrow()?.arrowSize() ??*/ '0px';
    // Theoretically this should be sqrt(2)/2, but it looks better with 0.8
    return `calc(${offset} + ${size} * 0.8)`;
  });

  readonly #menu = signal<Menu | null>(null);
  readonly menu = this.#menu.asReadonly();
  setMenu(menu: Menu, injector?: Injector | null | undefined): () => void {
    return disposable(this.setMenu, injector, () => {
      this.#menu.set(menu);
      return () => this.#menu.set(null);
    });
  }

  readonly #items = new SignalSet<MenuItem>();
  addItem(item: MenuItem, injector?: Injector | null | undefined): () => void {
    return disposable(this.addItem, injector, () => {
      this.#items.add(item);
      return () => this.#items.delete(item);
    });
  }

  readonly activeItem = signal<MenuItem | null>(null);

  constructor() {
    signalBind(this.interact.tabIndex, () => (this.expanded() && this.activeItem() ? -1 : 0));
    this.#renderer.listen(this.#element, 'click', () => this.toggle());

    const injector = this.#injector;
    effect(onCleanup => {
      const expanded = this.expanded();
      const content = this.content();

      if (!expanded || !content) {
        return;
      }

      runInInjectionContext(injector, () => {
        const ref =
          content instanceof TemplateRef
            ? this.#vcr.createEmbeddedView(content, { $implicit: this }, { injector })
            : this.#vcr.createComponent(content, { injector });

        const container = this.#vcr.createComponent(MenuContainer, { injector });

        onCleanup(() => {
          container.destroy();
          ref.destroy();
        });
      });
    });
  }

  open(): void {
    this.expanded.set(true);
  }

  close(): void {
    this.expanded.set(false);
  }

  toggle(): void {
    this.expanded.update(open => !open);
  }
}

@Resolvable()
export class Menu {
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly ctx = inject(MenuCtx);
  readonly anchorName = `${this.ctx.anchorName}-menu` as const;

  readonly #align = signal(this.ctx.side());
  readonly align = this.#align.asReadonly();

  constructor() {
    this.ctx.setMenu(this);
    afterEveryRender(() => {
      const style = getComputedStyle(this.#element) as { positionArea?: MenuSide };
      this.#align.update(align => style.positionArea ?? align);
    });

    isomorphicEffect({
      write: () => {
        this.#renderer.styles(this.#element, {
          anchorName: this.anchorName,
          positionAnchor: this.ctx.anchorName,
          containerType: 'anchored',
          positionArea: this.ctx.side(),
          positionTryFallbacks: 'flip-block, flip-inline, flip-block flip-inline',
          position: 'fixed',
          [`margin-${this.ctx.sideFlip()}`]: this.ctx.gap(),
        });
      },
    });
  }
}

@Resolvable()
export class MenuItem {
  readonly ctx = resolve(MenuCtx);
  readonly button = resolve(Button);

  constructor() {
    this.ctx.addItem(this);
  }
}

@Component({
  selector: 'proto-menu-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  host: {
    'aria-hidden': 'true',
    '[style.--trigger]': 'triggerAnchorName',
    '[style.--menu]': 'menuAnchorName()',
    // '[style.--gap]': 'ctx.gap()',
    '[style.--side]': 'ctx.side()',
    '[attr.data-align]': 'ctx.align()',
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
      width: calc(var(--hover-buffer) + anchor-size(var(--menu) width));
      height: calc(var(--hover-buffer) + anchor-size(var(--menu) height) + var(--gap));
    }
    :host[data-align='left'],
    :host[data-align='right'] {
      width: calc(var(--hover-buffer) + anchor-size(var(--menu) width) + var(--gap));
      height: calc(
        var(--hover-buffer) +
          min(anchor-size(var(--menu) height), anchor-size(var(--trigger) height))
      );
    }
  `,
})
class MenuContainer {
  readonly ctx = inject(MenuCtx);
  readonly hover = resolve(Hover);

  readonly triggerAnchorName = this.ctx.anchorName;
  readonly menuAnchorName = computed(() => this.ctx.menu()?.anchorName || null);
}
