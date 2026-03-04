import { Directive, inject } from '@angular/core';
import { FormRoot } from '@angular/forms/signals';
import { injectElement } from '@terseware/utils';
import { installFieldDataAttributes } from './form-di';

@Directive({
  selector: '[proto][formRoot]',
  exportAs: 'protoFormRoot',
})
export class ProtoFormRoot<T> {
  readonly formRoot = inject(FormRoot<T>);
  readonly element = injectElement();

  constructor() {
    installFieldDataAttributes(this.element, () => this.formRoot.fieldTree()().fieldTree());
  }
}
