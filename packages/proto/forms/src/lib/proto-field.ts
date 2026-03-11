import { Directive, inject, input } from '@angular/core';
import type { FormField } from '@angular/forms/signals';
import { FORM_FIELD } from '@angular/forms/signals';
import { signalBind } from '@terseware/utils';
import { FieldCtx } from './field-ctx';
import type { ProtoFieldErrorStrategy } from './forms-di';

@Directive({
  selector: '[protoField][formField]',
  exportAs: 'protoField',
})
export class ProtoField<T> {
  readonly field = inject<FormField<T>>(FORM_FIELD);
  readonly state = this.field.state;
  readonly ctx = inject(FieldCtx<T>);

  readonly errorStrategy = input<ProtoFieldErrorStrategy<T>>(this.ctx.errorStrategy(), {
    alias: 'protoFieldErrorStrategy',
  });

  constructor() {
    signalBind(this.ctx.errorStrategy, this.errorStrategy);
  }
}
