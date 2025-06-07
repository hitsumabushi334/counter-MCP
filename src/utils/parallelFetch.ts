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

  const results = await Promise.allSettled(
    urlList.map((url) => axios.get(url))
  );

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
  console.log("Successful responses:", successfulResponses);

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
