export const normalizePersonName = (value) =>
  (value || "")
    .toString()
    .replace(/,+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const cleanPersonName = (value) =>
  (value || "")
    .toString()
    .replace(/,+$/, "")
    .replace(/\s+/g, " ")
    .trim();

export const getAutocompleteQuery = (value, { semicolonSeparated = false } = {}) => {
  const raw = (value || "").toString();
  const token = semicolonSeparated ? raw.split(";").pop() : raw;
  return token.trim();
};

const compactName = (value) =>
  normalizePersonName(value).replace(/,/g, "").replace(/\s+/g, " ").trim();

export const matchesPersonSuggestion = (name, query) => {
  const normalizedName = normalizePersonName(name);
  const normalizedQuery = normalizePersonName(query);
  if (!normalizedName || !normalizedQuery) return false;

  const queryHasComma = normalizedQuery.includes(",");
  const queryTokens = compactName(normalizedQuery).split(" ").filter(Boolean);
  const nameTokens = compactName(normalizedName).split(" ").filter(Boolean);

  if (queryHasComma || queryTokens.length > 1) {
    return compactName(normalizedName).startsWith(compactName(normalizedQuery));
  }

  const singleToken = queryTokens[0];
  return nameTokens.some((token) => token.startsWith(singleToken));
};

export const filterPersonSuggestions = (items, query) => {
  const normalizedQuery = normalizePersonName(query);
  if (!normalizedQuery) return [];

  const seen = new Set();
  const ranked = (Array.isArray(items) ? items : [])
    .map((person) => ({
      ...person,
      name: cleanPersonName(person?.name),
    }))
    .filter((person) => {
      if (!person.name) return false;
      if (seen.has(person.name)) return false;
      seen.add(person.name);
      return matchesPersonSuggestion(person.name, normalizedQuery);
    })
    .sort((left, right) => {
      const leftName = compactName(left.name);
      const rightName = compactName(right.name);
      const compactQuery = compactName(normalizedQuery);
      const leftRank = leftName === compactQuery ? 0 : leftName.startsWith(compactQuery) ? 1 : 2;
      const rightRank = rightName === compactQuery ? 0 : rightName.startsWith(compactQuery) ? 1 : 2;

      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.name.localeCompare(right.name);
    });

  return ranked;
};

export const findExactPersonSuggestion = (items, query) => {
  const normalizedQuery = normalizePersonName(query);
  if (!normalizedQuery) return null;
  return (Array.isArray(items) ? items : []).find(
    (person) => normalizePersonName(person?.name) === normalizedQuery,
  ) || null;
};
