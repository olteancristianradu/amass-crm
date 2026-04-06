import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../components/ui/Badge';

describe('Badge', () => {
  it('renders the text content', () => {
    render(<Badge text="Active" color="#00ff00" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders as a span element', () => {
    render(<Badge text="Test" color="#ff0000" />);
    const badge = screen.getByText('Test');
    expect(badge.tagName).toBe('SPAN');
  });

  it('applies color as text color', () => {
    render(<Badge text="Status" color="#C8102E" />);
    const badge = screen.getByText('Status');
    expect(badge.style.color).toBe('#C8102E');
  });

  it('applies color with transparency for background', () => {
    render(<Badge text="Status" color="#C8102E" />);
    const badge = screen.getByText('Status');
    expect(badge.style.background).toBe('#C8102E22');
  });

  it('applies inline-block display', () => {
    render(<Badge text="Inline" color="#000" />);
    const badge = screen.getByText('Inline');
    expect(badge.style.display).toBe('inline-block');
  });

  it('has border radius', () => {
    render(<Badge text="Rounded" color="#000" />);
    const badge = screen.getByText('Rounded');
    expect(badge.style.borderRadius).toBe('6px');
  });

  it('has font weight 700', () => {
    render(<Badge text="Bold" color="#000" />);
    const badge = screen.getByText('Bold');
    expect(badge.style.fontWeight).toBe('700');
  });
});
