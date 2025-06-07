import { getBraveSearchUrl } from "../utils/barave_search.js";
import { braveSearchParams } from "../types.js";

// Urlの取得テスト
describe("Brave Search URL Generation", () => {
  it("should generate a valid Brave Search URL with query and language", () => {
    const params: braveSearchParams = {
      query: "test search",
      searchLang: "en",
      country: "US",
    };

    const url = getBraveSearchUrl(params);
    expect(url).toBe(
      "https://search.brave.com/api/v1/search?q=test+search&search_lang=en&country=US"
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
      "https://search.brave.com/api/v1/search?q=&search_lang=jp&country=US"
    );
  });
});
