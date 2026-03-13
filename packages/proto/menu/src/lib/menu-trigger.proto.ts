import type { BooleanInput } from '@angular/cdk/coercion';
import type { Type } from '@angular/core';
import {
  afterEveryRender,
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
  TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { on, ProtoHost, Resolvable, resolve } from '@terseware/proto';
import { AnchorProto } from '@terseware/proto/anchor';
import { ButtonProto } from '@terseware/proto/button';
import { HoverProto } from '@terseware/proto/hover';
import { injectElement, isomorphicEffect, onChange, onDestroy, signalBind } from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import type { MenuItemProto } from './menu-item.proto';
import type { MenuProto } from './menu.proto';

type MenuOrigin = 'top' | 'bottom' | 'left' | 'right';

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

export type MenuContent = Type<object> | TemplateRef<{ $implicit: MenuTriggerProto }>;

@Resolvable()
export class MenuTriggerProto {
  readonly #vcr = inject(ViewContainerRef);
  readonly #injector = inject(Injector);
  readonly #host = inject(ProtoHost);
  readonly element = injectElement();

  readonly button = resolve(ButtonProto);
  readonly anchorName = resolve(AnchorProto).name;
  readonly triggerId = this.#host.id('menu-trigger');

  /**
   * Whether the menu is disabled.
   *
   * @remarks
   * This is different than the Interact.disabled since Interact.disabled disables the entire element
   * and allows for disabling the menu itself without disabling the trigger element.
   */
  readonly menuDisabled = signal(false);

  readonly content = signal<MenuContent | null>(null);
  readonly expanded = signal(false);
  readonly offset = signal<string | number>('0px');
  readonly side = signal<MenuSide>('right span-bottom');
  readonly sideOrigin = computed(() => (this.side().split(' ')[0] || 'left') as MenuOrigin);
  readonly align = signal<MenuSide>(this.side());
  readonly alignOrigin = computed(() => (this.align().split(' ')[0] || 'left') as MenuOrigin);

  readonly #menu = signal<MenuProto | null>(null);
  readonly menu = this.#menu.asReadonly();
  setMenu(menu: MenuProto): () => void {
    this.#menu.set(menu);
    return () => this.#menu.set(null);
  }

  readonly #menuContainer = signal<ProtoMenuContainer | null>(null);
  readonly menuContainer = this.#menuContainer.asReadonly();
  setMenuContainer(menuContainer: ProtoMenuContainer): () => void {
    this.#menuContainer.set(menuContainer);
    return () => this.#menuContainer.set(null);
  }

  readonly #items = new SignalSet<MenuItemProto>();
  readonly items = computed(() =>
    [...this.#items.values()].filter(item => !item.button.interact.hardDisabled()),
  );
  addItem(item: MenuItemProto): () => void {
    this.#items.add(item);
    return () => this.#items.delete(item);
  }

  readonly activeItem = linkedSignal(
    () => this.items().find(item => item.focus.isFocused()) ?? null,
  );

  /** Pending focus action deferred until items are rendered. */
  readonly #pendingFocus = signal<'first' | 'last' | null>(null);

  constructor() {
    // Immediately close the menu upon disabling
    onChange(this.menuDisabled, d => d && this.close());

    signalBind(this.button.interact.tabIndex, () =>
      this.expanded() && this.activeItem() ? -1 : 0,
    );

    on('click', ({ event, next }) => {
      this.toggle();
      next(event);
    });

    on('keydown', ({ event, next }) => {
      switch (event.key) {
        case 'Escape':
          this.close();
          event.preventDefault();
          break;
        case 'ArrowDown':
          this.open('first');
          event.preventDefault();
          break;
        case 'ArrowUp':
          this.open('last');
          event.preventDefault();
          break;
        case 'Enter':
          this.open(this.expanded() ? (this.align().endsWith('bottom') ? 'first' : 'last') : null);
          event.preventDefault();
          return;
        case ' ':
          this.open(this.expanded() ? (this.align().endsWith('bottom') ? 'first' : 'last') : null);
          event.preventDefault();
          return;
        case 'ArrowRight':
          if (this.expanded()) {
            this.open(this.align().endsWith('bottom') ? 'first' : 'last');
            event.preventDefault();
          }
          break;
        case 'ArrowLeft':
          if (this.expanded()) {
            this.open(this.align().endsWith('bottom') ? 'first' : 'last');
            event.preventDefault();
          }
          break;
      }
      next(event);
    });

    this.#host.bindAttr('aria-expanded', () => `${this.expanded()}`);
    this.#host.setAttr('aria-haspopup', 'menu');

    isomorphicEffect({
      write: onCleanup => {
        const id = this.menu()?.id || null;
        const removeAttr = this.#host.arrayAttr('aria-controls', id);
        onCleanup(() => removeAttr());
      },
    });

    effect(onCleanup => {
      if (this.menuDisabled() || !this.content() || !this.expanded()) {
        return;
      }
      const container = this.#vcr.createComponent(ProtoMenuContainer, { injector: this.#injector });
      onCleanup(() => container.destroy());
    });

    // Deferred focus: wait for items to register, then focus first/last
    effect(() => {
      const pending = this.#pendingFocus();
      const items = this.items();
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

    on('focusout', ({ event, next }) => {
      const related = event.relatedTarget as Node | null;
      if (!this.expanded()) {
        return;
      }
      next(event);
      if (event.protoHandlerPrevented) {
        return;
      }
      // If relatedTarget is null, focus left the document entirely
      if (
        !related ||
        (!this.element.contains(related) &&
          !this.#menu()?.element.contains(related) &&
          !this.items().some(item => item.element.contains(related)))
      ) {
        this.expanded.set(false);
      }
    });
  }

  open(opts: 'first' | 'last' | null = null): void {
    if (this.menuDisabled()) {
      return;
    }
    this.expanded.set(true);
    this.#pendingFocus.set(opts);
  }

  close(opts?: { returnFocus?: boolean }): void {
    if (this.menuDisabled()) {
      return;
    }
    this.expanded.set(false);
    this.#pendingFocus.set(null);
    // Return focus to trigger on close (default: true)
    if (opts?.returnFocus !== false) {
      this.element.focus();
    }
  }

  toggle(): void {
    if (this.menuDisabled()) {
      return;
    }
    if (this.expanded()) {
      this.close();
    } else {
      this.open();
    }
  }

  focusNext(): void {
    const items = this.items();
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
    const items = this.items();
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
    this.items().at(index)?.focus.focus();
  }

  /** Typeahead: focus the next item whose text starts with the given character. */
  typeahead(char: string): void {
    const items = this.items();
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

  #focusFirstEnabled(): void {
    this.items().at(0)?.focus.focus();
  }

  #focusLastEnabled(): void {
    this.items().at(-1)?.focus.focus();
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
class ProtoMenuContainer {
  readonly #element = injectElement();
  readonly #host = inject(ProtoHost);
  readonly #injector = inject(Injector);
  readonly vcr = viewChild('vcr', { read: ViewContainerRef });
  readonly ctx = inject(MenuTriggerProto);
  readonly hover = resolve(HoverProto);

  readonly triggerAnchorName = this.ctx.anchorName;
  readonly menuAnchorName = `${this.ctx.anchorName}-menu` as const;

  constructor() {
    onDestroy(this.ctx.setMenuContainer(this));

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

      onCleanup(() => ref.destroy());
    });

    this.#host.bindStyles(() => ({
      anchorName: this.menuAnchorName,
      positionAnchor: this.ctx.anchorName,
      positionArea: this.ctx.side(),
      [`margin-${sideFlip[this.ctx.align().split(' ')[0] || 'left']}`]: this.ctx.offset(),
    }));

    afterEveryRender(() => {
      const style = getComputedStyle(this.#element) as { positionArea?: MenuSide };
      this.ctx.align.update(align => style.positionArea ?? align);
    });
  }
}

@Directive({
  selector: '[protoMenuTrigger],proto-menu-trigger',
  exportAs: 'protoMenuTrigger',
})
export class ProtoMenuTrigger {
  readonly ctx = resolve(MenuTriggerProto);

  readonly disabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
    alias: 'protoMenuTriggerDisabled',
  });

  readonly content = input<MenuContent | null>(null, { alias: 'protoMenuTrigger' });

  constructor() {
    signalBind(this.ctx.menuDisabled, this.disabled);
    signalBind(this.ctx.content, this.content);
  }
}
