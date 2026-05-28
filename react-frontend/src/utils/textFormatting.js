export const splitDelimitedLines = (value, delimiter = ';') => {
  return (value || '')
    .toString()
    .split(new RegExp(`[${delimiter}\n]+`))
    .map((part) => part.trim())
    .filter(Boolean);
};
