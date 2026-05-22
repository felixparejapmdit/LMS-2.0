export const getAuthToken = () => {
  try {
    const directusStored = localStorage.getItem("directus_auth");
    if (!directusStored) return "";
    const directusJson = JSON.parse(directusStored);
    return (
      directusJson?.access_token ||
      directusJson?.token ||
      directusJson?.data?.access_token ||
      directusJson?.data?.token ||
      ""
    );
  } catch {
    return "";
  }
};

export const withAuthToken = (url = "") => {
  if (!url || typeof url !== "string") return url;
  if (url.includes("token=")) return url;
  const token = getAuthToken();
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
};

