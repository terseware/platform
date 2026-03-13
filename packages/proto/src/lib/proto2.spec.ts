import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  effect,
  HostAttributeToken,
  inject,
  Injector,
  TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { injectElement, uniqueId } from '@terseware/utils';
import { render } from '@testing-library/angular';
import { Resolvable, resolve } from './proto-resolve';

@Resolvable()
class Interact {}

@Resolvable()
class TestProto {
  readonly interact = resolve(Interact);
  readonly id = uniqueId(TestProto.name).split('-')[1];
}

describe('Proto', () => {
  @Directive({
    selector: '[testParent]',
  })
  class TestParent {
    readonly id = inject(new HostAttributeToken('id'));
    readonly element = injectElement();
    readonly proto = inject(TestProto);

    constructor() {
      console.log('testParent', {
        id: this.id,
        protoId: this.proto.id,
      });
      expect(this.id).toBe('3');
    }
  }

  @Directive({
    selector: '[testDir]',
  })
  class TestDir {
    readonly id = inject(new HostAttributeToken('id'));
    readonly element = injectElement();
    readonly inherited = inject(TestProto, { optional: true }) ?? resolve(TestProto);
    // readonly notInherited = resolve(TestProto, { inherit: false });

    constructor() {
      console.log('testDir', {
        id: this.id,
        inheritedId: this.inherited.id,
        // notInheritedId: this.notInherited.id,
      });
    }
  }

  @Component({
    selector: 'test-child',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TestDir, NgTemplateOutlet],
    template: `
      <div id="7" testDir></div>
      <ng-template #tpl8><div id="8" testDir></div></ng-template>
      <ng-container #vcr />
    `,
  })
  class TestChild {
    readonly #injector = inject(Injector);
    readonly tpl8 = viewChild('tpl8', { read: TemplateRef });
    readonly vcr = viewChild('vcr', { read: ViewContainerRef });

    constructor() {
      effect(onCleanup => {
        const tpl8 = this.tpl8();
        const vcr = this.vcr();

        if (!tpl8 || !vcr) {
          return;
        }

        const ref = vcr.createEmbeddedView(tpl8, { $implicit: this }, { injector: this.#injector });
        onCleanup(() => {
          ref.destroy();
        });
      });
    }
  }

  @Component({
    selector: 'test-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TestDir, TestParent, TestChild],
    template: `
      <div id="0" testDir></div>
      <div id="1" testDir>
        <div id="2" testDir></div>
        <div id="3" testDir testParent>
          <div id="4" testDir></div>
          <div id="5" testDir></div>
          <div id="6" testDir>
            <test-child />
          </div>
          <div id="9" testDir></div>
          <div id="10" testDir></div>
        </div>
        <div id="11" testDir></div>
      </div>
      <div id="12" testDir></div>
    `,
  })
  class TestHost {}

  function getTestDirs(fixture: ComponentFixture<TestHost>) {
    return fixture.debugElement.queryAll(By.directive(TestDir)).map(el => el.injector.get(TestDir));
  }

  it('should create', async () => {
    const { fixture } = await render(TestHost);
    const dirs = getTestDirs(fixture);
    for (let i = 0; i < dirs.length; i++) {
      expect(dirs[i].id).toBe(i.toString());
      expect(dirs[i].element.getAttribute('id')).toBe(i.toString());
    }
  });
});
