/**
 * Centralized logging utility.
 * In production, logs can be filtered or sent to a logging service.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};

