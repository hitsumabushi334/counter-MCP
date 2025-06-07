import { braveSearchParams, braveSearchResponse } from "../types.js";
import dotenv from "dotenv";

// Brave Search APIによるUrl取得
dotenv.config();
export const getBraveSearchUrl = (params: braveSearchParams): string => {
  const { query, searchLang } = params;
  const endPoint = "https://api.search.brave.com/res/v1/web/search";

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
export const getBraveSearchResult = async (
  params: braveSearchParams
): Promise<string[]> => {
  const url: string = getBraveSearchUrl(params);
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error(
      "BRAVE_SEARCH_API_KEY is not set in environment variables."
    );
  }
  const requestHeaders = {
    Accept: "application/json",
    "X-Subscription-Token": apiKey,
  };

  const response = await fetch(url, {
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new Error(`Brave Search API request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as braveSearchResponse;
  if (!data.web || !data.web.results) {
    console.warn("No results found in Brave Search response.");
    return [];
  }
  const urlList = data.web.results
    .map((result) => result.url)
    .filter((url) => url);
  console.log(`Brave Search API returned ${urlList.length} results.`);
  if (urlList.length === 0) {
    return [];
  }
  return urlList;
};

// 実際のAPI呼び出しをテスト
const testBraveSearch = async () => {
  const params: braveSearchParams = {
    query: "example",
    searchLang: "en",
  };
  try {
    const results = await getBraveSearchResult(params);
    console.log("Brave Search results:", results);
  } catch (error) {
    console.error("Error testing Brave Search API:", error);
  }
};

testBraveSearch(); // この行を追加して関数を呼び出す
