/**
 * Utility to round monetary values strictly to 2 decimal places, 
 * avoiding JavaScript floating-point errors.
 */
export const roundAmount = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
};