import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { Interact } from '@terseware/proto/interact';
import { render } from '@testing-library/angular';
import { ProtoFieldDescription } from './field-description';
import { ProtoFieldLabel } from './field-label';
import { resolver } from './field-metadata';
import { ProtoFormField } from './form-field';

describe('Forms', () => {
  @Component({
    selector: 'test-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormRoot, FormField, ProtoFieldDescription, ProtoFieldLabel],
    template: `
      <form [formRoot]="form">
        @if (showLabel()) {
          <label protoFieldLabel [for]="form.name">Name</label>
        }
        <input proto [formField]="form.name" />
        @if (showDescription1()) {
          <p [protoFieldDescription]="form.name"></p>
        }
        @if (showDescription2()) {
          <p [protoFieldDescription]="form.name"></p>
        }
      </form>
    `,
  })
  class TestHost {
    readonly showLabel = signal(true);
    readonly showDescription1 = signal(true);
    readonly showDescription2 = signal(false);
    readonly form = form(signal({ name: 'James' }));
  }

  it('should bind', async () => {
    const { fixture } = await render(TestHost);

    const fieldDescriptionId1 = fixture.debugElement
      .query(By.directive(ProtoFieldDescription))
      .injector.get(ProtoFieldDescription).id;
    expect(fieldDescriptionId1).toMatch(/field-description-\d+$/);

    const fieldLabelId = fixture.debugElement
      .query(By.directive(ProtoFieldLabel))
      .injector.get(ProtoFieldLabel).id;
    expect(fieldLabelId).toMatch(/field-label-\d+$/);

    const formField = fixture.debugElement.query(By.directive(FormField)).injector.get(FormField);
    expect(formField.field()().value()).toBe('James');
    expect(formField.element).toHaveAttribute('aria-describedby', fieldDescriptionId1);
    expect(formField.element).toHaveAttribute('aria-labelledby', fieldLabelId);

    fixture.componentInstance.showDescription1.set(false);
    fixture.componentInstance.showDescription2.set(true);
    fixture.detectChanges();
    expect(formField.element).toHaveAttribute('aria-describedby');
    expect(formField.element.getAttribute('aria-describedby')).not.toContain(fieldDescriptionId1);
    expect(formField.element).toHaveAttribute('aria-labelledby', fieldLabelId);

    fixture.componentInstance.showLabel.set(false);
    fixture.detectChanges();
    expect(formField.element).not.toHaveAttribute('aria-labelledby', fieldLabelId);
    expect(formField.element).not.toHaveAttribute('aria-describedby', fieldDescriptionId1);

    fixture.componentInstance.showDescription2.set(false);
    fixture.detectChanges();
    expect(formField.element).not.toHaveAttribute('aria-describedby', fieldLabelId);
    expect(formField.element).not.toHaveAttribute('aria-labelledby', fieldLabelId);
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
        resolver(path.name, Interact, {
          tabIndex: ctx => ctx.stateOf(path.tabIndex).value(),
        });
      });
    }

    const { fixture } = await render(TestHost);
    const input = fixture.debugElement.query(By.directive(FormField)).nativeElement as HTMLElement;

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
        resolver(path.name, Interact, {
          tabIndex: ctx => ctx.stateOf(path.tabIndex).value(),
        });
        resolver(path.name, Interact, {
          disabled: () => true,
          focusableWhenDisabled: () => true,
        });
      });
    }

    const { fixture } = await render(TestHost);
    const el = fixture.debugElement.query(By.directive(FormField)).nativeElement as HTMLElement;

    expect(el).toHaveAttribute('tabindex', '3');
    expect(el).toHaveAttribute('data-disabled-focusable', '');
  });
});
