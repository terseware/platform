import { ElementRef, inject } from '@angular/core';

/** ElementRef<HTMLElement> */
export function injectElementRef<T extends HTMLElement = HTMLElement>(): ElementRef<T> {
  return inject<ElementRef<T>>(ElementRef);
}
