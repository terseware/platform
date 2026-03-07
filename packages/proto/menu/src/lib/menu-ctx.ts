import type { Type } from '@angular/core';
import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  Injector,
  linkedSignal,
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

/** Debounce timer for typeahead search reset. */
const TYPEAHEAD_DEBOUNCE_MS = 500;

@Resolvable({ resolveIn: 'any' })
export class MenuCtx {
  readonly #vcr = inject(ViewContainerRef);
  readonly #injector = inject(Injector);
  readonly #renderer = inject(ElementRenderer);
  readonly #element = injectElement();
  readonly #doc = inject(DOCUMENT);

  readonly button = resolve(Button);
  readonly interact = resolve(Interact);
  readonly anchorName = resolve(Anchor).name;
  readonly triggerId = this.#renderer.id(this.#element, 'menu-trigger');

  readonly content = signal<MenuContent | null>(null);
  readonly expanded = signal(false);
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

  readonly activeItem = linkedSignal(
    () => [...this.#items.values()].find(item => item.focus.isFocused()) ?? null,
  );

  /** Pending focus action deferred until items are rendered. */
  readonly #pendingFocus = signal<'first' | 'last' | null>(null);

  constructor() {
    signalBind(this.interact.tabIndex, () => (this.expanded() && this.activeItem() ? -1 : 0));
    this.#renderer.listen(this.#element, 'click', () => this.toggle());
    this.#renderer.listen(
      this.#element,
      'keyup',
      evt => {
        if (evt.key === ' ' && this.activeItem() === null) {
          evt.preventDefault();
          evt.stopPropagation();
        }
      },
      { capture: true },
    );

    isomorphicEffect({
      write: () => {
        this.#renderer.setAttr(this.#element, 'aria-expanded', `${this.expanded()}`);
        this.#renderer.setAttr(this.#element, 'aria-haspopup', 'menu');
      },
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

    // Deferred focus: wait for items to register, then focus first/last
    effect(() => {
      const pending = this.#pendingFocus();
      const items = [...this.#items.values()];
      if (!pending || items.length === 0) {
        return;
      }
      // Items are registered; apply focus after next render so DOM is ready
      afterNextRender(
        () => {
          if (pending === 'first') {
            this.#focusFirstEnabled();
          } else {
            this.#focusLastEnabled();
          }
          this.#pendingFocus.set(null);
        },
        { injector: this.#injector },
      );
    });

    new KeyboardEventManager()
      .on(' ', () => this.open({ first: true }))
      .on('Enter', () => this.open({ first: true }))
      .on('ArrowDown', () => this.open({ first: true }))
      .on('ArrowUp', () => this.open({ last: true }))
      .on('Escape', () => this.close());

    // Close on focusout when focus moves outside the trigger and menu
    this.#renderer.listen(this.#element, 'focusout', event => {
      const related = event.relatedTarget as Node | null;
      if (!this.expanded()) {
        return;
      }
      // If relatedTarget is null, focus left the document entirely
      if (
        !related ||
        (!this.#element.contains(related) &&
          !this.#menu()?.element.contains(related) &&
          ![...this.#items.values()].some(item => item.element.contains(related)))
      ) {
        this.expanded.set(false);
      }
    });

    // Click-outside-to-close (don't steal focus from click target)
    effect(onCleanup => {
      if (!this.expanded()) {
        return;
      }
      const unlisten = this.#renderer.listen(
        this.#doc,
        'click',
        event => {
          const target = event.target as Node | null;
          if (
            target &&
            !this.#element.contains(target) &&
            !this.#menu()?.element.contains(target)
          ) {
            this.close({ returnFocus: false });
          }
        },
        { injector: this.#injector },
      );
      onCleanup(() => unlisten());
    });
  }

  open(opts?: { first?: boolean; last?: boolean }): void {
    this.expanded.set(true);
    if (opts?.first) {
      this.#pendingFocus.set('first');
    } else if (opts?.last) {
      this.#pendingFocus.set('last');
    }
  }

  close(opts?: { returnFocus?: boolean }): void {
    this.expanded.set(false);
    this.#pendingFocus.set(null);
    // Return focus to trigger on close (default: true)
    if (opts?.returnFocus !== false) {
      this.#element.focus();
    }
  }

  toggle(): void {
    if (this.expanded()) {
      this.close();
    } else {
      this.open();
    }
  }

  focusNext(): void {
    const items = this.#enabledItems();
    const activeItem = this.activeItem();
    if (!items.length) return;
    if (activeItem) {
      const index = items.indexOf(activeItem);
      // Wrap to first item if at end
      const nextIndex = (index + 1) % items.length;
      items[nextIndex]?.focus.focus();
    } else {
      // No active: focus first
      items[0]?.focus.focus();
    }
  }

  focusPrevious(): void {
    const items = this.#enabledItems();
    const activeItem = this.activeItem();
    if (!items.length) return;
    if (activeItem) {
      const index = items.indexOf(activeItem);
      // Wrap to last item if at start
      const prevIndex = (index - 1 + items.length) % items.length;
      items[prevIndex]?.focus.focus();
    } else {
      // No active: focus last
      items.at(-1)?.focus.focus();
    }
  }

  focusFirst(): void {
    this.#focusFirstEnabled();
  }

  focusLast(): void {
    this.#focusLastEnabled();
  }

  focusAtIndex(index: number): void {
    this.#enabledItems().at(index)?.focus.focus();
  }

  /** Typeahead: focus the next item whose text starts with the given character. */
  typeahead(char: string): void {
    const items = this.#enabledItems();
    const activeItem = this.activeItem();
    const startIndex = activeItem ? items.indexOf(activeItem) + 1 : 0;

    const lowerChar = char.toLowerCase();

    // Search from after active item to end, then wrap to start
    for (let i = 0; i < items.length; i++) {
      const item = items[(startIndex + i) % items.length];
      const text = item?.element.textContent?.trim().toLowerCase();
      if (text?.startsWith(lowerChar)) {
        item?.focus.focus();
        return;
      }
    }
  }

  #enabledItems(): MenuItem[] {
    return [...this.#items.values()].filter(item => !item.disabled());
  }

  #focusFirstEnabled(): void {
    this.#enabledItems().at(0)?.focus.focus();
  }

  #focusLastEnabled(): void {
    this.#enabledItems().at(-1)?.focus.focus();
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

    // Set aria-labelledby to reference the trigger element
    this.#renderer.setAttr(this.element, 'aria-labelledby', this.ctx.triggerId);

    // Close on focusout when focus moves outside the menu
    this.#renderer.listen(this.element, 'focusout', event => {
      const related = event.relatedTarget as Node | null;
      if (!this.ctx.expanded()) {
        return;
      }
      // If relatedTarget is null, focus left the document entirely
      if (!related || !this.element.contains(related)) {
        this.ctx.expanded.set(false);
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
  readonly interact = resolve(Interact);
  readonly button = resolve(Button);
  readonly id = this.#renderer.id(this.element, 'menu-item');

  /** Whether this menu item is disabled. */
  readonly disabled = signal(false);

  /** Typeahead debounce state. */
  #typeaheadBuffer = '';
  #typeaheadTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.ctx.addItem(this);
    this.#renderer.setAttr(this.element, 'role', 'menuitem');

    signalBind(this.interact.tabIndex, () => {
      const activeItem = this.ctx.activeItem();
      if (activeItem === this) {
        return 0;
      }
      return activeItem ? -1 : 0;
    });

    isomorphicEffect({
      write: () => {
        this.#renderer.setAttr(this.element, 'data-active', this.focus.isFocused() ? 'true' : null);
      },
    });

    isomorphicEffect({
      write: () => {
        this.#renderer.setAttr(this.element, 'aria-disabled', this.disabled() ? 'true' : null);
      },
    });

    new KeyboardEventManager()
      .on('ArrowDown', () => this.ctx.focusNext(), { ignoreRepeat: false })
      .on('ArrowUp', () => this.ctx.focusPrevious(), { ignoreRepeat: false })
      .on('Home', () => this.ctx.focusFirst())
      .on('End', () => this.ctx.focusLast())
      .on('Enter', () => this.#activate())
      .on(' ', () => this.#activate())
      .on('Escape', () => this.ctx.close())
      .on(/^[a-z0-9]$/i, event => this.#handleTypeahead(event.key), {
        preventDefault: false,
        stopPropagation: false,
      });
  }

  /** Activate: click the element and close the menu (WAI-ARIA menuitem behavior). */
  #activate(): void {
    if (this.disabled()) {
      return;
    }
    this.element.click();
    this.ctx.activeItem.set(null);
    this.ctx.close();
  }

  /** Accumulate typed characters and search for matching items. */
  #handleTypeahead(char: string): void {
    if (this.#typeaheadTimeout) {
      clearTimeout(this.#typeaheadTimeout);
    }
    this.#typeaheadBuffer += char;
    this.ctx.typeahead(this.#typeaheadBuffer);
    this.#typeaheadTimeout = setTimeout(() => {
      this.#typeaheadBuffer = '';
      this.#typeaheadTimeout = null;
    }, TYPEAHEAD_DEBOUNCE_MS);
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
  readonly ctx = resolve(MenuCtx);
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
