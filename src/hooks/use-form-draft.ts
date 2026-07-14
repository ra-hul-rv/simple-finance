'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * useFormDraft Hook
 * Automatically manages saving form values to localStorage under a draft key,
 * and clearing them upon successful submissions.
 * Optimized with refs to prevent React state update loop crashes during typing.
 */
export function useFormDraft<T extends Record<string, any>>(
  key: string,
  initialValues: T,
  fields: T,
  setFields: (values: T) => void,
  isOpen: boolean
) {
  const fieldsRef = useRef(fields);
  const setFieldsRef = useRef(setFields);
  const initialValuesRef = useRef(initialValues);
  const prevIsOpenRef = useRef(isOpen);

  // Keep refs up-to-date with latest values on every render
  useEffect(() => {
    fieldsRef.current = fields;
    setFieldsRef.current = setFields;
    initialValuesRef.current = initialValues;
  });

  // Restore draft exactly once when the form dialogue transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const savedDraft = localStorage.getItem(`sf_draft_${key}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          const merged = { ...initialValuesRef.current, ...parsed };
          setFieldsRef.current(merged);
        } catch (e) {
          console.error(`Failed to parse draft for key ${key}:`, e);
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, key]);

  // Auto-saving removed to require explicit user action for drafts

  // Clear draft helper
  const clearDraft = useCallback(() => {
    localStorage.removeItem(`sf_draft_${key}`);
  }, [key]);

  return { clearDraft };
}
