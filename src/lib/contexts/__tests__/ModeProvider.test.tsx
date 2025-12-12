import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ModeProvider, useAppMode } from '../ModeProvider';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock window.location
const mockLocation = {
  search: '',
  pathname: '/',
  href: 'http://localhost:3000/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('ModeProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    mockLocation.search = '';
    
    // Reset mocks
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      replace: vi.fn((url: string) => {
        const urlObj = new URL(url, 'http://localhost:3000');
        mockLocation.search = urlObj.search;
        mockLocation.pathname = urlObj.pathname;
      }),
    });
    (usePathname as any).mockReturnValue('/');
    (useSearchParams as any).mockReturnValue(new URLSearchParams(mockLocation.search));
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ModeProvider>{children}</ModeProvider>
  );

  it('should default to poc mode when no localStorage or URL param exists', () => {
    const { result } = renderHook(() => useAppMode(), { wrapper });
    expect(result.current.mode).toBe('poc');
  });

  it('should read mode from localStorage', () => {
    localStorage.setItem('zap_app_mode', 'prod_trials');
    const { result } = renderHook(() => useAppMode(), { wrapper });
    expect(result.current.mode).toBe('prod_trials');
  });

  it('should prioritize URL param over localStorage', () => {
    localStorage.setItem('zap_app_mode', 'poc');
    mockLocation.search = '?mode=prod_trials';
    (useSearchParams as any).mockReturnValue(new URLSearchParams('mode=prod_trials'));
    
    const { result } = renderHook(() => useAppMode(), { wrapper });
    expect(result.current.mode).toBe('prod_trials');
  });

  it('should update localStorage and URL when setMode is called', async () => {
    const { result } = renderHook(() => useAppMode(), { wrapper });
    
    act(() => {
      result.current.setMode('prod_trials');
    });

    await waitFor(() => {
      expect(result.current.mode).toBe('prod_trials');
      expect(localStorage.getItem('zap_app_mode')).toBe('prod_trials');
    });
  });

  it('should sync localStorage when URL param changes', async () => {
    localStorage.setItem('zap_app_mode', 'poc');
    const { result } = renderHook(() => useAppMode(), { wrapper });
    
    // Simulate URL change (e.g., browser back/forward)
    mockLocation.search = '?mode=prod_trials';
    (useSearchParams as any).mockReturnValue(new URLSearchParams('mode=prod_trials'));
    
    // Re-render to trigger useEffect
    const { rerender } = renderHook(() => useAppMode(), { wrapper });
    rerender();

    await waitFor(() => {
      expect(localStorage.getItem('zap_app_mode')).toBe('prod_trials');
    });
  });

  it('should handle invalid mode values by defaulting to poc', () => {
    localStorage.setItem('zap_app_mode', 'invalid_mode');
    const { result } = renderHook(() => useAppMode(), { wrapper });
    expect(result.current.mode).toBe('poc');
  });

  it('should update URL query param when mode changes', async () => {
    const mockReplace = vi.fn();
    (useRouter as any).mockReturnValue({ replace: mockReplace });
    (usePathname as any).mockReturnValue('/dashboard');
    
    const { result } = renderHook(() => useAppMode(), { wrapper });
    
    act(() => {
      result.current.setMode('prod_trials');
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard?mode=prod_trials');
    });
  });

  it('should preserve other URL query params when updating mode', async () => {
    mockLocation.search = '?other=value&mode=poc';
    (useSearchParams as any).mockReturnValue(new URLSearchParams('other=value&mode=poc'));
    const mockReplace = vi.fn();
    (useRouter as any).mockReturnValue({ replace: mockReplace });
    (usePathname as any).mockReturnValue('/page');
    
    const { result } = renderHook(() => useAppMode(), { wrapper });
    
    act(() => {
      result.current.setMode('prod_trials');
    });

    await waitFor(() => {
      const callUrl = mockReplace.mock.calls[0][0];
      const urlParams = new URLSearchParams(callUrl.split('?')[1]);
      expect(urlParams.get('mode')).toBe('prod_trials');
      expect(urlParams.get('other')).toBe('value');
    });
  });
});

