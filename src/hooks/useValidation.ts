import { useState, useCallback } from "react";

export function useValidation<T>(
  initialValue: T,
  validator: (value: T) => string | null
) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const setValueWithValidation = useCallback(
    (newValue: T) => {
      setValue(newValue);
      const validationError = validator(newValue);
      setError(validationError);
      return validationError === null;
    },
    [validator]
  );

  return {
    value,
    setValue: setValueWithValidation,
    error,
    isValid: error === null,
  };
}

// Common validators
export const validators = {
  latitude: (value: number) => {
    if (value < -90 || value > 90) {
      return "Latitude must be between -90 and 90";
    }
    return null;
  },
  longitude: (value: number) => {
    if (value < -180 || value > 180) {
      return "Longitude must be between -180 and 180";
    }
    return null;
  },
  positive: (value: number) => {
    if (value < 0) {
      return "Value must be positive";
    }
    return null;
  },
  range: (min: number, max: number) => (value: number) => {
    if (value < min || value > max) {
      return `Value must be between ${min} and ${max}`;
    }
    return null;
  },
};
