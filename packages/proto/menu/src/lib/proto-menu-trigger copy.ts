// import type { Signal, Type } from '@angular/core';
// import {
//   afterEveryRender,
//   ChangeDetectionStrategy,
//   Component,
//   computed,
//   Directive,
//   effect,
//   inject,
//   Injector,
//   input,
//   linkedSignal,
//   model,
//   signal,
//   TemplateRef,
//   ViewContainerRef,
// } from '@angular/core';
// import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
// import { Anchor } from '@terseware/proto/anchor';
// import { Button } from '@terseware/proto/button';
// import { Hover } from '@terseware/proto/hover';
// import { disposable, ElementRenderer, injectElement, isNumber } from '@terseware/utils';
// import { skip } from 'rxjs';

// export type MenuSide = 'top' | 'bottom' | 'left' | 'right';

// const sideFlip: Record<MenuSide, MenuSide> = {
//   top: 'bottom',
//   bottom: 'top',
//   left: 'right',
//   right: 'left',
// };

// @Directive({
//   selector: '[protoMenuTrigger]',
//   exportAs: 'protoMenuTrigger',
// })
// export class ProtoMenuTrigger {
//   readonly #vcr = inject(ViewContainerRef);
//   readonly #injector = inject(Injector);
//   //   readonly #doc = inject(DOCUMENT);
//   //   readonly #renderer = inject(ElementRenderer);
//   //   readonly #anchor = inject(Anchor);
//   readonly #hover = inject(Hover);
//   //   readonly #focus = inject(Focus);

//   readonly element = injectElement();
//   readonly anchorName = inject(Anchor).name;

//   readonly content = model<Type<unknown> | TemplateRef<{ $implicit: ProtoMenuTrigger }> | null>(
//     null,
//     { alias: 'protoMenuTrigger' },
//   );

//   readonly menuOpen = model<boolean>(false);
//   readonly menuSide = input<MenuSide>('bottom');
//   readonly menuSideFlip = computed(() => sideFlip[this.menuSide()]);
//   readonly menuOffset = input<string, string | number>('0px', {
//     transform: v => (isNumber(v) ? `${v}px` : v || '0px'),
//   });

//   readonly align = computed(() => this.menu()?.align() || null);
//   readonly gap = computed(() => {
//     const offset = this.menuOffset();
//     const size = /*this.arrow()?.arrowSize() ??*/ '0px';
//     // Theoretically this should be sqrt(2)/2, but it looks better with 0.8
//     return `calc(${offset} + ${size} * 0.8)`;
//   });

//   readonly #menu = signal<ProtoMenu | null>(null);
//   readonly menu = this.#menu.asReadonly();
//   setMenu(menu: ProtoMenu, injector?: Injector | null | undefined): () => void {
//     return disposable(this.setMenu, injector, () => {
//       this.#menu.set(menu);
//       return () => this.#menu.set(null);
//     });
//   }

//   readonly #hoverSources = signal([linkedSignal(() => this.#hover.isHovered())]);
//   addHoverSource(source: Signal<boolean>, injector?: Injector | null | undefined): () => void {
//     return disposable(this.addHoverSource, injector, () => {
//       const ctrl = linkedSignal(source);
//       this.#hoverSources.update(src => [...src, ctrl]);
//       return () => this.#hoverSources.update(src => src.filter(s => s !== ctrl));
//     });
//   }

//   constructor() {
//     effect(onCleanup => {
//       const isOpen = this.menuOpen();
//       const content = this.content();

//       if (!isOpen || !content) {
//         return;
//       }

//       const ref =
//         content instanceof TemplateRef
//           ? this.#vcr.createEmbeddedView(content, { $implicit: this }, { injector: this.#injector })
//           : this.#vcr.createComponent(content, { injector: this.#injector });

//       const hoverContainer = this.#vcr.createComponent(MenuContainer, {
//         injector: this.#injector,
//       });

