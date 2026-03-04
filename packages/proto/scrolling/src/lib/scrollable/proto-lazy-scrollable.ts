import { CdkScrollable } from '@angular/cdk/scrolling';
import { Directive, inject } from '@angular/core';
import { toLazySignal } from 'ngxtension/to-lazy-signal';
import { animationFrameScheduler, auditTime, map } from 'rxjs';

/**
 * A directive that provides a wrapper around the {@link CdkScrollable} directive
 * for measuring scroll offsets with lazy signals for enhanced performance.
 *
 * @remarks
 * Credit to ngxtension for toLazySignal: https://ngxtension.dev/utilities/signals/to-lazy-signal
 */
@Directive({
  selector: '[protoLazyScrollable]',
  exportAs: 'protoLazyScrollable',
  hostDirectives: [CdkScrollable],
})
export class ProtoLazyScrollable {
  readonly cdkScrollable = inject(CdkScrollable);

  readonly #scrolled = this.cdkScrollable
    .elementScrolled()
    .pipe(auditTime(0, animationFrameScheduler));

  readonly lazyScrolled = toLazySignal(this.#scrolled);

  readonly lazyScrollTop = toLazySignal(
    this.#scrolled.pipe(map(() => this.cdkScrollable.measureScrollOffset('top'))),
    { initialValue: 0 },
  );

  readonly lazyScrollLeft = toLazySignal(
    this.#scrolled.pipe(map(() => this.cdkScrollable.measureScrollOffset('left'))),
    { initialValue: 0 },
  );

  readonly lazyScrollRight = toLazySignal(
    this.#scrolled.pipe(map(() => this.cdkScrollable.measureScrollOffset('right'))),
    { initialValue: 0 },
  );

  readonly lazyScrollBottom = toLazySignal(
    this.#scrolled.pipe(map(() => this.cdkScrollable.measureScrollOffset('bottom'))),
    { initialValue: 0 },
  );

  readonly lazyScrollStart = toLazySignal(
    this.#scrolled.pipe(map(() => this.cdkScrollable.measureScrollOffset('start'))),
    { initialValue: 0 },
  );

  readonly lazyScrollEnd = toLazySignal(
    this.#scrolled.pipe(map(() => this.cdkScrollable.measureScrollOffset('end'))),
    { initialValue: 0 },
  );
}
