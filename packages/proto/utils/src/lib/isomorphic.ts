import { isPlatformBrowser } from '@angular/common';
import type { AfterRenderOptions, EffectCleanupRegisterFn, EffectRef, Signal } from '@angular/core';
import {
  afterNextRender,
  afterRenderEffect,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';

/**
 * Cross-environment `afterRenderEffect` that works in browser and SSR.
 *
 * - **Browser**: Uses native `afterRenderEffect`
 * - **SSR**: Uses synchronous `effect()` (no render cycle available)
 *
 * Supports all afterRenderEffect phases (earlyRead, write, mixedReadWrite, read).
 */
export function isomorphicEffect(
  callback: (onCleanup: EffectCleanupRegisterFn) => void,
  options?: AfterRenderOptions,
): EffectRef;

export function isomorphicEffect<E = never, W = never, M = never>(
  spec: Parameters<typeof afterRenderEffect<E, W, M>>[0],
  options?: AfterRenderOptions,
): EffectRef;

export function isomorphicEffect<E, W, M>(
  param:
    | Parameters<typeof afterRenderEffect<E, W, M>>[0]
    | ((onCleanup: EffectCleanupRegisterFn) => void),
  options?: AfterRenderOptions,
): EffectRef {
  // On browser, use native rendering effect
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return afterRenderEffect<E, W, M>(
      param as Parameters<typeof afterRenderEffect<E, W, M>>[0],
      options,
    );
  }

  return effect(onCleanup => {
    if (typeof param === 'function') {
      (param as (onCleanup: EffectCleanupRegisterFn) => void)(onCleanup);
      return;
    }

    // Simulate phase chain: earlyRead → write → mixedReadWrite → read
    const spec = param as unknown as {
      earlyRead?: (onCleanup: EffectCleanupRegisterFn) => E;
      write?: (prev: Signal<E>, onCleanup: EffectCleanupRegisterFn) => W;
      mixedReadWrite?: (prev: Signal<W | E>, onCleanup: EffectCleanupRegisterFn) => M;
      read?: (prev: Signal<M | W | E>, onCleanup: EffectCleanupRegisterFn) => void;
    };

    let lastResult: E | W | M | undefined;

    if (spec.earlyRead) {
      lastResult = spec.earlyRead(onCleanup);
    }

    if (spec.write) {
      lastResult = spec.write(signal(lastResult as E), onCleanup);
    }

    if (spec.mixedReadWrite) {
      lastResult = spec.mixedReadWrite(signal(lastResult as W | E), onCleanup);
    }

    if (spec.read) {
      spec.read(signal(lastResult as M | W | E), onCleanup);
    }
  }, options);
}

/**
 * Cross-environment `afterNextRender` that works in browser and SSR.
 *
 * - **Browser**: Uses native `afterNextRender`
 * - **SSR**: Immediately runs the callback
 *
 * Supports all afterNextRender phases (earlyRead, write, mixedReadWrite, read).
 */
export function isomorphicRender(callback: VoidFunction, options?: AfterRenderOptions): EffectRef;

export function isomorphicRender<E = never, W = never, M = never>(
  spec: Parameters<typeof afterNextRender<E, W, M>>[0],
  options?: AfterRenderOptions,
): EffectRef;

export function isomorphicRender<E, W, M>(
  param: Parameters<typeof afterNextRender<E, W, M>>[0] | VoidFunction,
  options?: AfterRenderOptions,
): EffectRef {
  // On browser, use native rendering effect
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return afterNextRender<E, W, M>(
      param as Parameters<typeof afterNextRender<E, W, M>>[0],
      options,
    );
  }

  if (typeof param === 'function') {
    (param as VoidFunction)();
  } else {
    // Simulate phase chain: earlyRead → write → mixedReadWrite → read
    const spec = param as {
      earlyRead?: () => E;
      write?: (prev: E) => W;
      mixedReadWrite?: (prev: W | E) => M;
      read?: (prev: M | W | E) => void;
    };

    let lastResult: E | W | M | undefined;

    if (spec.earlyRead) {
      lastResult = spec.earlyRead();
    }

    if (spec.write) {
      lastResult = spec.write(lastResult as E);
    }

    if (spec.mixedReadWrite) {
      lastResult = spec.mixedReadWrite(lastResult as W | E);
    }

    if (spec.read) {
      spec.read(lastResult as M | W | E);
    }
  }

  return {
    destroy: () => void 0,
  };
}
