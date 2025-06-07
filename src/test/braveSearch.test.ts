import {
  getBraveSearchResult,
  getBraveSearchUrl,
} from "../utils/brave_search.js";
import { braveSearchParams } from "../types.js";
import dotenv from "dotenv";

// 環境変数の設定
dotenv.config();
// Urlの取得テスト
describe("Brave Search URL Generation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // モジュールのキャッシュをリセット
    jest.resetModules();
    // process.env をスプレッド構文でコピーし、テスト用のAPIキーを設定
    process.env = {
      ...originalEnv,
      BRAVE_SEARCH_API_KEY: "dummy_api_key_for_test", // テスト用のダミーAPIキー
    };
  });

  afterEach(() => {
    // テストが終わったら元の環境変数に戻す
    process.env = originalEnv;
  });
  it("should generate a valid Brave Search URL with query and language", () => {
    const params: braveSearchParams = {
      query: "test search",
      searchLang: "en",
      country: "US",
    };

    const url = getBraveSearchUrl(params);
    expect(url).toBe(
      "https://api.search.brave.com/res/v1/web/search?q=test+search&search_lang=en&country=US"
    );
  });

  it("should handle empty query and language", () => {
    const params: braveSearchParams = {
      query: "",
      searchLang: "jp",
      country: "US",
    };

    const url = getBraveSearchUrl(params);
    expect(url).toBe(
      "https://api.search.brave.com/res/v1/web/search?q=&search_lang=jp&country=US"
    );
  });

  it("Brave apiを利用して検索結果のURLを取得する", async () => {
    const params: braveSearchParams = {
      query: "test search",
      searchLang: "en",
      country: "US",
    };

    // 実際のAPI呼び出しはモックする

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { url: "https://example.com/1" },
            { url: "https://example.com/2" },
          ],
        },
      }),
    });

    global.fetch = mockFetch;

    const result = await getBraveSearchResult(params);
    expect(result).toEqual(["https://example.com/1", "https://example.com/2"]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.search.brave.com/res/v1/web/search?q=test+search&search_lang=en&country=US",
      {
        headers: {
          "X-Subscription-Token": "dummy_api_key_for_test",
          Accept: "application/json",
        },
      }
    );
  });

  it("should return an empty array when API returns no results", async () => {
    const params: braveSearchParams = {
      query: "no results query",
      searchLang: "en",
      country: "US",
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [],
        },
      }),
    });

    global.fetch = mockFetch;

    const result = await getBraveSearchResult(params);
    expect(result).toEqual([]);
  });

  it("should throw an error when API call is not ok", async () => {
    const params: braveSearchParams = {
      query: "error query",
      searchLang: "en",
      country: "US",
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    global.fetch = mockFetch;

    await expect(getBraveSearchResult(params)).rejects.toThrow(
      `Brave Search API request failed: Internal Server Error`
    );
  });

  it("should return an empty array if web property is missing", async () => {
    const params: braveSearchParams = {
      query: "missing web",
      searchLang: "en",
      country: "US",
    };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}), // Missing 'web' property
    });
    global.fetch = mockFetch;
    const result = await getBraveSearchResult(params);
    expect(result).toEqual([]);
  });

  it("should return an empty array if results property is missing", async () => {
    const params: braveSearchParams = {
      query: "missing results",
      searchLang: "en",
      country: "US",
    };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {}, // Missing 'results' property
      }),
    });
    global.fetch = mockFetch;
    const result = await getBraveSearchResult(params);
    expect(result).toEqual([]);
  });

  it("should filter out results with missing url", async () => {
    const params: braveSearchParams = {
      query: "test search",
      searchLang: "en",
      country: "US",
    };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { url: "https://example.com/1" },
            {}, // Missing url
            { url: "https://example.com/3" },
          ],
        },
      }),
    });
    global.fetch = mockFetch;
    const result = await getBraveSearchResult(params);
    expect(result).toEqual(["https://example.com/1", "https://example.com/3"]);
  });
});
