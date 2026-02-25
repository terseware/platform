import { render } from '@testing-library/angular';
import { TerseButton } from './terse-button';

describe('TerseButton', () => {
  it('should set the disabled attribute when disabled', async () => {
    const container = await render(`<button terseButton [disabled]="true"></button>`, {
      imports: [TerseButton],
    });
    expect(container.getByRole('button')).toHaveAttribute('disabled');
  });
});
