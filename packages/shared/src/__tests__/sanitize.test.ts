import { describe, it, expect } from 'vitest';
import { san, sanTel, sanEmail } from '../utils/sanitize';

describe('san', () => {
  it('returns empty string for non-string input (null)', () => {
    expect(san(null)).toBe('');
  });

  it('returns empty string for non-string input (undefined)', () => {
    expect(san(undefined)).toBe('');
  });

  it('returns empty string for non-string input (number)', () => {
    expect(san(123)).toBe('');
  });

  it('returns empty string for non-string input (object)', () => {
    expect(san({})).toBe('');
  });

  it('removes < and > characters', () => {
    expect(san('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('trims whitespace', () => {
    expect(san('  hello  ')).toBe('hello');
  });

  it('truncates to default maxLen of 500', () => {
    const long = 'a'.repeat(600);
    expect(san(long).length).toBe(500);
  });

  it('truncates to custom maxLen', () => {
    expect(san('hello world', 5)).toBe('hello');
  });

  it('handles normal strings without modification', () => {
    expect(san('Ion Popescu')).toBe('Ion Popescu');
  });

  it('handles empty string', () => {
    expect(san('')).toBe('');
  });
});

describe('sanTel', () => {
  it('keeps digits', () => {
    expect(sanTel('0712345678')).toBe('0712345678');
  });

  it('keeps + for international prefix', () => {
    expect(sanTel('+40712345678')).toBe('+40712345678');
  });

  it('keeps spaces, dashes, dots, and parentheses', () => {
    expect(sanTel('+40 (712) 345-678')).toBe('+40 (712) 345-678');
  });

  it('removes letters', () => {
    expect(sanTel('0712abc345')).toBe('0712345');
  });

  it('removes special characters except allowed ones', () => {
    expect(sanTel('071#234@567!')).toBe('071234567');
  });

  it('truncates to 20 characters', () => {
    expect(sanTel('1'.repeat(30)).length).toBe(20);
  });

  it('handles HTML in phone number', () => {
    expect(sanTel('<b>0712</b>')).toBe('0712');
  });
});

describe('sanEmail', () => {
  it('returns sanitized email', () => {
    expect(sanEmail('test@example.com')).toBe('test@example.com');
  });

  it('removes HTML tags from email', () => {
    expect(sanEmail('<b>test@example.com</b>')).toBe('btest@example.com/b');
  });

  it('trims whitespace', () => {
    expect(sanEmail('  test@example.com  ')).toBe('test@example.com');
  });
});
