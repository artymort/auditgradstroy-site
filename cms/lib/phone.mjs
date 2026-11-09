export const isValidRussianPhone = (value) => {
  if (typeof value !== 'string' || value.length > 24) return false;
  const compact = value.trim().replace(/[\s()-]/g, '');
  return /^(?:8\d{10}|\+7\d{10})$/.test(compact);
};
