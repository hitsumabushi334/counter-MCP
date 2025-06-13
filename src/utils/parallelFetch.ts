import { getBraveSearchResult } from "./brave_search.js";
import { braveSearchParams } from "../types.js";
import axios, { AxiosError, AxiosResponse } from "axios";

// Axiosリクエストの設定を定数として定義
const AXIOS_GET_CONFIG = {
  timeout: 10000, // タイムアウトを10秒に設定
  maxRedirects: 3, // 最大リダイレクト回数を3回に設定
};

// 一度に処理するリクエスト数を定義
const BATCH_SIZE = 5;

/**
 * 配列を指定されたサイズのバッチ（小さな配列）に分割します。
 * @template T - 配列内の要素の型
 * @param {T[]} items - 分割対象の配列
 * @param {number} size - 1バッチあたりの要素数
 * @returns {T[][]} - バッチに分割された配列
 */
const createBatches = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

/**
 * HTMLからbody部分だけを抽出します
 * @param {string} html - 完全なHTMLコンテンツ
 * @returns {string} - body要素の内容（bodyタグは含まない）
 */
const extractBodyContent = (html: string): string => {
  try {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return html;

    let content = bodyMatch[1]
      // 不要な要素を除去
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      // 空白を整理
      .replace(/\s+/g, " ")
      .trim();

    // 長すぎる場合は切り詰め
    if (content.length > 10000) {
      content = content.substring(0, 10000) + "... [content truncated]";
    }

    return content;
  } catch (error) {
    return html;
  }
};

/**
 * URLリストを並列でフェッチし、取得したHTMLコンテンツを返します。
 * @param {braveSearchParams} params - Brave Searchの検索パラメータ
 * @returns {Promise<string>} - 取得に成功したHTMLコンテンツの文字列と成功フラグのJSON文字列
 */
export const fetchUrlsInParallel = async (
  params: braveSearchParams
): Promise<string> => {
  // 1. Brave SearchからURLのリストを取得します
  const urlList = await getBraveSearchResult(params);
  if (urlList.length === 0) {
    console.warn("Brave Searchの結果にURLが見つかりませんでした。");
    return JSON.stringify({ success: false, htmlData: [] });
  }

  // 2. URLリストをバッチに分割します
  const urlBatches = createBatches(urlList, BATCH_SIZE);
  const allSettledResults: PromiseSettledResult<AxiosResponse<string>>[] = [];

  // 3. バッチごとにリクエストを並列実行します
  //    これにより、一度に大量のリクエストを送ることを防ぎます
  for (const batch of urlBatches) {
    const promises = batch.map((url) =>
      axios.get<string>(url, AXIOS_GET_CONFIG)
    );
    const results = await Promise.allSettled(promises);
    allSettledResults.push(...results);
  }

  // 4. 成功したレスポンスと失敗したエラーを分類し、body部分を抽出します
  const { successfulData, errors } = allSettledResults.reduce(
    (accumulator, result) => {
      if (result.status === "fulfilled") {
        // HTMLからbody部分だけを抽出
        const bodyContent = extractBodyContent(result.value.data);
        accumulator.successfulData.push(bodyContent);
      } else {
        accumulator.errors.push(result.reason);
      }
      return accumulator;
    },
    { successfulData: [] as string[], errors: [] as AxiosError[] }
  );
  successfulData.map((data) => {
    const bodyContent = extractBodyContent(data);
    return bodyContent;
  });
  // 5. 処理結果をコンソールに出力します
  console.log(`✅ 正常に ${successfulData.length} 件のURLをフェッチしました。`);
  if (errors.length > 0) {
    console.error(
      `❌ ${errors.length} 件のリクエストが失敗しました。理由:`,
      errors.map((error) => error.message) // エラーメッセージのみを抽出して表示
    );
  }
  // 6. 成功したレスポンスがない場合は警告を出し、空の配列を返します
  if (successfulData.length === 0) {
    console.warn("成功したレスポンスがありませんでした。");
    throw new Error(
      "並列フェッチの結果、成功したレスポンスがありませんでした。"
    );
  }
  // 7. 成功したレスポンスのHTMLデータのみを返します
  return JSON.stringify({ success: true, htmlData: successfulData });
};
