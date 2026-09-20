import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GlobalLoadingOverlay } from '../components/GlobalLoadingOverlay';

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  showLoading: (msg?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Listeners for external callers (e.g. axios interceptors)
type LoadingListener = (count: number, message: string) => void;
let activeRequestCount = 0;
let currentMessage = 'Processing request...';
const listeners = new Set<LoadingListener>();

export const showGlobalLoading = (msg: string = 'Processing, please wait...') => {
  activeRequestCount++;
  currentMessage = msg;
  listeners.forEach((listener) => listener(activeRequestCount, currentMessage));
};

export const hideGlobalLoading = () => {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  listeners.forEach((listener) => listener(activeRequestCount, currentMessage));
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [count, setCount] = useState(activeRequestCount);
  const [message, setMessage] = useState(currentMessage);

  useEffect(() => {
    const listener: LoadingListener = (newCount, newMsg) => {
      setCount(newCount);
      setMessage(newMsg);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const showLoading = useCallback((msg?: string) => {
    showGlobalLoading(msg);
  }, []);

  const hideLoading = useCallback(() => {
    hideGlobalLoading();
  }, []);

  const isLoading = count > 0;

  return (
    <LoadingContext.Provider value={{ isLoading, message, showLoading, hideLoading }}>
      {children}
      <GlobalLoadingOverlay isVisible={isLoading} message={message} />
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
