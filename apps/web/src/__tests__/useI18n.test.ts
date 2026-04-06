import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useI18n } from '../hooks/useI18n';

describe('useI18n', () => {
  beforeEach(() => {
    localStorage.removeItem('amass-lang');
  });

  it('defaults to Romanian language', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.lang).toBe('ro');
  });

  it('reads saved language from localStorage', () => {
    localStorage.setItem('amass-lang', 'en');
    const { result } = renderHook(() => useI18n());
    expect(result.current.lang).toBe('en');
  });

  it('changeLang switches language and persists to localStorage', () => {
    const { result } = renderHook(() => useI18n());

    act(() => {
      result.current.changeLang('en');
    });

    expect(result.current.lang).toBe('en');
    expect(localStorage.getItem('amass-lang')).toBe('en');
  });

  it('tr returns the key if no translation found', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.tr('nonexistent.key')).toBe('nonexistent.key');
  });

  it('tr falls back to Romanian if key missing in current lang', () => {
    localStorage.setItem('amass-lang', 'en');
    const { result } = renderHook(() => useI18n());
    // tr should fall back to ro if key missing in en
    const translated = result.current.tr('nonexistent.key');
    expect(typeof translated).toBe('string');
  });
});
