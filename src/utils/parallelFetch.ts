import { getBraveSearchResult } from "./brave_search.js";
import { braveSearchParams } from "../types.js";
import axios, { AxiosResponse } from "axios";

const fetchUrlsInParallel = async (
  params: braveSearchParams
): Promise<string[]> => {
  const urlList: string[] = await getBraveSearchResult(params);
  if (urlList.length === 0) {
    console.warn("No URLs found in Brave Search results.");
    return [];
  }
  // 例: arrayOfAxiosPromises は Axios のリクエストを行うプロミスの配列
  // const arrayOfAxiosPromises: Promise<AxiosResponse<any, any>>[] = [ /* ... */ ];

  const BATCH_SIZE = 5;
  const batches = [];
  for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
    batches.push(urlList.slice(i, i + BATCH_SIZE));
  }

  const allResults = [];
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map((url) =>
        axios.get(url, {
          timeout: 10000, // 10秒のタイムアウト
          maxRedirects: 3,
        })
      )
    );
    allResults.push(...batchResults);
  }
  const results = allResults;

  const successfulResponses: AxiosResponse<any, any>[] = [];
  const errors: any[] = [];

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      successfulResponses.push(result.value);
    } else {
      // result.status === 'rejected'
      errors.push(result.reason);
    }
  });

  // これで successfulResponses は AxiosResponse<any, any>[] 型になります
  console.log(`Successfully fetched ${successfulResponses.length} URLs`);

  if (errors.length > 0) {
    console.error("Failed requests reasons:", errors);
  }

  //成功したレスポンスからHTML本文を抽出
  const successfulData: string[] = successfulResponses.map(
    (response) => response.data
  );

  return successfulData;
};

export { fetchUrlsInParallel };
