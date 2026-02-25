import type { InjectOptions } from '@angular/core';
import { ElementRef, inject } from '@angular/core';

/** ElementRef<HTMLElement> */
export function injectElementRef<T extends HTMLElement = HTMLElement>(
  options: InjectOptions & { optional: true },
): ElementRef<T> | null;
export function injectElementRef<T extends HTMLElement = HTMLElement>(
  options?: InjectOptions & { optional?: boolean },
): ElementRef<T>;
export function injectElementRef<T extends HTMLElement = HTMLElement>(
  options: InjectOptions & { optional?: boolean } = {},
): ElementRef<T> | null {
  return inject<ElementRef<T>>(ElementRef, options);
}

export function injectElement<T extends HTMLElement = HTMLElement>(
  options: InjectOptions & { optional: true },
): T | null;
export function injectElement<T extends HTMLElement = HTMLElement>(
  options?: InjectOptions & { optional?: boolean },
): T;
export function injectElement<T extends HTMLElement = HTMLElement>(
  options: InjectOptions & { optional?: boolean } = {},
): T | null {
  return injectElementRef<T>(options)?.nativeElement ?? null;
}
