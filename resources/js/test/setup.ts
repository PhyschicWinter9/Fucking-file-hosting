import '@testing-library/jest-dom';

// Mock InertiaJS
global.route = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock document.execCommand
document.execCommand = vi.fn().mockReturnValue(true);

// Mock fetch
global.fetch = vi.fn();

// Mock XMLHttpRequest
global.XMLHttpRequest = vi.fn(() => ({
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  upload: {
    addEventListener: vi.fn(),
  },
  status: 200,
  responseText: JSON.stringify({ success: true }),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));