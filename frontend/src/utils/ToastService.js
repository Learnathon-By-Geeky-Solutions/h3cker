import { useState, useCallback, useRef } from 'react';

let nextId = 0;

export function useToast(dismissDuration = 4000) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismissToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = dismissDuration) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
    return id;
  }, [dismissToast, dismissDuration]);

  const clearToasts = useCallback(() => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    setToasts([]);
  }, []);

  return { toasts, addToast, dismissToast, clearToasts };
}
