/**
 * Common form utilities for error handling and validation
 */

import { FieldErrors, UseFormReturn } from 'react-hook-form';
import { logger } from './logger';

/**
 * Extract error message from form errors
 */
export function getFormErrorMessage(
  errors: FieldErrors,
  fieldName: string
): string | undefined {
  const error = errors[fieldName];
  if (!error) return undefined;

  if (typeof error.message === 'string') {
    return error.message;
  }

  if (error.type === 'required') {
    return 'Это поле обязательно для заполнения';
  }

  if (error.type === 'min') {
    return `Минимальное значение: ${(error as any).min}`;
  }

  if (error.type === 'max') {
    return `Максимальное значение: ${(error as any).max}`;
  }

  return 'Неверное значение';
}

/**
 * Handle form submission errors
 */
export function handleFormError(
  error: unknown,
  form: UseFormReturn<any>,
  defaultMessage: string = 'Произошла ошибка при сохранении'
): void {
  if (error instanceof Error) {
    logger.error('Form submission error:', error);
    
    // Try to set form-level error
    form.setError('root', {
      type: 'manual',
      message: error.message || defaultMessage,
    });
  } else {
    logger.error('Form submission error:', error);
    form.setError('root', {
      type: 'manual',
      message: defaultMessage,
    });
  }
}

/**
 * Reset form and clear errors
 */
export function resetForm(form: UseFormReturn<any>) {
  form.reset();
  form.clearErrors();
}

