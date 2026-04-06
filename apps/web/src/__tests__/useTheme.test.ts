import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.removeItem('amass-theme');
    localStorage.removeItem('amass-accent');
    localStorage.removeItem('amass-accent-dk');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-lt');
    document.documentElement.style.removeProperty('--accent-glow');
    document.documentElement.style.removeProperty('--accent-dk');
  });

  it('defaults to dark theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(true);
  });

  it('reads saved theme from localStorage', () => {
    localStorage.setItem('amass-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(false);
  });

  it('toggle switches between dark and light', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isDark).toBe(false);
    expect(localStorage.getItem('amass-theme')).toBe('light');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isDark).toBe(true);
    expect(localStorage.getItem('amass-theme')).toBe('dark');
  });

  it('sets data-theme attribute on document element', () => {
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('setAccent sets CSS variables', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setAccent('#C8102E', '#8B0000');
    });

    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#C8102E');
    expect(document.documentElement.style.getPropertyValue('--accent-lt')).toBe('#C8102E26');
    expect(document.documentElement.style.getPropertyValue('--accent-glow')).toBe('#C8102E66');
    expect(document.documentElement.style.getPropertyValue('--accent-dk')).toBe('#8B0000');
    expect(localStorage.getItem('amass-accent')).toBe('#C8102E');
    expect(localStorage.getItem('amass-accent-dk')).toBe('#8B0000');
  });

  it('setAccent without dark color does not set --accent-dk', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setAccent('#00FF00');
    });

    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#00FF00');
    // --accent-dk should not be set (empty or same as before)
    expect(localStorage.getItem('amass-accent-dk')).toBeNull();
  });
});
