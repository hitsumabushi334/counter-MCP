import { braveSearchParams } from "../types.js";

// Brave Search APIによるUrl取得
export const getBraveSearchUrl = (params: braveSearchParams) => {
  const { query, searchLang } = params;
  const endPoint = "https://search.brave.com/api/v1/search";

  const url = new URL(endPoint);

  url.searchParams.append("q", query);
  url.searchParams.append("search_lang", searchLang);
  if (params.country) {
    url.searchParams.append("country", params.country);
  }

  console.log(`Brave Search API URL: ${url.toString()}`);
  return url.toString();
};
