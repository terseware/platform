import type { InjectOptions } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  inject,
  InjectionToken,
  Injector,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import { resolve } from '@terseware/proto';
import { render } from '@testing-library/angular';
import { AnchorTarget } from './anchor-target';

describe('AnchorTarget', () => {
  describe('inheritance via resolve', () => {
    const InjOpts = new InjectionToken<InjectOptions>('inheritToken');

    @Directive({
      selector: '[testDir1]',
    })
    class TestDir1 {
      readonly injector = inject(Injector);
      constructor() {
        resolve(AnchorTarget, {}, inject(InjOpts));
      }
    }

    @Directive({
      selector: '[testDir2]',
    })
    class TestDir2 {
      readonly injector = inject(Injector);
      constructor() {
        resolve(AnchorTarget, {}, inject(InjOpts));
      }
    }

    @Component({
      selector: 'test-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [TestDir1, TestDir2],
      template: `<button testDir1 testDir2>Button</button>`,
    })
    class TestHost {
      readonly injector = inject(Injector);
      readonly dir1 = viewChild.required(TestDir1);
      readonly dir2 = viewChild.required(TestDir2);
      constructor() {
        resolve(AnchorTarget, {}, inject(InjOpts));
      }
    }

    async function setup(injOpts: InjectOptions) {
      const { fixture } = await render(TestHost, {
        providers: [{ provide: InjOpts, useValue: injOpts }],
      });
      const ci = fixture.componentInstance;

      const getAnchorName = (injector: Injector, options: InjectOptions) =>
        runInInjectionContext(injector, () => inject(AnchorTarget, options)?.anchorName());

      return {
        hostAnchorName: (opts: InjectOptions = {}) => getAnchorName(ci.injector, opts),
        dir1AnchorName: (opts: InjectOptions = {}) => getAnchorName(ci.dir1().injector, opts),
        dir2AnchorName: (opts: InjectOptions = {}) => getAnchorName(ci.dir2().injector, opts),
      };
    }

    it('should allow inheritance', async () => {
      const { hostAnchorName, dir1AnchorName, dir2AnchorName } = await setup({ host: false });
      expect(hostAnchorName()).toBe(dir1AnchorName());
      expect(hostAnchorName()).toBe(dir2AnchorName());
      expect(dir1AnchorName()).toBe(dir2AnchorName());
    });

    it('should allow non-inheritance', async () => {
      const { hostAnchorName, dir1AnchorName, dir2AnchorName } = await setup({ self: true });
      expect(hostAnchorName()).not.toBe(dir1AnchorName());
      expect(hostAnchorName()).not.toBe(dir2AnchorName());
      expect(dir1AnchorName()).toBe(dir2AnchorName());
    });
  });
});
