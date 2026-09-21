import { plainToInstance } from 'class-transformer';
import { Trim } from './trim.decorator';

class Sample {
  @Trim()
  value!: unknown;
}

describe('Trim', () => {
  it('strips surrounding whitespace from a string', () => {
    expect(plainToInstance(Sample, { value: '  ada  ' }).value).toBe('ada');
  });

  it('leaves a non-string value untouched', () => {
    expect(plainToInstance(Sample, { value: 7 }).value).toBe(7);
  });
});
