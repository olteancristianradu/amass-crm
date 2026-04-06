import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Btn } from '../components/ui/Btn';

// Mock the tokens module to avoid import issues
vi.mock('@/styles/tokens', () => ({
  T: {
    accent: '#C8102E',
    text2: '#888888',
    border: '#333333',
    redLt: '#ffeeee',
    red: '#ff0000',
  },
}));

describe('Btn', () => {
  it('renders children text', () => {
    render(<Btn>Click me</Btn>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<Btn>Test</Btn>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>Click</Btn>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Btn disabled>Disabled</Btn>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick} disabled>Click</Btn>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders with primary variant by default', () => {
    render(<Btn>Primary</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('#C8102E');
    expect(btn.style.color).toBe('#fff');
  });

  it('renders with ghost variant', () => {
    render(<Btn variant="ghost">Ghost</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
  });

  it('renders with danger variant', () => {
    render(<Btn variant="danger">Danger</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.color).toBe('#ff0000');
  });

  it('applies custom style', () => {
    render(<Btn style={{ marginTop: '10px' }}>Styled</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.marginTop).toBe('10px');
  });

  it('applies size sm', () => {
    render(<Btn size="sm">Small</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.fontSize).toBe('11px');
  });

  it('applies size lg', () => {
    render(<Btn size="lg">Large</Btn>);
    const btn = screen.getByRole('button');
    expect(btn.style.fontSize).toBe('14px');
  });
});
