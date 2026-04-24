import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (ClassName Utility)', () => {
  it('should merge simple strings', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  it('should resolve tailwind class conflicts using tailwind-merge', () => {
    // py-4 overrides p-2 for the y-axis
    expect(cn('p-2', 'py-4')).toBe('p-2 py-4');

    // text-blue-500 overrides text-red-500
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');

    // mt-4 overrides mt-2
    expect(cn('mt-2', 'mt-4')).toBe('mt-4');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('should handle objects with conditional classes', () => {
    expect(cn({
      'class1': true,
      'class2': false,
      'class3': true
    })).toBe('class1 class3');
  });

  it('should handle undefined, null, and empty string gracefully', () => {
    expect(cn('class1', undefined, null, '', 'class2')).toBe('class1 class2');
  });

  it('should handle a mix of inputs', () => {
    expect(cn(
      'class1',
      ['class2', 'class3'],
      { 'class4': true, 'class5': false },
      undefined,
      'text-red-500 text-blue-500' // tailwind-merge should resolve this internal conflict
    )).toBe('class1 class2 class3 class4 text-blue-500');
  });
});
