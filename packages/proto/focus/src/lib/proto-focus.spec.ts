import type { FocusOrigin } from '@angular/cdk/a11y';
import { FocusMonitor } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, Directive, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { Focus } from './focus';
import { ProtoFocus } from './proto-focus';

describe('ProtoFocus', () => {
  @Component({
    selector: 'test-focus-basic',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button #focus="protoFocus" data-testid="focus-element" protoFocus>Focus me</button>
    `,
  })
  class TestFocusBasic {
    readonly focus = viewChild.required(ProtoFocus);
    readonly focusState = viewChild.required(Focus);
  }

  @Component({
    selector: 'test-focus-disabled',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button
        #focus="protoFocus"
        data-testid="focus-element"
        protoFocus
        [protoFocusDisabled]="isDisabled()"
      >
        Focus me
      </button>
    `,
  })
  class TestFocusDisabled {
    readonly focus = viewChild.required(ProtoFocus);
    readonly isDisabled = signal(false);
  }

  @Component({
    selector: 'test-focus-check-children',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <div
        #focus="protoFocus"
        data-testid="focus-container"
        protoFocus
        [protoFocusCheckChildren]="checkChildren()"
      >
        <button data-testid="child-button">Child button</button>
        <input data-testid="child-input" type="text" />
      </div>
    `,
  })
  class TestFocusCheckChildren {
    readonly focus = viewChild.required(ProtoFocus);
    readonly checkChildren = signal(false);
  }

  @Component({
    selector: 'test-focus-output',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button data-testid="focus-element" protoFocus (protoFocusChange)="handleFocusChange($event)">
        Focus me
      </button>
    `,
  })
  class TestFocusOutput {
    focusChanges: FocusOrigin[] = [];

    handleFocusChange(origin: FocusOrigin): void {
      this.focusChanges.push(origin);
    }
  }

  @Component({
    selector: 'test-focus-programmatic',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button #focus="protoFocus" data-testid="focus-element" protoFocus>Focus me</button>
      <button data-testid="other-button">Other</button>
    `,
  })
  class TestFocusProgrammatic {
    readonly focus = viewChild.required(ProtoFocus);
  }

  @Component({
    selector: 'test-focus-input-element',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: ` <input #focus="protoFocus" data-testid="focus-input" protoFocus type="text" /> `,
  })
  class TestFocusInputElement {
    readonly focus = viewChild.required(ProtoFocus);
  }

  @Component({
    selector: 'test-focus-div-element',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <div #focus="protoFocus" data-testid="focus-div" protoFocus tabindex="0">Focusable div</div>
    `,
  })
  class TestFocusDivElement {
    readonly focus = viewChild.required(ProtoFocus);
  }

  @Directive({
    selector: '[testFocusDirective]',
    hostDirectives: [
      {
        directive: ProtoFocus,
        inputs: ['protoFocusDisabled', 'protoFocusCheckChildren'],
        outputs: ['protoFocusChange'],
      },
    ],
  })
  class TestFocusDirective {}

  @Component({
    selector: 'test-focus-host-directive',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TestFocusDirective, ProtoFocus],
    template: `
      <button
        #focus
        data-testid="focus-element"
        testFocusDirective
        [protoFocusDisabled]="isDisabled()"
      >
        Focus me
      </button>
    `,
  })
  class TestFocusHostDirective {
    readonly focus = viewChild.required(ProtoFocus);
    readonly isDisabled = signal(false);
  }

  // ============================================================================
  // ProtoFocus Basic Functionality Tests
  // ============================================================================

  describe('basic functionality', () => {
    it('should render element with protoFocus directive', async () => {
      await render(TestFocusBasic);

      const element = screen.getByTestId('focus-element');
      expect(element).toBeInTheDocument();
    });

    it('should export directive via exportAs', async () => {
      const { fixture } = await render(TestFocusBasic);

      const focus = fixture.componentInstance.focus();
      expect(focus).toBeInstanceOf(ProtoFocus);
    });

    it('should not have data-focus attribute initially', async () => {
      await render(TestFocusBasic);

      const element = screen.getByTestId('focus-element');
      expect(element).not.toHaveAttribute('data-focus');
    });

    it('should work with button elements', async () => {
      await render(TestFocusBasic);

      const element = screen.getByTestId('focus-element');
      expect(element.tagName).toBe('BUTTON');
    });

    it('should work with input elements', async () => {
      await render(TestFocusInputElement);

      const element = screen.getByTestId('focus-input');
      expect(element.tagName).toBe('INPUT');
    });

    it('should work with div elements', async () => {
      await render(TestFocusDivElement);

      const element = screen.getByTestId('focus-div');
      expect(element.tagName).toBe('DIV');
    });
  });

  // ============================================================================
  // Focus State Tracking Tests
  // ============================================================================

  describe('focus state tracking', () => {
    it('should track isFocused signal when element is focused', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      expect(focus.isFocused()).toBe(false);

      // Programmatically focus
      focus.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.isFocused()).toBe(true);
    });

    it('should reset isFocused signal when element is blurred', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      focus.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focus.isFocused()).toBe(true);

      focus.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.isFocused()).toBe(false);
    });

    it('should set data-focus attribute when focused', async () => {
      const { fixture } = await render(TestFocusBasic);
      const element = screen.getByTestId('focus-element');
      const focus = fixture.componentInstance.focus();

      expect(element).not.toHaveAttribute('data-focus');

      focus.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).toHaveAttribute('data-focus', '');
    });

    it('should remove data-focus attribute when blurred', async () => {
      const { fixture } = await render(TestFocusBasic);
      const element = screen.getByTestId('focus-element');
      const focus = fixture.componentInstance.focus();

      focus.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).toHaveAttribute('data-focus', '');

      focus.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).not.toHaveAttribute('data-focus');
    });
  });

  // ============================================================================
  // Focus Origin Tracking Tests
  // ============================================================================

  describe('focus origin tracking', () => {
    it('should track focusOrigin as null when not focused', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      expect(focus.focusOrigin()).toBe(null);
    });

    it('should track focusOrigin as program when focused programmatically', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      focus.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.focusOrigin()).toBe('program');
    });

    it('should track focusOrigin as keyboard when focused via keyboard', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      focus.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.focusOrigin()).toBe('keyboard');
    });

    it('should track focusOrigin as mouse when focused via mouse', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      focus.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.focusOrigin()).toBe('mouse');
    });

    it('should track focusOrigin as touch when focused via touch', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      focus.focus('touch');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.focusOrigin()).toBe('touch');
    });

    it('should reset focusOrigin to null when blurred', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      focus.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focus.focusOrigin()).toBe('keyboard');

      focus.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.focusOrigin()).toBe(null);
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('disabled state', () => {
    it('should not track focus when disabled', async () => {
      const { fixture } = await render(TestFocusDisabled);
      const { focus, isDisabled } = fixture.componentInstance;

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Try to focus
      focus().focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      // Should still be false due to disabled
      expect(focus().isFocused()).toBe(false);
    });

    it('should reset focus state when becoming disabled', async () => {
      const { fixture } = await render(TestFocusDisabled);
      const { focus, isDisabled } = fixture.componentInstance;

      // Focus first
      focus().focus('program');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focus().isFocused()).toBe(true);

      // Disable
      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(focus().isFocused()).toBe(false);
      expect(focus().focusOrigin()).toBe(null);
    });

    it('should remove data-focus attribute when becoming disabled', async () => {
      const { fixture } = await render(TestFocusDisabled);
      const element = screen.getByTestId('focus-element');
      const { focus, isDisabled } = fixture.componentInstance;

      focus().focus('program');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).toHaveAttribute('data-focus', '');

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element).not.toHaveAttribute('data-focus');
    });

    it('should resume focus tracking when re-enabled', async () => {
      const { fixture } = await render(TestFocusDisabled);
      const { focus, isDisabled } = fixture.componentInstance;

      // Disable first
      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Re-enable
      isDisabled.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Focus should work now
      focus().focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus().isFocused()).toBe(true);
    });
  });

  // ============================================================================
  // checkChildren Tests
  // ============================================================================

  describe('checkChildren', () => {
    it('should not track child focus when checkChildren is false', async () => {
      const { fixture } = await render(TestFocusCheckChildren);
      const { focus, checkChildren } = fixture.componentInstance;

      checkChildren.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Focus a child element
      const childButton = screen.getByTestId('child-button');
      childButton.focus();
      await fixture.whenStable();
      fixture.detectChanges();

      // Parent should not be focused
      expect(focus().isFocused()).toBe(false);
    });

    it('should track child focus when checkChildren is true', async () => {
      const { fixture } = await render(TestFocusCheckChildren);
      const { focus, checkChildren } = fixture.componentInstance;

      checkChildren.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Focus a child element via FocusMonitor
      const focusMonitor = TestBed.inject(FocusMonitor);
      const childButton = screen.getByTestId('child-button');
      focusMonitor.focusVia(childButton, 'keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus().isFocused()).toBe(true);
    });

    it('should re-monitor when checkChildren changes', async () => {
      const { fixture } = await render(TestFocusCheckChildren);
      const { focus, checkChildren } = fixture.componentInstance;
      const focusMonitor = TestBed.inject(FocusMonitor);
      const childInput = screen.getByTestId('child-input');

      // Initially checkChildren is false
      checkChildren.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      focusMonitor.focusVia(childInput, 'keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focus().isFocused()).toBe(false);

      // Enable checkChildren
      checkChildren.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      focusMonitor.focusVia(childInput, 'keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focus().isFocused()).toBe(true);
    });
  });

  // ============================================================================
  // focusChange Output Tests
  // ============================================================================

  describe('focusChange output', () => {
    it('should emit focusChange when focused', async () => {
      const { fixture } = await render(TestFocusOutput);
      const component = fixture.componentInstance;
      const focusMonitor = TestBed.inject(FocusMonitor);
      const element = screen.getByTestId('focus-element');

      expect(component.focusChanges).toHaveLength(0);

      focusMonitor.focusVia(element, 'keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.focusChanges).toContain('keyboard');
    });

    it('should emit focusChange with null when blurred', async () => {
      const { fixture } = await render(TestFocusOutput);
      const component = fixture.componentInstance;
      const focusMonitor = TestBed.inject(FocusMonitor);
      const element = screen.getByTestId('focus-element');

      focusMonitor.focusVia(element, 'program');
      await fixture.whenStable();
      fixture.detectChanges();

      element.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.focusChanges).toContain(null);
    });

    it('should emit different origins based on focus method', async () => {
      const { fixture } = await render(TestFocusOutput);
      const component = fixture.componentInstance;
      const focusMonitor = TestBed.inject(FocusMonitor);
      const element = screen.getByTestId('focus-element');

      focusMonitor.focusVia(element, 'mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.focusChanges).toContain('mouse');
    });
  });

  // ============================================================================
  // Programmatic focus() and blur() Tests
  // ============================================================================

  describe('programmatic focus() and blur()', () => {
    it('should focus element via focus() method', async () => {
      const { fixture } = await render(TestFocusProgrammatic);
      const focus = fixture.componentInstance.focus();
      const element = screen.getByTestId('focus-element');

      expect(document.activeElement).not.toBe(element);

      focus.focus();
      await fixture.whenStable();

      expect(document.activeElement).toBe(element);
    });

    it('should focus element with specified origin', async () => {
      const { fixture } = await render(TestFocusProgrammatic);
      const focus = fixture.componentInstance.focus();

      focus.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.focusOrigin()).toBe('keyboard');
    });

    it('should blur element via blur() method', async () => {
      const { fixture } = await render(TestFocusProgrammatic);
      const focus = fixture.componentInstance.focus();
      const element = screen.getByTestId('focus-element');

      focus.focus();
      await fixture.whenStable();
      expect(document.activeElement).toBe(element);

      focus.blur();
      await fixture.whenStable();

      expect(document.activeElement).not.toBe(element);
    });

    it('should use program as default focus origin', async () => {
      const { fixture } = await render(TestFocusProgrammatic);
      const focus = fixture.componentInstance.focus();

      focus.focus(); // No origin specified
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.focusOrigin()).toBe('program');
    });

    it('should support FocusOptions like preventScroll', async () => {
      const { fixture } = await render(TestFocusProgrammatic);
      const focus = fixture.componentInstance.focus();

      // This should not throw
      focus.focus('program', { preventScroll: true });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.isFocused()).toBe(true);
    });

    it('should focus without origin when null is passed', async () => {
      const { fixture } = await render(TestFocusProgrammatic);
      const focus = fixture.componentInstance.focus();
      const element = screen.getByTestId('focus-element');

      focus.focus(null);
      await fixture.whenStable();

      expect(document.activeElement).toBe(element);
    });
  });

  // ============================================================================
  // Host Directive Tests
  // ============================================================================

  describe('as host directive', () => {
    it('should work as a host directive', async () => {
      await render(TestFocusHostDirective);

      const element = screen.getByTestId('focus-element');
      expect(element).toBeInTheDocument();
    });

    it('should respect disabled input from host directive', async () => {
      const { fixture } = await render(TestFocusHostDirective);
      const { focus, isDisabled } = fixture.componentInstance;

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      focus().focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus().isFocused()).toBe(false);
    });

    it('should expose focus state via host directive', async () => {
      const { fixture } = await render(TestFocusHostDirective);
      const focus = fixture.componentInstance.focus();

      focus.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.isFocused()).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('edge cases', () => {
    it('should handle rapid focus/blur cycles', async () => {
      const { fixture } = await render(TestFocusProgrammatic);
      const focus = fixture.componentInstance.focus();

      for (let i = 0; i < 5; i++) {
        focus.focus();
        await fixture.whenStable();
        focus.blur();
        await fixture.whenStable();
      }

      fixture.detectChanges();
      expect(focus.isFocused()).toBe(false);
    });

    it('should handle focus on already focused element', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      focus.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focus.isFocused()).toBe(true);

      // Focus again
      focus.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.isFocused()).toBe(true);
      expect(focus.focusOrigin()).toBe('keyboard');
    });

    it('should handle blur on already blurred element', async () => {
      const { fixture } = await render(TestFocusBasic);
      const focus = fixture.componentInstance.focus();

      expect(focus.isFocused()).toBe(false);

      focus.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focus.isFocused()).toBe(false);
    });

    it('should handle disabled toggle while focused', async () => {
      const { fixture } = await render(TestFocusDisabled);
      const { focus, isDisabled } = fixture.componentInstance;
      const element = screen.getByTestId('focus-element');

      // Focus first
      focus().focus('program');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).toHaveAttribute('data-focus', '');

      // Toggle disabled rapidly
      isDisabled.set(true);
      fixture.detectChanges();
      isDisabled.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Element should still exist and be functional
      expect(element).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Template Rendering Tests
  // ============================================================================

  describe('inline template usage', () => {
    it('should work with inline template', async () => {
      await render(`<button data-testid="btn" protoFocus>Click</button>`, {
        imports: [ProtoFocus],
      });

      const element = screen.getByTestId('btn');
      expect(element).toBeInTheDocument();
    });

    it('should work with template binding for disabled', async () => {
      const { fixture, rerender } = await render(
        `<button data-testid="btn" protoFocus [protoFocusDisabled]="isDisabled">Click</button>`,
        {
          imports: [ProtoFocus],
          componentProperties: { isDisabled: false },
        },
      );

      const focusMonitor = TestBed.inject(FocusMonitor);
      const element = screen.getByTestId('btn');

      focusMonitor.focusVia(element, 'program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).toHaveAttribute('data-focus', '');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element).not.toHaveAttribute('data-focus');
    });
  });
});
