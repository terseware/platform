// import { Directive, inject } from '@angular/core';
// import { FormRoot } from '@angular/forms/signals';
// import { injectElement } from '@terseware/utils';

// @Directive({
//   selector: '[protoFormRoot]',
//   exportAs: 'protoFormRoot',
//   hostDirectives: [{ directive: FormRoot, inputs: ['formRoot:protoFormRoot'] }],
// })
// export class ProtoFormRoot<T> extends FormRoot<T> {
//   readonly element = injectElement();

//   constructor() {
//     super();
//     Object.assign(this, inject(FormRoot, { self: true }));
//   }
// }
