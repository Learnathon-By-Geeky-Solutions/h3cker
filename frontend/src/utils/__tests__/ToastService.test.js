import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../ToastService';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty toasts initially', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast with default type info', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast('Hello'); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: 'Hello',
      type: 'info',
    });
    expect(result.current.toasts[0].id).toBeTypeOf('number');
  });

  it('adds a toast with custom type', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast('Warning!', 'warning'); });
    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('dismisses a toast by id', () => {
    const { result } = renderHook(() => useToast());
    let toastId;
    act(() => { toastId = result.current.addToast('Test'); });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { result.current.dismissToast(toastId); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('clears all toasts', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast('One'); });
    act(() => { result.current.addToast('Two'); });
    act(() => { result.current.addToast('Three'); });
    expect(result.current.toasts).toHaveLength(3);
    act(() => { result.current.clearToasts(); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('auto-dismisses toast after duration', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast('Auto', 'info', 5000); });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('does not auto-dismiss when duration is 0', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast('Sticky', 'info', 0); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('supports multiple toasts simultaneously', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.addToast('First', 'success'); });
    act(() => { result.current.addToast('Second', 'warning'); });
    act(() => { result.current.addToast('Third', 'error'); });
    expect(result.current.toasts).toHaveLength(3);
    act(() => { result.current.dismissToast(result.current.toasts[0].id); });
    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].message).toBe('Second');
  });

  it('dismissing non-existent id is safe', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.dismissToast(999); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('returns unique ids for each toast', () => {
    const { result } = renderHook(() => useToast());
    let id1, id2, id3;
    act(() => { id1 = result.current.addToast('A'); });
    act(() => { id2 = result.current.addToast('B'); });
    act(() => { id3 = result.current.addToast('C'); });
    expect(new Set([id1, id2, id3]).size).toBe(3);
  });
});
