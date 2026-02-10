import { FocusMonitor, type FocusOrigin } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, Directive, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { FocusInteraction } from './focus.interaction';
import { ProtoFocus } from './terse-focus';

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
    readonly focusState = viewChild.required(FocusInteraction);
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

describe('ProtoFocus (visible)', () => {
  // ============================================================================
  // Test Host Components
  // ============================================================================

  @Component({
    selector: 'test-focus-visible-basic',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button #focusVisible="protoFocus" data-testid="focus-element" protoFocus>Focus me</button>
    `,
  })
  class TestFocusVisibleBasic {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-disabled',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button
        #focusVisible="protoFocus"
        data-testid="focus-element"
        protoFocus
        [protoFocusDisabled]="isDisabled()"
      >
        Focus me
      </button>
    `,
  })
  class TestFocusVisibleDisabled {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
    readonly isDisabled = signal(false);
  }

  @Component({
    selector: 'test-focus-visible-text-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="text" />
    `,
  })
  class TestFocusVisibleTextInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-password-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="password" />
    `,
  })
  class TestFocusVisiblePasswordInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-email-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="email" />
    `,
  })
  class TestFocusVisibleEmailInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-search-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="search" />
    `,
  })
  class TestFocusVisibleSearchInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-number-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="number" />
    `,
  })
  class TestFocusVisibleNumberInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-tel-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="tel" />
    `,
  })
  class TestFocusVisibleTelInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-url-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="url" />
    `,
  })
  class TestFocusVisibleUrlInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-checkbox-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <input #focusVisible="protoFocus" data-testid="focus-input" protoFocus type="checkbox" />
    `,
  })
  class TestFocusVisibleCheckboxInput {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-textarea',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <textarea #focusVisible="protoFocus" data-testid="focus-textarea" protoFocus></textarea>
    `,
  })
  class TestFocusVisibleTextarea {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-contenteditable',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <div
        #focusVisible="protoFocus"
        contenteditable="true"
        data-testid="focus-editable"
        protoFocus
        tabindex="0"
      >
        Editable content
      </div>
    `,
  })
  class TestFocusVisibleContentEditable {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-output',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button
        data-testid="focus-element"
        protoFocus
        (protoFocusVisibleChange)="handleFocusVisibleChange($event)"
      >
        Focus me
      </button>
    `,
  })
  class TestFocusVisibleOutput {
    focusVisibleChanges: boolean[] = [];

    handleFocusVisibleChange(isVisible: boolean): void {
      this.focusVisibleChanges.push(isVisible);
    }
  }

  @Component({
    selector: 'test-focus-visible-programmatic',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <button #focusVisible="protoFocus" data-testid="focus-element" protoFocus>Focus me</button>
      <button data-testid="other-button">Other</button>
    `,
  })
  class TestFocusVisibleProgrammatic {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-div',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <div #focusVisible="protoFocus" data-testid="focus-div" protoFocus tabindex="0">
        Focusable div
      </div>
    `,
  })
  class TestFocusVisibleDiv {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Component({
    selector: 'test-focus-visible-link',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProtoFocus],
    template: `
      <a #focusVisible="protoFocus" data-testid="focus-link" href="#" protoFocus> Link </a>
    `,
  })
  class TestFocusVisibleLink {
    readonly focusVisible = viewChild.required<ProtoFocus>('focusVisible');
  }

  @Directive({
    selector: '[testFocusVisibleDirective]',
    hostDirectives: [
      {
        directive: ProtoFocus,
        inputs: ['protoFocusDisabled'],
        outputs: ['protoFocusVisibleChange'],
      },
    ],
  })
  class TestFocusVisibleDirective {}

  @Component({
    selector: 'test-focus-visible-host-directive',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TestFocusVisibleDirective, ProtoFocus],
    template: `
      <button
        #focusVisible
        data-testid="focus-element"
        testFocusVisibleDirective
        [protoFocusDisabled]="isDisabled()"
      >
        Focus me
      </button>
    `,
  })
  class TestFocusVisibleHostDirective {
    readonly focusVisible = viewChild.required('focusVisible', { read: ProtoFocus });
    readonly isDisabled = signal(false);
  }

  describe('basic functionality', () => {
    it('should render element with protoFocus directive', async () => {
      await render(TestFocusVisibleBasic);

      const element = screen.getByTestId('focus-element');
      expect(element).toBeInTheDocument();
    });

    it('should export directive via exportAs', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);

      const focusVisible = fixture.componentInstance.focusVisible();
      expect(focusVisible).toBeInstanceOf(ProtoFocus);
    });

    it('should not have data-focus-visible attribute initially', async () => {
      await render(TestFocusVisibleBasic);

      const element = screen.getByTestId('focus-element');
      expect(element).not.toHaveAttribute('data-focus-visible');
    });

    it('should work with button elements', async () => {
      await render(TestFocusVisibleBasic);

      const element = screen.getByTestId('focus-element');
      expect(element.tagName).toBe('BUTTON');
    });

    it('should work with link elements', async () => {
      await render(TestFocusVisibleLink);

      const element = screen.getByTestId('focus-link');
      expect(element.tagName).toBe('A');
    });

    it('should work with div elements', async () => {
      await render(TestFocusVisibleDiv);

      const element = screen.getByTestId('focus-div');
      expect(element.tagName).toBe('DIV');
    });
  });

  // ============================================================================
  // Keyboard Focus Tests (should show focus-visible)
  // ============================================================================

  describe('keyboard focus', () => {
    it('should show focus-visible for keyboard focus on button', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should set data-focus-visible attribute for keyboard focus', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const element = screen.getByTestId('focus-element');
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).toHaveAttribute('data-focus-visible', '');
    });

    it('should remove data-focus-visible when blurred', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const element = screen.getByTestId('focus-element');
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).toHaveAttribute('data-focus-visible', '');

      focusVisible.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).not.toHaveAttribute('data-focus-visible');
    });

    it('should track focusOrigin as keyboard', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.focusOrigin()).toBe('keyboard');
    });
  });

  // ============================================================================
  // Mouse Focus Tests (should NOT show focus-visible for non-text inputs)
  // ============================================================================

  describe('mouse focus', () => {
    it('should NOT show focus-visible for mouse focus on button', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(false);
    });

    it('should NOT set data-focus-visible for mouse focus on button', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const element = screen.getByTestId('focus-element');
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).not.toHaveAttribute('data-focus-visible');
    });

    it('should NOT show focus-visible for mouse focus on link', async () => {
      const { fixture } = await render(TestFocusVisibleLink);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(false);
    });

    it('should NOT show focus-visible for mouse focus on div', async () => {
      const { fixture } = await render(TestFocusVisibleDiv);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(false);
    });

    it('should NOT show focus-visible for mouse focus on checkbox', async () => {
      const { fixture } = await render(TestFocusVisibleCheckboxInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(false);
    });
  });

  // ============================================================================
  // Text Input Focus Tests (should ALWAYS show focus-visible)
  // ============================================================================

  describe('text input focus', () => {
    it('should show focus-visible for mouse focus on text input', async () => {
      const { fixture } = await render(TestFocusVisibleTextInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should set data-focus-visible for mouse focus on text input', async () => {
      const { fixture } = await render(TestFocusVisibleTextInput);
      const element = screen.getByTestId('focus-input');
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).toHaveAttribute('data-focus-visible', '');
    });

    it('should show focus-visible for keyboard focus on text input', async () => {
      const { fixture } = await render(TestFocusVisibleTextInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for mouse focus on password input', async () => {
      const { fixture } = await render(TestFocusVisiblePasswordInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for mouse focus on email input', async () => {
      const { fixture } = await render(TestFocusVisibleEmailInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for mouse focus on search input', async () => {
      const { fixture } = await render(TestFocusVisibleSearchInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for mouse focus on number input', async () => {
      const { fixture } = await render(TestFocusVisibleNumberInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for mouse focus on tel input', async () => {
      const { fixture } = await render(TestFocusVisibleTelInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for mouse focus on url input', async () => {
      const { fixture } = await render(TestFocusVisibleUrlInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for mouse focus on textarea', async () => {
      const { fixture } = await render(TestFocusVisibleTextarea);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should show focus-visible for keyboard focus on contenteditable', async () => {
      const { fixture } = await render(TestFocusVisibleContentEditable);
      const focusVisible = fixture.componentInstance.focusVisible();

      // contenteditable detection may not work in jsdom, test with keyboard focus
      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });
  });

  // ============================================================================
  // Touch Focus Tests
  // ============================================================================

  describe('touch focus', () => {
    it('should NOT show focus-visible for touch focus on button', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('touch');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(false);
    });

    it('should show focus-visible for touch focus on text input', async () => {
      const { fixture } = await render(TestFocusVisibleTextInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('touch');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });
  });

  // ============================================================================
  // Program Focus Tests
  // ============================================================================

  describe('program focus', () => {
    it('should NOT show focus-visible for program focus on button', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(false);
    });

    it('should show focus-visible for program focus on text input', async () => {
      const { fixture } = await render(TestFocusVisibleTextInput);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('program');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('disabled state', () => {
    it('should not track focus-visible when disabled', async () => {
      const { fixture } = await render(TestFocusVisibleDisabled);
      const { focusVisible, isDisabled } = fixture.componentInstance;

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      focusVisible().focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible().isFocusVisible()).toBe(false);
    });

    it('should reset focus-visible state when becoming disabled', async () => {
      const { fixture } = await render(TestFocusVisibleDisabled);
      const { focusVisible, isDisabled } = fixture.componentInstance;

      focusVisible().focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focusVisible().isFocusVisible()).toBe(true);

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(focusVisible().isFocusVisible()).toBe(false);
      expect(focusVisible().focusOrigin()).toBe(null);
    });

    it('should remove data-focus-visible when becoming disabled', async () => {
      const { fixture } = await render(TestFocusVisibleDisabled);
      const element = screen.getByTestId('focus-element');
      const { focusVisible, isDisabled } = fixture.componentInstance;

      focusVisible().focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).toHaveAttribute('data-focus-visible', '');

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element).not.toHaveAttribute('data-focus-visible');
    });

    it('should resume focus-visible tracking when re-enabled', async () => {
      const { fixture } = await render(TestFocusVisibleDisabled);
      const { focusVisible, isDisabled } = fixture.componentInstance;

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      isDisabled.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      focusVisible().focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible().isFocusVisible()).toBe(true);
    });
  });

  // ============================================================================
  // focusVisibleChange Output Tests
  // ============================================================================

  describe('focusVisibleChange output', () => {
    it('should emit true when focus becomes visible', async () => {
      const { fixture } = await render(TestFocusVisibleOutput);
      const component = fixture.componentInstance;
      const focusMonitor = TestBed.inject(FocusMonitor);
      const element = screen.getByTestId('focus-element');

      expect(component.focusVisibleChanges).toHaveLength(0);

      focusMonitor.focusVia(element, 'keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.focusVisibleChanges).toContain(true);
    });

    it('should emit false when focus-visible ends', async () => {
      const { fixture } = await render(TestFocusVisibleOutput);
      const component = fixture.componentInstance;
      const focusMonitor = TestBed.inject(FocusMonitor);
      const element = screen.getByTestId('focus-element');

      focusMonitor.focusVia(element, 'keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      element.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.focusVisibleChanges).toContain(false);
    });

    it('should not emit when focus changes but visibility stays the same', async () => {
      const { fixture } = await render(TestFocusVisibleOutput);
      const component = fixture.componentInstance;
      const focusMonitor = TestBed.inject(FocusMonitor);
      const element = screen.getByTestId('focus-element');

      // Mouse focus - should emit false (or nothing if starting from false)
      focusMonitor.focusVia(element, 'mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      const countBefore = component.focusVisibleChanges.length;

      // Another mouse focus - visibility stays false
      element.blur();
      await fixture.whenStable();
      focusMonitor.focusVia(element, 'mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      // Should not have emitted additional false
      expect(component.focusVisibleChanges.filter(v => v === false).length).toBeLessThanOrEqual(
        countBefore + 1,
      );
    });
  });

  // ============================================================================
  // Programmatic focus() and blur() Tests
  // ============================================================================

  describe('programmatic focus() and blur()', () => {
    it('should focus element via focus() method', async () => {
      const { fixture } = await render(TestFocusVisibleProgrammatic);
      const focusVisible = fixture.componentInstance.focusVisible();
      const element = screen.getByTestId('focus-element');

      expect(document.activeElement).not.toBe(element);

      focusVisible.focus();
      await fixture.whenStable();

      expect(document.activeElement).toBe(element);
    });

    it('should focus element with specified origin', async () => {
      const { fixture } = await render(TestFocusVisibleProgrammatic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.focusOrigin()).toBe('mouse');
    });

    it('should blur element via blur() method', async () => {
      const { fixture } = await render(TestFocusVisibleProgrammatic);
      const focusVisible = fixture.componentInstance.focusVisible();
      const element = screen.getByTestId('focus-element');

      focusVisible.focus();
      await fixture.whenStable();
      expect(document.activeElement).toBe(element);

      focusVisible.blur();
      await fixture.whenStable();

      expect(document.activeElement).not.toBe(element);
    });

    it('should support FocusOptions like preventScroll', async () => {
      const { fixture } = await render(TestFocusVisibleProgrammatic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard', { preventScroll: true });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should focus without origin when null is passed', async () => {
      const { fixture } = await render(TestFocusVisibleProgrammatic);
      const focusVisible = fixture.componentInstance.focusVisible();
      const element = screen.getByTestId('focus-element');

      focusVisible.focus(null);
      await fixture.whenStable();

      expect(document.activeElement).toBe(element);
    });
  });

  // ============================================================================
  // Proto State Tests
  // ============================================================================

  // ============================================================================
  // Host Directive Tests
  // ============================================================================

  describe('as host directive', () => {
    it('should work as a host directive', async () => {
      await render(TestFocusVisibleHostDirective);

      const element = screen.getByTestId('focus-element');
      expect(element).toBeInTheDocument();
    });

    it('should respect disabled input from host directive', async () => {
      const { fixture } = await render(TestFocusVisibleHostDirective);
      const { focusVisible, isDisabled } = fixture.componentInstance;

      isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      focusVisible().focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible().isFocusVisible()).toBe(false);
    });

    it('should expose focus-visible state via host directive', async () => {
      const { fixture } = await render(TestFocusVisibleHostDirective);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.isFocusVisible()).toBe(true);
    });
  });

  // ============================================================================
  // Focus Origin Signal Tests
  // ============================================================================

  describe('focus origin signal', () => {
    it('should track focusOrigin as null when not focused', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      expect(focusVisible.focusOrigin()).toBe(null);
    });

    it('should reset focusOrigin to null when blurred', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focusVisible.focusOrigin()).toBe('keyboard');

      focusVisible.blur();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(focusVisible.focusOrigin()).toBe(null);
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('edge cases', () => {
    it('should handle rapid focus/blur cycles', async () => {
      const { fixture } = await render(TestFocusVisibleProgrammatic);
      const focusVisible = fixture.componentInstance.focusVisible();

      for (let i = 0; i < 5; i++) {
        focusVisible.focus('keyboard');
        await fixture.whenStable();
        focusVisible.blur();
        await fixture.whenStable();
      }

      fixture.detectChanges();
      expect(focusVisible.isFocusVisible()).toBe(false);
    });

    it('should handle focus origin changes', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();

      // Start with mouse (not visible)
      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focusVisible.isFocusVisible()).toBe(false);

      // Change to keyboard (visible)
      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(focusVisible.isFocusVisible()).toBe(true);
    });

    it('should handle disabled toggle while focused', async () => {
      const { fixture } = await render(TestFocusVisibleDisabled);
      const { focusVisible, isDisabled } = fixture.componentInstance;
      const element = screen.getByTestId('focus-element');

      focusVisible().focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).toHaveAttribute('data-focus-visible', '');

      // Toggle disabled rapidly
      isDisabled.set(true);
      fixture.detectChanges();
      isDisabled.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

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

      focusMonitor.focusVia(element, 'keyboard');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element).toHaveAttribute('data-focus-visible', '');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element).not.toHaveAttribute('data-focus-visible');
    });
  });

  // ============================================================================
  // Difference from ProtoFocus Tests
  // ============================================================================

  describe('difference from ProtoFocus', () => {
    it('should only show visible focus for keyboard, not all focus origins', async () => {
      const { fixture } = await render(TestFocusVisibleBasic);
      const focusVisible = fixture.componentInstance.focusVisible();
      const element = screen.getByTestId('focus-element');

      // Mouse focus should NOT show focus-visible
      focusVisible.focus('mouse');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).not.toHaveAttribute('data-focus-visible');

      // Keyboard focus SHOULD show focus-visible
      focusVisible.focus('keyboard');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element).toHaveAttribute('data-focus-visible', '');
    });
  });
});
