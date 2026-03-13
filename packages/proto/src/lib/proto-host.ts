import type { EffectRef, ListenerOptions, Type } from '@angular/core';
import {
  inject,
  Injector,
  Renderer2,
  RendererStyleFlags2,
  runInInjectionContext,
  untracked,
  ViewContainerRef,
} from '@angular/core';
import { isNull, isomorphicEffect, isUndefined, uniqueId } from '@terseware/utils';
import { ProtoResolver } from './proto-resolve';

export class ProtoHost {
  readonly #vcr = inject(ViewContainerRef);
  readonly element = this.#vcr.element.nativeElement as HTMLElement;
  readonly #renderer = inject(Renderer2);
  readonly #resolver = inject(ProtoResolver);
  readonly #injector = inject(Injector);

  static __NG_ELEMENT_ID__ = (): ProtoHost =>
    inject(ProtoResolver).resolve(ProtoHost, inject(ViewContainerRef));

  resolve<T>(type: Type<T>): T {
    return this.#resolver.resolve(type, this.#vcr);
  }

  resolveOnParent<T>(parentToken: Type<unknown>, type: Type<T>): T;
  resolveOnParent<T>(parentToken: Type<unknown>, type: Type<T>, opts?: { optional?: false }): T;
  resolveOnParent<T>(parentToken: Type<unknown>, type: Type<T>, opts: { optional: true }): T | null;
  resolveOnParent<T>(
    parentToken: Type<unknown>,
    type: Type<T>,
    opts?: { optional?: boolean },
  ): T | null {
    return untracked(() => {
      const ref = runInInjectionContext(this.#injector, () =>
        inject(parentToken, { skipSelf: true, optional: opts?.optional ?? false }),
      );
      if (!ref) return null;
      return ProtoResolver.resolve(type, ref);
    });
  }

  id(prefix?: string): string {
    return this.element.id
      ? this.element.id
      : (this.element.id = uniqueId(prefix || 'element', this.#injector));
  }

  setAttr(name: string, value: string | null | undefined): void {
    if (!isUndefined(value)) {
      if (isNull(value)) {
        this.#renderer.removeAttribute(this.element, name);
      } else {
        this.#renderer.setAttribute(this.element, name, String(value));
      }
    }
  }

  setAttrs(attrs: Record<string, string | null | undefined>): void {
    for (const [name, value] of Object.entries(attrs)) {
      this.setAttr(name, value);
    }
  }

  bindAttr(attr: string, value: () => string | null | undefined): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => value(),
        write: v => this.setAttr(attr, v()),
      },
      { injector: this.#injector },
    );
  }

  bindAttrs(attrs: Record<string, () => string | null | undefined>): EffectRef {
    const effects: EffectRef[] = [];
    for (const [name, value] of Object.entries(attrs)) {
      effects.push(this.bindAttr(name, value));
    }
    return { destroy: () => effects.forEach(e => e.destroy()) };
  }

  arrayAttr(
    attr: string,
    value: (string | null | undefined) | (string | null | undefined)[],
  ): () => void {
    const values = (Array.isArray(value) ? value : [value])
      .map(v => v?.trim() || null)
      .filter(Boolean);

    const getFn = () => new Set(this.element.getAttribute(attr)?.split(' ').filter(Boolean));
    const setFn = (set: Set<string>) => (set.size ? [...set].join(' ') : null);

    const set = getFn();
    values.forEach(v => v && set.add(v));
    this.setAttr(attr, setFn(set));

    return () => {
      const current = getFn();
      values.forEach(v => v && current.delete(v));
      this.setAttr(attr, setFn(current));
    };
  }

  setStyle(
    style: string,
    value: string | number | null | undefined,
    flags?: RendererStyleFlags2,
  ): void {
    if (!isUndefined(value)) {
      flags ??= style.startsWith('--') ? RendererStyleFlags2.DashCase : undefined;
      if (isNull(value)) {
        this.#renderer.removeStyle(this.element, style, flags);
      } else {
        this.#renderer.setStyle(this.element, style, String(value), flags);
      }
    }
  }

  bindStyle(style: string, value: () => string | number | null | undefined): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => value() as string | null | undefined,
        write: v => this.setStyle(style, v()),
      },
      { injector: this.#injector },
    );
  }

  setStyles(styles: Record<string, string | number | null | undefined>): void {
    for (const [key, value] of Object.entries(styles)) {
      this.setStyle(key, value);
    }
  }

  bindStyles(styles: () => Record<string, string | number | null | undefined>): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => styles(),
        write: s => this.setStyles(s()),
      },
      { injector: this.#injector },
    );
  }

  docEvent<K extends keyof DocumentEventMap>(
    eventName: K,
    handler: (event: DocumentEventMap[K]) => void,
    options?: ListenerOptions,
  ): () => void {
    return this.#renderer.listen('document', eventName, handler, options);
  }
}
