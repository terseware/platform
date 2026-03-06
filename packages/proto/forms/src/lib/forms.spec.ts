import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { Interact } from '@terseware/proto/interact';
import { fireEvent, render } from '@testing-library/angular';
import { ProtoFieldDescription } from './field-description';
import { PROTO_FIELD_ERROR_STRATEGY, ProtoFieldError } from './field-error';
import { ProtoFieldLabel } from './field-label';
import { resolver } from './field-metadata';
import { ProtoFormField } from './form-field';

const noopSubmission = { submission: { action: async () => null } };

describe('Forms', () => {
  describe('ProtoFieldLabel', () => {
    @Component({
      selector: 'test-label',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [FormRoot, FormField, ProtoFieldLabel, ProtoFormField],
      template: `
        <form [formRoot]="form">
          @if (showLabel()) {
            <label protoFieldLabel [for]="form.name">Name</label>
          }
          <input proto [formField]="form.name" />
        </form>
      `,
    })
    class TestHost {
      readonly showLabel = signal(true);
      readonly form = form(signal({ name: 'James' }), _ => {}, noopSubmission);
    }

    it('should generate a unique id on the label element', async () => {
      const { fixture } = await render(TestHost);

      const label = fixture.debugElement.query(By.directive(ProtoFieldLabel));
      expect(label.nativeElement).toHaveAttribute('id');
      expect(label.nativeElement.id).toMatch(/field-label-\d+$/);
    });

    it('should set aria-labelledby on the field element', async () => {
      const { fixture } = await render(TestHost);

      const labelId = fixture.debugElement
        .query(By.directive(ProtoFieldLabel))
        .injector.get(ProtoFieldLabel).id;
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      expect(input).toHaveAttribute('aria-labelledby', labelId);
    });

    it('should remove aria-labelledby when label is destroyed', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).toHaveAttribute('aria-labelledby');

      fixture.componentInstance.showLabel.set(false);
      fixture.detectChanges();

      expect(input).not.toHaveAttribute('aria-labelledby');
    });

    it('should set the for attribute on native <label> elements', async () => {
      const { fixture } = await render(TestHost);

      const label = fixture.debugElement.query(By.directive(ProtoFieldLabel));
      const protoFormField = fixture.debugElement
        .query(By.directive(ProtoFormField))
        .injector.get(ProtoFormField);

      expect(label.nativeElement).toHaveAttribute('for', protoFormField.context.id);
    });

    it('should not set the for attribute on non-native label elements', async () => {
      @Component({
        selector: 'test-span-label',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFieldLabel, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <span protoFieldLabel [for]="form.name">Name</span>
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class SpanLabelHost {
        readonly form = form(signal({ name: '' }), _ => {}, noopSubmission);
      }

      const { fixture } = await render(SpanLabelHost);
      const span = fixture.debugElement.query(By.directive(ProtoFieldLabel));
      expect(span.nativeElement).not.toHaveAttribute('for');
    });

    it('should support multiple labels on the same field', async () => {
      @Component({
        selector: 'test-multi-label',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFieldLabel, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <label protoFieldLabel [for]="form.name">Name</label>
            <span protoFieldLabel [for]="form.name">Required</span>
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class MultiLabelHost {
        readonly form = form(signal({ name: '' }), _ => {}, noopSubmission);
      }

      const { fixture } = await render(MultiLabelHost);
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      const labels = fixture.debugElement.queryAll(By.directive(ProtoFieldLabel));

      const labelIds = labels.map(l => l.injector.get(ProtoFieldLabel).id);
      const ariaLabelledby = input.getAttribute('aria-labelledby');

      for (const id of labelIds) {
        expect(ariaLabelledby).toContain(id);
      }
    });
  });

  describe('ProtoFieldDescription', () => {
    @Component({
      selector: 'test-description',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [FormRoot, FormField, ProtoFieldDescription, ProtoFormField],
      template: `
        <form [formRoot]="form">
          <input proto [formField]="form.name" />
          @if (showDescription1()) {
            <p [protoFieldDescription]="form.name">Help text 1</p>
          }
          @if (showDescription2()) {
            <p [protoFieldDescription]="form.name">Help text 2</p>
          }
        </form>
      `,
    })
    class TestHost {
      readonly showDescription1 = signal(true);
      readonly showDescription2 = signal(false);
      readonly form = form(signal({ name: '' }), _ => {}, noopSubmission);
    }

    it('should generate a unique id on the description element', async () => {
      const { fixture } = await render(TestHost);

      const desc = fixture.debugElement.query(By.directive(ProtoFieldDescription));
      expect(desc.nativeElement).toHaveAttribute('id');
      expect(desc.nativeElement.id).toMatch(/field-description-\d+$/);
    });

    it('should set aria-describedby on the field element', async () => {
      const { fixture } = await render(TestHost);

      const descId = fixture.debugElement
        .query(By.directive(ProtoFieldDescription))
        .injector.get(ProtoFieldDescription).id;
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      expect(input).toHaveAttribute('aria-describedby', descId);
    });

    it('should remove aria-describedby when description is destroyed', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).toHaveAttribute('aria-describedby');

      fixture.componentInstance.showDescription1.set(false);
      fixture.detectChanges();

      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('should swap aria-describedby when descriptions change', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      const desc1Id = fixture.debugElement
        .query(By.directive(ProtoFieldDescription))
        .injector.get(ProtoFieldDescription).id;

      expect(input).toHaveAttribute('aria-describedby', desc1Id);

      fixture.componentInstance.showDescription1.set(false);
      fixture.componentInstance.showDescription2.set(true);
      fixture.detectChanges();

      const desc2Id = fixture.debugElement
        .query(By.directive(ProtoFieldDescription))
        .injector.get(ProtoFieldDescription).id;

      expect(input.getAttribute('aria-describedby')).not.toContain(desc1Id);
      expect(input).toHaveAttribute('aria-describedby', desc2Id);
    });

    it('should support multiple descriptions on the same field', async () => {
      @Component({
        selector: 'test-multi-desc',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFieldDescription, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
            <p [protoFieldDescription]="form.name">Hint 1</p>
            <p [protoFieldDescription]="form.name">Hint 2</p>
          </form>
        `,
      })
      class MultiDescHost {
        readonly form = form(signal({ name: '' }), _ => {}, noopSubmission);
      }

      const { fixture } = await render(MultiDescHost);
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      const descs = fixture.debugElement.queryAll(By.directive(ProtoFieldDescription));

      const descIds = descs.map(d => d.injector.get(ProtoFieldDescription).id);
      const ariaDescribedby = input.getAttribute('aria-describedby');

      for (const id of descIds) {
        expect(ariaDescribedby).toContain(id);
      }
    });
  });

  describe('ProtoFieldError', () => {
    @Component({
      selector: 'test-error',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [FormRoot, FormField, ProtoFieldError, ProtoFormField],
      template: `
        <form [formRoot]="form">
          <input proto [formField]="form.name" />
          @for (error of form.name().errors(); track error) {
            <p [protoFieldError]="error">{{ error.message }}</p>
          }
        </form>
      `,
    })
    class TestHost {
      readonly form = form(
        signal({ name: '' }),
        path => {
          required(path.name, { message: 'Name is required' });
        },
        noopSubmission,
      );
    }

    it('should generate a unique id on the error element', async () => {
      const { fixture } = await render(TestHost);

      const errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
      expect(errorEl.nativeElement).toHaveAttribute('id');
      expect(errorEl.nativeElement.id).toMatch(/field-error-\d+$/);
    });

    it('should set role="alert" on the error element', async () => {
      const { fixture } = await render(TestHost);

      const errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
      expect(errorEl.nativeElement).toHaveAttribute('aria-atomic', 'true');
    });

    it('should set aria-live="polite" on the error element', async () => {
      const { fixture } = await render(TestHost);

      const errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
      expect(errorEl.nativeElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should hide error by default with onSubmit strategy', async () => {
      const { fixture } = await render(TestHost);

      const errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
      expect(errorEl.nativeElement).toHaveAttribute('aria-hidden');
      expect(errorEl.nativeElement.style.display).toBe('none');
    });

    it('should show error after form submission', async () => {
      const { fixture } = await render(TestHost);

      const formEl = fixture.debugElement.query(By.css('form')).nativeElement;
      fireEvent.submit(formEl);
      fixture.detectChanges();

      const errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
      expect(errorEl.nativeElement).not.toHaveAttribute('aria-hidden');
      expect(errorEl.nativeElement.style.display).not.toBe('none');
      expect(errorEl.nativeElement).toHaveAttribute('data-errors-visible', '');
    });

    it('should add error id to aria-describedby on the field', async () => {
      const { fixture } = await render(TestHost);

      const errorId = fixture.debugElement
        .query(By.directive(ProtoFieldError))
        .injector.get(ProtoFieldError).id;
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      expect(input.getAttribute('aria-describedby')).toContain(errorId);
    });

    it('should set aria-invalid on the field when errors are visible', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).not.toHaveAttribute('aria-invalid');

      const formEl = fixture.debugElement.query(By.css('form')).nativeElement;
      fireEvent.submit(formEl);
      fixture.detectChanges();

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should set data-errors-visible on the field when errors are visible', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).not.toHaveAttribute('data-errors-visible');

      const formEl = fixture.debugElement.query(By.css('form')).nativeElement;
      fireEvent.submit(formEl);
      fixture.detectChanges();

      expect(input).toHaveAttribute('data-errors-visible', '');
    });

    describe('onBlur strategy', () => {
      @Component({
        selector: 'test-error-blur',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFieldError, ProtoFormField],
        providers: [{ provide: PROTO_FIELD_ERROR_STRATEGY, useValue: 'onBlur' }],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
            @for (error of form.name().errors(); track error) {
              <p [protoFieldError]="error">{{ error.message }}</p>
            }
          </form>
        `,
      })
      class BlurHost {
        readonly form = form(
          signal({ name: '' }),
          path => {
            required(path.name, { message: 'Name is required' });
          },
          noopSubmission,
        );
      }

      it('should show error when field is touched', async () => {
        const { fixture } = await render(BlurHost);

        const errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
        expect(errorEl.nativeElement).toHaveAttribute('aria-hidden');

        const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
        fireEvent.focus(input);
        fireEvent.blur(input);
        fixture.detectChanges();

        expect(errorEl.nativeElement).not.toHaveAttribute('aria-hidden');
      });
    });

    describe('onChange strategy', () => {
      @Component({
        selector: 'test-error-change',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFieldError, ProtoFormField],
        providers: [{ provide: PROTO_FIELD_ERROR_STRATEGY, useValue: 'onChange' }],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
            @for (error of form.name().errors(); track error) {
              <p [protoFieldError]="error">{{ error.message }}</p>
            }
          </form>
        `,
      })
      class ChangeHost {
        readonly form = form(
          signal({ name: 'initial' }),
          path => {
            required(path.name, { message: 'Name is required' });
          },
          noopSubmission,
        );
      }

      it('should show error when field is dirty', async () => {
        const { fixture } = await render(ChangeHost);

        // Initially no errors visible (field is valid and not dirty)
        const input = fixture.debugElement.query(By.directive(FormField))
          .nativeElement as HTMLInputElement;

        // Clear the input to trigger both dirty and required error
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        const errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
        expect(errorEl.nativeElement).not.toHaveAttribute('aria-hidden');
      });
    });

    describe('custom strategy', () => {
      @Component({
        selector: 'test-error-custom',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFieldError, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
            @for (error of form.name().errors(); track error) {
              <p [protoErrorStrategy]="strategy" [protoFieldError]="error">{{ error.message }}</p>
            }
          </form>
        `,
      })
      class CustomStrategyHost {
        readonly strategy = (state: FieldState<string>) => state.touched() && state.dirty();
        readonly form = form(
          signal({ name: '' }),
          path => {
            required(path.name, { message: 'Name is required' });
          },
          noopSubmission,
        );
      }

      it('should use custom strategy function to determine visibility', async () => {
        const { fixture } = await render(CustomStrategyHost);

        const input = fixture.debugElement.query(By.directive(FormField))
          .nativeElement as HTMLInputElement;

        // Touch only - should still be hidden (not dirty yet)
        fireEvent.focus(input);
        fireEvent.blur(input);
        fixture.detectChanges();

        // Only touched, not dirty, so errors stay hidden
        let errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
        expect(errorEl.nativeElement).toHaveAttribute('aria-hidden');

        // Now make dirty + touch to satisfy custom strategy
        fireEvent.focus(input);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        fireEvent.blur(input);
        fixture.detectChanges();

        errorEl = fixture.debugElement.query(By.directive(ProtoFieldError));
        expect(errorEl.nativeElement).not.toHaveAttribute('aria-hidden');
      });
    });
  });

  describe('FieldResolver data attributes', () => {
    @Component({
      selector: 'test-data-attrs',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [FormRoot, FormField, ProtoFormField],
      template: `
        <form [formRoot]="form">
          <input proto [formField]="form.name" />
        </form>
      `,
    })
    class TestHost {
      readonly model = signal({ name: 'James' });
      readonly form = form(this.model, _ => {}, noopSubmission);
    }

    it('should set data-pristine when field is not dirty', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).toHaveAttribute('data-pristine', '');
      expect(input).not.toHaveAttribute('data-dirty');
    });

    it('should set data-dirty and remove data-pristine when field is modified', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField))
        .nativeElement as HTMLInputElement;
      input.value = 'changed';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      expect(input).toHaveAttribute('data-dirty', '');
      expect(input).not.toHaveAttribute('data-pristine');
    });

    it('should set data-touched when field is blurred', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).not.toHaveAttribute('data-touched');

      fireEvent.focus(input);
      fireEvent.blur(input);
      fixture.detectChanges();

      expect(input).toHaveAttribute('data-touched', '');
    });

    it('should set data-filled when field has a non-empty value', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).toHaveAttribute('data-filled', '');
    });

    it('should remove data-filled when field is emptied', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField))
        .nativeElement as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      expect(input).not.toHaveAttribute('data-filled');
    });

    it('should set data-valid when field has no errors', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).toHaveAttribute('data-valid', '');
      expect(input).not.toHaveAttribute('data-invalid');
    });

    it('should set data-invalid when field has validation errors', async () => {
      @Component({
        selector: 'test-invalid',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class InvalidHost {
        readonly form = form(
          signal({ name: '' }),
          path => {
            required(path.name, { message: 'Required' });
          },
          noopSubmission,
        );
      }

      const { fixture } = await render(InvalidHost);
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      expect(input).toHaveAttribute('data-invalid', '');
      expect(input).not.toHaveAttribute('data-valid');
    });

    it('should set data-required when field has required validation', async () => {
      @Component({
        selector: 'test-required',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class RequiredHost {
        readonly form = form(
          signal({ name: '' }),
          path => {
            required(path.name, { message: 'Required' });
          },
          noopSubmission,
        );
      }

      const { fixture } = await render(RequiredHost);
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      expect(input).toHaveAttribute('data-required', '');
    });
  });

  describe('ProtoFormField', () => {
    it('should expose FieldResolver context', async () => {
      @Component({
        selector: 'test-form-field',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class TestHost {
        readonly form = form(signal({ name: 'James' }), _ => {}, noopSubmission);
      }

      const { fixture } = await render(TestHost);
      const protoFormField = fixture.debugElement
        .query(By.directive(ProtoFormField))
        .injector.get(ProtoFormField);

      expect(protoFormField.context).toBeDefined();
      expect(protoFormField.context.element).toBeInstanceOf(HTMLInputElement);
    });

    it('should assign a unique id to the field element', async () => {
      @Component({
        selector: 'test-field-id',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class TestHost {
        readonly form = form(signal({ name: '' }), _ => {}, noopSubmission);
      }

      const { fixture } = await render(TestHost);
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      expect(input).toHaveAttribute('id');
      expect(input.id).toMatch(/field-\d+$/);
    });
  });

  describe('Combined a11y wiring', () => {
    @Component({
      selector: 'test-combined',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        FormRoot,
        FormField,
        ProtoFieldDescription,
        ProtoFieldError,
        ProtoFieldLabel,
        ProtoFormField,
      ],
      template: `
        <form [formRoot]="form">
          @if (showLabel()) {
            <label protoFieldLabel [for]="form.name">Name</label>
          }
          <input proto [formField]="form.name" />
          @if (showDescription()) {
            <p [protoFieldDescription]="form.name">Enter your full name</p>
          }
          @for (error of form.name().errors(); track error) {
            <p [protoFieldError]="error">{{ error.message }}</p>
          }
        </form>
      `,
    })
    class TestHost {
      readonly showLabel = signal(true);
      readonly showDescription = signal(true);
      readonly form = form(
        signal({ name: '' }),
        path => {
          required(path.name, { message: 'Name is required' });
        },
        noopSubmission,
      );
    }

    it('should wire label, description, and error into aria attributes', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      const labelId = fixture.debugElement
        .query(By.directive(ProtoFieldLabel))
        .injector.get(ProtoFieldLabel).id;
      const descId = fixture.debugElement
        .query(By.directive(ProtoFieldDescription))
        .injector.get(ProtoFieldDescription).id;
      const errorId = fixture.debugElement
        .query(By.directive(ProtoFieldError))
        .injector.get(ProtoFieldError).id;

      expect(input).toHaveAttribute('aria-labelledby', labelId);

      const describedby = input.getAttribute('aria-describedby')!;
      expect(describedby).toContain(descId);
      expect(describedby).toContain(errorId);
    });

    it('should include both descriptions and errors in aria-describedby', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      const descId = fixture.debugElement
        .query(By.directive(ProtoFieldDescription))
        .injector.get(ProtoFieldDescription).id;
      const errorId = fixture.debugElement
        .query(By.directive(ProtoFieldError))
        .injector.get(ProtoFieldError).id;

      const describedby = input.getAttribute('aria-describedby')!;
      expect(describedby).toContain(descId);
      expect(describedby).toContain(errorId);
    });

    it('should update aria-describedby when description is removed', async () => {
      const { fixture } = await render(TestHost);

      const descId = fixture.debugElement
        .query(By.directive(ProtoFieldDescription))
        .injector.get(ProtoFieldDescription).id;
      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      fixture.componentInstance.showDescription.set(false);
      fixture.detectChanges();

      const describedby = input.getAttribute('aria-describedby') ?? '';
      expect(describedby).not.toContain(descId);
    });

    it('should clean up aria-labelledby when label is removed', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;

      fixture.componentInstance.showLabel.set(false);
      fixture.detectChanges();

      expect(input).not.toHaveAttribute('aria-labelledby');
    });

    it('should set aria-invalid and data-errors-visible after form submission with errors', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).not.toHaveAttribute('aria-invalid');
      expect(input).not.toHaveAttribute('data-errors-visible');

      const formEl = fixture.debugElement.query(By.css('form')).nativeElement;
      fireEvent.submit(formEl);
      fixture.detectChanges();

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('data-errors-visible', '');
    });

    it('should have data-required on a required field', async () => {
      const { fixture } = await render(TestHost);

      const input = fixture.debugElement.query(By.directive(FormField)).nativeElement;
      expect(input).toHaveAttribute('data-required', '');
    });
  });

  describe('Resolver', () => {
    it('should reactively bind resolver props to the host element', async () => {
      @Component({
        selector: 'test-resolver',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class TestHost {
        readonly model = signal({ name: 'James', tabIndex: 5 });
        readonly form = form(this.model, path => {
          resolver(path.name, Interact, ctx => {
            ctx.instance.tabIndex.set(ctx.stateOf(path.tabIndex).value());
          });
        });
      }

      const { fixture } = await render(TestHost);
      const input = fixture.debugElement.query(By.directive(FormField))
        .nativeElement as HTMLElement;

      expect(input).toHaveAttribute('tabindex', '5');

      fixture.componentInstance.model.update(m => ({ ...m, tabIndex: 10 }));
      fixture.detectChanges();

      expect(input).toHaveAttribute('tabindex', '10');
    });

    it('should support multiple resolvers on the same field', async () => {
      @Component({
        selector: 'test-multi-resolver',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [FormRoot, FormField, ProtoFormField],
        template: `
          <form [formRoot]="form">
            <input proto [formField]="form.name" />
          </form>
        `,
      })
      class TestHost {
        readonly model = signal({ name: 'James', tabIndex: 3 });
        readonly form = form(this.model, path => {
          resolver(path.name, Interact, ctx => {
            ctx.instance.tabIndex.set(ctx.stateOf(path.tabIndex).value());
          });
          resolver(path.name, Interact, ctx => {
            ctx.instance.disabled.set(true);
            ctx.instance.focusableWhenDisabled.set(true);
          });
        });
      }

      const { fixture } = await render(TestHost);
      const el = fixture.debugElement.query(By.directive(FormField)).nativeElement as HTMLElement;

      expect(el).toHaveAttribute('tabindex', '3');
      expect(el).toHaveAttribute('data-disabled-focusable', '');
    });
  });
});
