import { isClass } from '@terseware/utils';

describe('App', () => {
  it('should true', async () => {
    function refFn() {
      return '';
    }
    expect(isClass(refFn)).toBe(false);

    const arrowFn = () => '';
    expect(isClass(arrowFn)).toBe(false);

    class TestClass {}
    expect(isClass(TestClass)).toBe(true);

    // @Resolvable()
    // class TestService {
    //   readonly value = uniqueId();
    //   constructor() {
    //     console.log('TestService', (this as any).referredTo);
    //   }
    // }

    // @Directive({
    //   selector: '[testDir]',
    //   providers: [TestService],
    // })
    // class TestDir {
    //   constructor() {
    //     console.log('TestDir', inject(TestService));
    //   }
    // }

    // @Component({
    //   selector: 'test-host',
    //   changeDetection: ChangeDetectionStrategy.OnPush,
    //   imports: [TestDir],
    //   template: `<div testDir>Test</div>`,
    //   providers: [TestService],
    // })
    // class TestHost {
    //   constructor() {
    //     // console.log('TestHost', inject(TestService, { optional: true })?.value);
    //   }
    // }
    // await render(TestHost);
  });
});
