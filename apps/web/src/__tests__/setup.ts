import '@testing-library/jest-dom/vitest';

// Ensure localStorage is fully functional in test environment
const store: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string): string | null => store[key] ?? null,
  setItem: (key: string, value: string): void => {
    store[key] = String(value);
  },
  removeItem: (key: string): void => {
    delete store[key];
  },
  clear: (): void => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  get length(): number {
    return Object.keys(store).length;
  },
  key: (index: number): string | null => {
    return Object.keys(store)[index] ?? null;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});
