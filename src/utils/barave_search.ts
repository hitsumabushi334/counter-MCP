import { braveSearchParams, braveSearchResponse } from "../types.js";

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

// brave searchによる検索結果のUrl取得
export const getBraveSearchResult = async (params: braveSearchParams) => {
  const url: string = getBraveSearchUrl(params);
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error(
      "BRAVE_SEARCH_API_KEY is not set in environment variables."
    );
  }
  const requestHeaders = {
    Accept: "application/json",
    "x-Subscription-Token": apiKey,
  };

  const response = await fetch(url, {
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new Error(`Brave Search API request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as braveSearchResponse;
  const urlList = data.web.results.map((result) => result.url);
  console.log(`Brave Search API returned ${urlList.length} results.`);
  if (urlList.length === 0) {
    return [];
  }
  return urlList;
};
