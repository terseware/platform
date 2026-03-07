import type { Type } from '@angular/core';
import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
  TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { Resolvable, resolve } from '@terseware/proto';
import { Anchor } from '@terseware/proto/anchor';
import { Button } from '@terseware/proto/button';
import { Focus } from '@terseware/proto/focus';
import { Hover } from '@terseware/proto/hover';
import { Interact } from '@terseware/proto/interact';
import {
  disposable,
  ElementRenderer,
  injectElement,
  isomorphicEffect,
  KeyboardEventManager,
  runInScope,
  signalBind,
} from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';

export type MenuSide =
  | 'top center'
  | 'top span-left'
  | 'top span-right'
  | 'top'
  | 'left center'
  | 'left span-top'
  | 'left span-bottom'
  | 'left'
  | 'bottom center'
  | 'bottom span-left'
  | 'bottom span-right'
  | 'bottom'
  | 'right center'
  | 'right span-top'
  | 'right span-bottom'
  | 'right'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right';

const sideFlip: Record<string, string> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

export type MenuContent = Type<object> | TemplateRef<{ $implicit: MenuCtx }>;

@Resolvable({ resolveIn: 'any' })
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
  readonly side = signal<MenuSide>('right span-bottom');
  readonly align = computed(() => this.menuContainer()?.align() || null);

  readonly #menu = signal<Menu | null>(null);
  readonly menu = this.#menu.asReadonly();
  setMenu(menu: Menu, injector?: Injector | null | undefined): () => void {
    return disposable(this.setMenu, injector, () => {
      this.#menu.set(menu);
      return () => this.#menu.set(null);
    });
  }

  readonly #menuContainer = signal<MenuContainer | null>(null);
  readonly menuContainer = this.#menuContainer.asReadonly();
  setMenuContainer(
    menuContainer: MenuContainer,
    injector?: Injector | null | undefined,
  ): () => void {
    return disposable(this.setMenuContainer, injector, () => {
      this.#menuContainer.set(menuContainer);
      return () => this.#menuContainer.set(null);
    });
  }

  readonly #items = new SignalSet<MenuItem>();
  addItem(item: MenuItem, injector?: Injector | null | undefined): () => void {
    return disposable(this.addItem, injector, () => {
      this.#items.add(item);
      return () => this.#items.delete(item);
    });
  }

  readonly activeItem = computed(() =>
    [...this.#items.values()].find(item => item.focus.isFocused()),
  );

  constructor() {
    signalBind(this.interact.tabIndex, () => (this.expanded() && this.activeItem() ? -1 : 0));
    this.#renderer.listen(this.#element, 'click', () => this.toggle());

    isomorphicEffect({
      write: () => this.#renderer.setAttr(this.#element, 'aria-expanded', `${this.expanded()}`),
    });

    isomorphicEffect({
      write: onCleanup => {
        const id = this.menu()?.id || null;
        runInScope(this.#injector, onCleanup, () =>
          this.#renderer.disposableAttr(this.#element, 'aria-controls', id),
        );
      },
    });

    effect(onCleanup => {
      const expanded = this.expanded();
      const content = this.content();
      if (!expanded || !content) {
        return;
      }
      const container = this.#vcr.createComponent(MenuContainer, { injector: this.#injector });
      onCleanup(() => {
        container.destroy();
      });
    });

    new KeyboardEventManager()
      .on(' ', () => this.open({ first: true }))
      .on('Enter', () => this.open({ first: true }))
      .on('ArrowDown', () => this.open({ first: true }))
      .on('ArrowUp', () => this.open({ last: true }))
      .on('Escape', () => this.close());

    this.#renderer.listen(this.#element, 'focusout', event => {
      console.log(event.target, this.#element);
      if (
        this.expanded() &&
        !this.#element.contains(event.target as Node) &&
        !this.#menu()?.element.contains(event.target as Node) &&
        ![...this.#items.values()].some(item => item.element.contains(event.target as Node))
      ) {
        this.close();
      }
    });
  }

  open(opts?: { first?: boolean; last?: boolean }): void {
    this.expanded.set(true);
    if (opts?.first) {
      this.focusFirst();
    } else if (opts?.last) {
      this.focusLast();
    }
  }

  close(): void {
    this.expanded.set(false);
  }

  toggle(): void {
    this.expanded.update(open => !open);
  }

  focusNext(): void {
    const activeItem = this.activeItem();
    if (activeItem) {
      const index = [...this.#items.values()].indexOf(activeItem);
      [...this.#items.values()].at(index + 1)?.focus.focus();
    }
  }

  focusPrevious(): void {
    const activeItem = this.activeItem();
    if (activeItem) {
      const index = [...this.#items.values()].indexOf(activeItem);
      [...this.#items.values()].at(index - 1)?.focus.focus();
    }
  }

  focusFirst(): void {
    [...this.#items.values()].at(0)?.focus.focus();
  }

  focusLast(): void {
    [...this.#items.values()].at(-1)?.focus.focus();
  }

  focusAtIndex(index: number): void {
    [...this.#items.values()].at(index)?.focus.focus();
  }
}

@Resolvable()
export class Menu {
  readonly element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly ctx = inject(MenuCtx);
  readonly id = this.#renderer.id(this.element, 'menu');

  constructor() {
    this.ctx.setMenu(this);
    this.#renderer.setAttr(this.element, 'role', 'menu');

    this.#renderer.listen(this.element, 'focusout', event => {
      console.log(event.target, this.element);
      if (this.ctx.expanded() && !this.element.contains(event.target as Node)) {
        this.ctx.close();
      }
    });
  }
}

@Resolvable()
export class MenuItem {
  readonly element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly focus = resolve(Focus);
  readonly ctx = resolve(MenuCtx);
  readonly button = resolve(Button);
  readonly id = this.#renderer.id(this.element, 'menu-item');

  constructor() {
    this.ctx.addItem(this);
    this.#renderer.setAttr(this.element, 'role', 'menuitem');

    isomorphicEffect({
      write: () => {
        this.#renderer.setAttr(this.element, 'data-active', this.focus.isFocused() ? 'true' : null);
      },
    });

    new KeyboardEventManager()
      .on('ArrowDown', () => this.ctx.focusNext(), { ignoreRepeat: false })
      .on('ArrowUp', () => this.ctx.focusPrevious(), { ignoreRepeat: false })
      .on('Home', () => this.ctx.focusFirst())
      .on('End', () => this.ctx.focusLast())
      .on('Enter', () => this.ctx.toggle())
      .on('Escape', () => this.ctx.close());
    // .on(this._expandKey, () => this.expand())
    // .on(this._collapseKey, () => this.collapse())
    // .on(this.dynamicSpaceKey, () => this.trigger())
    // .on(this.typeaheadRegexp, e => this.listBehavior.search(e.key));
  }
}

@Component({
  selector: 'proto-menu-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-container #vcr />`,
  host: {
    '[attr.data-align]': 'ctx.align()',
  },
  styles: `
    :host {
      --hover-buffer: 6px;
      container-type: anchored;
      position: fixed;
      position-try-fallbacks:
        flip-block,
        flip-inline,
        flip-block flip-inline;
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
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly #injector = inject(Injector);
  readonly vcr = viewChild('vcr', { read: ViewContainerRef });
  readonly ctx = inject(MenuCtx);
  readonly hover = resolve(Hover);

  readonly triggerAnchorName = this.ctx.anchorName;
  readonly menuAnchorName = `${this.ctx.anchorName}-menu` as const;

  readonly #align = signal(this.ctx.side());
  readonly align = this.#align.asReadonly();

  constructor() {
    this.ctx.setMenuContainer(this);

    effect(onCleanup => {
      const expanded = this.ctx.expanded();
      const content = this.ctx.content();
      const vcr = this.vcr();

      if (!expanded || !content || !vcr) {
        return;
      }

      const ref =
        content instanceof TemplateRef
          ? vcr.createEmbeddedView(content, { $implicit: this.ctx }, { injector: this.#injector })
          : vcr.createComponent(content, { injector: this.#injector });

      onCleanup(() => {
        ref.destroy();
      });
    });

    isomorphicEffect({
      write: () => {
        this.#renderer.styles(this.#element, {
          anchorName: this.menuAnchorName,
          positionAnchor: this.ctx.anchorName,
          positionArea: this.ctx.side(),
          [`margin-${sideFlip[this.ctx.align()?.split(' ')[0] || 'left']}`]: this.ctx.offset(),
        });
      },
    });

    afterEveryRender(() => {
      const style = getComputedStyle(this.#element) as { positionArea?: MenuSide };
      this.#align.update(align => style.positionArea ?? align);
    });
  }
}
