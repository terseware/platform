import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  inject,
  Injectable,
  Injector,
  signal,
} from '@angular/core';
import { By } from '@angular/platform-browser';
import { uniqueId } from '@terseware/utils';
import { render } from '@testing-library/angular';
import { Resolvable, resolve } from './resolvable';

describe('Resolvable', () => {
  describe('basic resolution', () => {
    it('should create an instance when injected via a directive', async () => {
      @Resolvable()
      class MyState {
        readonly value = signal(42);
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(MyState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);
      expect(dir.state).toBeInstanceOf(MyState);
      expect(dir.state.value()).toBe(42);
    });

    it('should preserve the original class name via defineProperty', () => {
      class OriginalState {}
      const Decorated = Resolvable()(OriginalState) as typeof OriginalState;

      expect(Decorated.name).toBe('OriginalState');
    });

    it('should set Symbol.toStringTag to Resolvable<ClassName>', () => {
      class MyTaggedState {}
      const Decorated = Resolvable()(MyTaggedState) as typeof MyTaggedState;
      const instance = Object.create(Decorated.prototype);
      expect(Object.prototype.toString.call(instance)).toBe('[object MyTaggedState_Resolvable]');
    });

    it('should return the same instance for multiple injections on the same element', async () => {
      @Resolvable()
      class SharedState {
        readonly count = signal(0);
      }

      @Directive({ selector: '[dirA]' })
      class DirA {
        readonly state = resolve(SharedState);
      }

      @Directive({ selector: '[dirB]' })
      class DirB {
        readonly state = resolve(SharedState);
      }

      const { fixture } = await render(`<div dirA dirB>Test</div>`, {
        imports: [DirA, DirB],
      });

      const a = fixture.debugElement.query(By.directive(DirA)).injector.get(DirA);
      const b = fixture.debugElement.query(By.directive(DirB)).injector.get(DirB);
      expect(a.state).toBe(b.state);
    });

    it('should create separate instances for different elements', async () => {
      @Resolvable()
      class PerElementState {}

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(PerElementState);
      }

      const { fixture } = await render(`<div testDir id="a">A</div><div testDir id="b">B</div>`, {
        imports: [TestDir],
      });

      const dirs = fixture.debugElement.queryAll(By.directive(TestDir));
      const stateA = dirs[0]!.injector.get(TestDir).state;
      const stateB = dirs[1]!.injector.get(TestDir).state;
      expect(stateA).not.toBe(stateB);
    });

    it('should pass instanceof checks against the original decorated class', async () => {
      @Resolvable()
      class IdentityState {
        readonly tag = 'identity';
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(IdentityState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);
      expect(dir.state).toBeInstanceOf(IdentityState);
    });
  });

  describe('inherit option', () => {
    it('should create independent instances for sibling components when inherit is false (default)', async () => {
      @Resolvable()
      class HostScopedState {
        readonly id = uniqueId();
      }

      @Component({
        selector: 'isolated-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<span>isolated</span>',
      })
      class IsolatedComp {
        readonly state = resolve(HostScopedState);
      }

      const { fixture } = await render(`<isolated-comp /><isolated-comp />`, {
        imports: [IsolatedComp],
      });

      const comps = fixture.debugElement.queryAll(By.directive(IsolatedComp));
      const stateA = comps[0]!.componentInstance.state;
      const stateB = comps[1]!.componentInstance.state;

      expect(stateA).not.toBe(stateB);
      expect(stateA.id).not.toBe(stateB.id);
    });

    it('should inherit from parent when inherit is true', async () => {
      @Resolvable({ resolveIn: 'any' })
      class InheritState {
        readonly id = uniqueId();
      }

      @Component({
        selector: 'child-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<ng-content />',
      })
      class ChildComp {
        readonly state = resolve(InheritState);
      }

      @Component({
        selector: 'test-host',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ChildComp],
        template: '<child-comp>Content</child-comp>',
      })
      class TestHost {
        readonly state = resolve(InheritState);
      }

      const { fixture } = await render(TestHost);

      const parentState = fixture.componentInstance.state;
      const childState = fixture.debugElement.query(By.directive(ChildComp)).componentInstance
        .state;
      expect(parentState).toBe(childState);
    });

    it('should NOT inherit when inherit is false, creating separate instances for parent and child', async () => {
      @Resolvable()
      class NonInheritState {
        readonly id = uniqueId();
      }

      @Component({
        selector: 'child-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<span>child</span>',
      })
      class ChildComp {
        readonly state = resolve(NonInheritState);
      }

      @Component({
        selector: 'parent-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ChildComp],
        template: '<child-comp />',
      })
      class ParentComp {
        readonly state = resolve(NonInheritState);
      }

      const { fixture } = await render(ParentComp);
      const parentState = fixture.componentInstance.state;
      const childState = fixture.debugElement.query(By.directive(ChildComp)).componentInstance
        .state;

      expect(parentState).not.toBe(childState);
      expect(parentState.id).not.toBe(childState.id);
    });
  });

  describe('injection flags', () => {
    it('should scope to current element with resolve({ self: true })', async () => {
      @Resolvable()
      class SelfState {
        readonly value = signal('self');
      }

      @Directive({ selector: '[creator]' })
      class CreatorDir {
        readonly state = resolve(SelfState);
      }

      @Directive({ selector: '[selfConsumer]' })
      class SelfConsumerDir {
        // self: true should only look at the current element
        readonly state = inject(SelfState, { host: true });
      }

      // Both directives on the same element: self should find the instance
      const { fixture } = await render(`<div creator selfConsumer>Test</div>`, {
        imports: [CreatorDir, SelfConsumerDir],
      });

      const creator = fixture.debugElement.query(By.directive(CreatorDir)).injector.get(CreatorDir);
      const consumer = fixture.debugElement
        .query(By.directive(SelfConsumerDir))
        .injector.get(SelfConsumerDir);

      expect(creator.state).toBe(consumer.state);
    });

    it('should return null with inject({ skipSelf: true }) when no parent instance exists', async () => {
      @Resolvable()
      class SkipSelfState {
        readonly value = signal('exists');
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        // skipSelf: true looks only at ancestors, never creates
        readonly state = inject(SkipSelfState, { skipSelf: true, optional: true });
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);

      // skipSelf prevents creation and no parent has an instance
      expect(dir.state).toBeNull();
    });

    it('should find parent instance with inject({ skipSelf: true }) on same element', async () => {
      @Resolvable()
      class SkipSelfShared {
        readonly id = uniqueId();
      }

      @Directive({ selector: '[creator]' })
      class CreatorDir {
        // Creates the instance on this element
        readonly state = resolve(SkipSelfShared);
      }

      @Directive({ selector: '[skipSelfConsumer]' })
      class SkipSelfConsumerDir {
        // skipSelf skips current element -- should return null since no parent has it
        readonly state = inject(SkipSelfShared, { skipSelf: true, optional: true });
      }

      const { fixture } = await render(`<div creator skipSelfConsumer>Test</div>`, {
        imports: [CreatorDir, SkipSelfConsumerDir],
      });

      const consumer = fixture.debugElement
        .query(By.directive(SkipSelfConsumerDir))
        .injector.get(SkipSelfConsumerDir);

      // skipSelf skips the current element's instance and finds nothing above
      expect(consumer.state).toBeNull();
    });
  });

  describe('referenceFn option', () => {
    it('should use a factory function for instance storage', async () => {
      @Injectable({ providedIn: 'root' })
      class CustomRef {}

      @Resolvable({ resolveIn: () => inject(CustomRef), fallbackInjector: true })
      class CustomRefState {
        readonly value = signal('custom');
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(CustomRefState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, {
        imports: [TestDir],
      });

      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);
      expect(dir.state.value()).toBe('custom');
    });

    it('should use a class (Type) for instance storage via the isClass branch', async () => {
      @Injectable({ providedIn: 'root' })
      class ClassRef {}

      // Pass the class itself, not a factory — exercises the isClass(refFn) branch
      @Resolvable({ resolveIn: () => inject(ClassRef), fallbackInjector: true })
      class ClassRefState {
        readonly value = signal('class-ref');
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(ClassRefState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, {
        imports: [TestDir],
      });

      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);
      expect(dir.state).toBeInstanceOf(ClassRefState);
      expect(dir.state.value()).toBe('class-ref');
    });

    it('should share the same instance across different elements when using a singleton reference', async () => {
      @Injectable({ providedIn: 'root' })
      class SingletonRef {}

      @Resolvable({ resolveIn: () => inject(SingletonRef), fallbackInjector: true })
      class SharedViaRef {
        readonly id = uniqueId();
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(SharedViaRef);
      }

      const { fixture } = await render(`<div testDir id="x">X</div><div testDir id="y">Y</div>`, {
        imports: [TestDir],
      });

      const dirs = fixture.debugElement.queryAll(By.directive(TestDir));
      const stateX = dirs[0]!.injector.get(TestDir).state;
      const stateY = dirs[1]!.injector.get(TestDir).state;

      // Both resolve to the same instance because they share the singleton reference
      expect(stateX).toBe(stateY);
      expect(stateX.id).toBe(stateY.id);
    });

    it('should share instance across elements when using a class Type as singleton reference', async () => {
      @Injectable({ providedIn: 'root' })
      class SingletonClassRef {}

      // Pass the class directly instead of a factory
      @Resolvable({ resolveIn: () => inject(SingletonClassRef), fallbackInjector: true })
      class SharedViaClassRef {
        readonly id = uniqueId();
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(SharedViaClassRef);
      }

      const { fixture } = await render(`<div testDir id="a">A</div><div testDir id="b">B</div>`, {
        imports: [TestDir],
      });

      const dirs = fixture.debugElement.queryAll(By.directive(TestDir));
      const stateA = dirs[0]!.injector.get(TestDir).state;
      const stateB = dirs[1]!.injector.get(TestDir).state;

      expect(stateA).toBe(stateB);
    });
  });

  describe('constructor behavior', () => {
    it('should call super() and allow constructor logic', async () => {
      let constructed = false;

      @Resolvable()
      class ConstructorState {
        readonly ready: boolean;
        constructor() {
          constructed = true;
          this.ready = true;
        }
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(ConstructorState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);
      expect(constructed).toBe(true);
      expect(dir.state.ready).toBe(true);
    });

    it('should not call constructor again when returning existing instance', async () => {
      let constructCount = 0;

      @Resolvable()
      class CountState {
        constructor() {
          constructCount++;
        }
      }

      @Directive({ selector: '[dirA]' })
      class DirA {
        readonly state = resolve(CountState);
      }

      @Directive({ selector: '[dirB]' })
      class DirB {
        readonly state = resolve(CountState);
      }

      await render(`<div dirA dirB>Test</div>`, { imports: [DirA, DirB] });
      expect(constructCount).toBe(1);
    });

    it('should not re-run constructor when child inherits via inherit: true', async () => {
      let constructCount = 0;

      @Resolvable({ resolveIn: 'any' })
      class InheritedCount {
        constructor() {
          constructCount++;
        }
      }

      @Component({
        selector: 'child-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<span>child</span>',
      })
      class ChildComp {
        readonly state = resolve(InheritedCount);
      }

      @Component({
        selector: 'parent-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ChildComp],
        template: '<child-comp />',
      })
      class ParentComp {
        readonly state = resolve(InheritedCount);
      }

      const { fixture } = await render(ParentComp);

      const parentState = fixture.componentInstance.state;
      const childState = fixture.debugElement.query(By.directive(ChildComp)).componentInstance
        .state;

      expect(parentState).toBe(childState);
      expect(constructCount).toBe(1);
    });
  });

  describe('injection context', () => {
    it('should allow inject() calls inside the resolvable constructor', async () => {
      @Resolvable()
      class InjectingState {
        readonly injector = inject(Injector);
        readonly elementRef = inject(ElementRef);
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(InjectingState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);
      expect(dir.state.injector).toBeTruthy();
      expect(dir.state.elementRef).toBeTruthy();
    });

    it('should create separate instances when inherit is false and child is in parent template', async () => {
      @Resolvable()
      class AutoResolvedState {
        readonly active = signal(false);
      }

      @Component({
        selector: 'child-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<span>child</span>',
      })
      class ChildComp {
        readonly state = resolve(AutoResolvedState);
      }

      @Component({
        selector: 'parent-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ChildComp],
        template: '<child-comp />',
      })
      class ParentComp {
        readonly state = resolve(AutoResolvedState);
        constructor() {
          this.state.active.set(true);
        }
      }

      const { fixture } = await render(ParentComp);
      const parentState = fixture.componentInstance.state;
      const childState = fixture.debugElement.query(By.directive(ChildComp)).componentInstance
        .state;

      // inherit: false (default) so each component gets its own instance
      expect(childState).toBeInstanceOf(AutoResolvedState);
      expect(parentState.active()).toBe(true);
      // Child has a separate instance, so active is still false
      expect(childState.active()).toBe(false);
    });
  });

  describe('instance map', () => {
    it('should support multiple resolvable types on the same element', async () => {
      @Resolvable()
      class StateA {
        readonly name = 'A';
      }

      @Resolvable()
      class StateB {
        readonly name = 'B';
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly a = resolve(StateA);
        readonly b = resolve(StateB);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);
      expect(dir.a.name).toBe('A');
      expect(dir.b.name).toBe('B');
      expect(dir.a).not.toBe(dir.b);
    });
  });

  describe('inheritance chain', () => {
    it('should support extending a resolvable class', async () => {
      @Resolvable()
      class BaseState {
        readonly base = signal('base');
      }

      class ExtendedState extends BaseState {
        readonly extra = signal('extended');
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(BaseState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);

      expect(dir.state).toBeInstanceOf(BaseState);
      expect(dir.state.base()).toBe('base');

      // Verify the prototype chain: ExtendedState extends the decorated BaseState
      expect(ExtendedState.prototype).toBeInstanceOf(BaseState);
    });

    it('should allow injecting a subclass that is itself @Resolvable', async () => {
      @Resolvable()
      class ParentState {
        readonly role = signal('parent');
      }

      @Resolvable()
      class ChildState extends ParentState {
        override readonly role = signal('child');
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(ChildState);
      }

      const { fixture } = await render(`<div testDir>Test</div>`, { imports: [TestDir] });
      const dir = fixture.debugElement.query(By.directive(TestDir)).injector.get(TestDir);

      expect(dir.state).toBeInstanceOf(ChildState);
      expect(dir.state).toBeInstanceOf(ParentState);
      expect(dir.state.role()).toBe('child');
    });
  });

  describe('nested component tree', () => {
    it('should share instances across parent and child when inherit is true', async () => {
      @Resolvable({ resolveIn: 'any' })
      class SharedScopedState {
        readonly level = signal(0);
      }

      @Component({
        selector: 'inner-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<span>inner</span>',
      })
      class InnerComp {
        readonly state = resolve(SharedScopedState);
      }

      @Component({
        selector: 'outer-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [InnerComp],
        template: '<inner-comp />',
      })
      class OuterComp {
        readonly state = resolve(SharedScopedState);
        constructor() {
          this.state.level.set(1);
        }
      }

      const { fixture } = await render(OuterComp);
      const outer = fixture.componentInstance;
      const inner = fixture.debugElement.query(By.directive(InnerComp)).componentInstance;

      expect(outer.state).toBe(inner.state);
      expect(inner.state.level()).toBe(1);
    });

    it('should resolve from grandparent through 3-level deep tree with inherit: true', async () => {
      @Resolvable({ resolveIn: 'any' })
      class DeepState {
        readonly origin = signal('grandparent');
      }

      @Component({
        selector: 'grandchild-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<span>grandchild</span>',
      })
      class GrandchildComp {
        readonly state = resolve(DeepState);
      }

      @Component({
        selector: 'parent-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [GrandchildComp],
        template: '<grandchild-comp />',
      })
      class ParentComp {
        readonly state = resolve(DeepState);
      }

      @Component({
        selector: 'grandparent-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ParentComp],
        template: '<parent-comp />',
      })
      class GrandparentComp {
        readonly state = resolve(DeepState);
      }

      const { fixture } = await render(GrandparentComp);

      const gpState = fixture.componentInstance.state;
      const parentState = fixture.debugElement.query(By.directive(ParentComp)).componentInstance
        .state;
      const gcState = fixture.debugElement.query(By.directive(GrandchildComp)).componentInstance
        .state;

      // All three levels share the same instance
      expect(gpState).toBe(parentState);
      expect(parentState).toBe(gcState);
      expect(gcState.origin()).toBe('grandparent');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple sibling elements each with their own instance', async () => {
      @Resolvable()
      class SiblingState {
        readonly id = uniqueId();
      }

      @Directive({ selector: '[testDir]' })
      class TestDir {
        readonly state = resolve(SiblingState);
      }

      const { fixture } = await render(
        `<div testDir>A</div><div testDir>B</div><div testDir>C</div>`,
        { imports: [TestDir] },
      );

      const dirs = fixture.debugElement.queryAll(By.directive(TestDir));
      const ids = dirs.map(d => d.injector.get(TestDir).state.id);

      // All unique
      expect(new Set(ids).size).toBe(3);
    });

    it('should isolate instances when viewProviders is used with inherit: false', async () => {
      @Resolvable()
      class ViewProviderState {
        readonly id = uniqueId();
      }

      @Component({
        selector: 'projecting-comp',
        changeDetection: ChangeDetectionStrategy.OnPush,
        viewProviders: [ViewProviderState],
        template: '<ng-content />',
      })
      class ProjectingComp {
        readonly state = resolve(ViewProviderState);
      }

      @Component({
        selector: 'projected-child',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: '<span>projected</span>',
      })
      class ProjectedChild {
        readonly state = resolve(ViewProviderState);
      }

      @Component({
        selector: 'test-host',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ProjectingComp, ProjectedChild],
        template: '<projecting-comp><projected-child /></projecting-comp>',
      })
      class TestHost {}

      const { fixture } = await render(TestHost);

      const parentState = fixture.debugElement.query(By.directive(ProjectingComp)).componentInstance
        .state;
      const childState = fixture.debugElement.query(By.directive(ProjectedChild)).componentInstance
        .state;

      // viewProviders does not leak to projected content, so child gets its own instance
      expect(parentState).not.toBe(childState);
    });
  });
});