//       onCleanup(() => {
//         hoverContainer.destroy();
//         ref.destroy();
//       });
//     });

//     toObservable(computed(() => this.#hoverSources().some(s => s())))
//       .pipe(skip(1), takeUntilDestroyed())
//       .subscribe(open => {
//         this.menuOpen.set(open);
//       });
//   }
// }

// @Directive({
//   selector: '[protoMenu]',
//   exportAs: 'protoMenu',
//   host: {
//     '[id]': 'id',
//     role: 'menu',
//     '[style]': 'styles()',
//     '[attr.data-align]': 'align()',
//     '[attr.data-side]': 'side()',
//   },
// })
// export class ProtoMenu {
//   readonly element = injectElement();
//   readonly #trigger = inject(ProtoMenuTrigger);
//   readonly #renderer = inject(ElementRenderer);
//   readonly id = this.#renderer.id(this.element, 'menu');
//   readonly anchorName = `${this.#trigger.anchorName}-${this.id}` as const;
//   readonly side = this.#trigger.menuSide;
//   readonly sideFlip = this.#trigger.menuSideFlip;
//   readonly gap = this.#trigger.gap;

//   readonly styles = computed(() => ({
//     anchorName: this.anchorName,
//     positionAnchor: this.#trigger.anchorName,
//     containerType: 'anchored',
//     positionArea: this.side(),
//     positionTryFallbacks: 'flip-block, flip-inline, flip-block flip-inline',
//     position: 'fixed',
//     [`margin-${this.sideFlip()}`]: this.gap(),
//   }));

//   readonly #align = signal(this.side());
//   readonly align = this.#align.asReadonly();

//   constructor() {
//     this.#trigger.setMenu(this);
//     afterEveryRender(() => {
//       const style = getComputedStyle(this.element) as { positionArea?: MenuSide };
//       this.#align.update(align => style.positionArea ?? align);
//     });
//   }
// }

// @Directive({
//   selector: '[protoMenuItem]',
//   exportAs: 'protoMenuItem',
// })
// export class ProtoMenuItem {
//   readonly button = inject(Button);
// }

// @Component({
//   selector: 'proto-menu-container',
//   changeDetection: ChangeDetectionStrategy.OnPush,
//   template: ``,
//   host: {
//     'aria-hidden': 'true',
//     '[style.--trigger]': 'triggerAnchorName',
//     '[style.--menu]': 'menuAnchorName()',
//     '[style.--gap]': 'gap()',
//     '[style.--side]': 'side()',
//     '[attr.data-align]': 'align()',
//   },
//   styles: `
//     :host {
//       --hover-buffer: 6px;
//       container-type: anchored;
//       position-anchor: var(--trigger);
//       position-area: var(--side);
//       position-try-fallbacks:
//         flip-block,
//         flip-inline,
//         flip-block flip-inline;
//       position: fixed;
//     }
//     :host[data-align='top'],
//     :host[data-align='bottom'] {
//       width: calc(var(--hover-buffer) + anchor-size(var(--menu) width));
//       height: calc(var(--hover-buffer) + anchor-size(var(--menu) height) + var(--gap));
//     }
//     :host[data-align='left'],
//     :host[data-align='right'] {
//       width: calc(var(--hover-buffer) + anchor-size(var(--menu) width) + var(--gap));
//       height: calc(
//         var(--hover-buffer) +
//           min(anchor-size(var(--menu) height), anchor-size(var(--trigger) height))
//       );
//     }
//   `,
// })
// class MenuContainer {
//   readonly trigger = inject(ProtoMenuTrigger);
//   readonly hover = inject(Hover);

//   readonly triggerAnchorName = this.trigger.anchorName;
//   readonly menuAnchorName = computed(() => this.trigger.menu()?.anchorName || null);
//   readonly gap = this.trigger.gap;
//   readonly side = this.trigger.menuSide;
//   readonly align = this.trigger.align;

//   constructor() {
//     this.trigger.addHoverSource(this.hover.isHovered);
//   }
// }
