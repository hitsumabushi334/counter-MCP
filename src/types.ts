import { z } from "zod";

// インプットの型定義
const braveSearchParams = z.object({
  query: z.string().describe("検索クエリ"),
  searchLang: z.enum(["en", "jp"]).default("en").describe("検索対象の言語"),
  country: z
    .enum(["US", "JP"])
    .default("US")
    .optional()
    .describe("検索を行う国"),
});
export type braveSearchParams = z.infer<typeof braveSearchParams>;

// Brave Search APIのレスポンス型定義
interface searchResult {
  title: string;
  url: string;
  description: string;
}

export interface braveSearchResponse {
  web: {
    results: searchResult[];
  };
}
