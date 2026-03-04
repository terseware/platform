import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { render } from '@testing-library/angular';
import { ProtoFieldDescription } from './field-description';
import { ProtoFieldLabel } from './field-label';

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
