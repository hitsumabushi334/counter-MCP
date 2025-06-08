import axios, { AxiosResponse } from 'axios';
import { fetchUrlsInParallel } from '../utils/parallelFetch';
import { getBraveSearchResult } from '../utils/brave_search';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock getBraveSearchResult
jest.mock('../utils/brave_search');
const mockedGetBraveSearchResult = getBraveSearchResult as jest.MockedFunction<typeof getBraveSearchResult>;

// Utility function to create a mock AxiosResponse
const mockAxiosResponse = (data: string, status: number = 200): AxiosResponse<string> => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {} as any, // Use 'as any' to bypass strict type checking for config
});

import { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'; // Ensure AxiosRequestConfig is imported

// Utility function to create a mock AxiosError
const mockAxiosError = (
  message: string,
  code?: string,
  config: Partial<InternalAxiosRequestConfig> = { url: 'http://example.com/test-error', method: 'get', headers: {} as any } // Provide a default partial config
): AxiosError => {
  const error = new Error(message) as AxiosError;

  error.isAxiosError = true;
  error.code = code;
  error.config = config as InternalAxiosRequestConfig; // Use 'as InternalAxiosRequestConfig'

  // The toJSON method is part of AxiosError, so it should exist.
  // We don't need to redefine it unless we want to customize its behavior for tests.
  // If it's crucial for some test assertion that toJSON behaves a certain way,
  // then it can be mocked, but generally, it's not needed for basic error object creation.
  // For now, let's assume standard toJSON behavior is fine.
  // error.toJSON = () => ({ ... });

  // Optional: If a response object is associated with the error
  // error.response = { ... } as AxiosResponse;

  return error;
};

const BASE_URL = 'http://example.com';
const MOCK_URL_PAGE1 = `${BASE_URL}/page1`;
const MOCK_URL_PAGE2 = `${BASE_URL}/page2`;
const MOCK_HTML_PAGE1 = '<html>Page 1</html>';
const MOCK_HTML_PAGE2 = '<html>Page 2</html>';

const TEST_URLS_SINGLE = [MOCK_URL_PAGE1];
const TEST_HTML_SINGLE = [MOCK_HTML_PAGE1];

const TEST_URLS_MULTIPLE = [MOCK_URL_PAGE1, MOCK_URL_PAGE2];
const TEST_HTML_MULTIPLE = [MOCK_HTML_PAGE1, MOCK_HTML_PAGE2];

const EXPECTED_AXIOS_CONFIG = { timeout: 10000, maxRedirects: 3 };
const MOCK_SEARCH_PARAMS: { query: string; searchLang: "en" | "jp" } = { query: 'test', searchLang: 'en' };
const BATCH_TEST_SEARCH_PARAMS: { query: string; searchLang: "en" | "jp" } = { query: 'test-batching', searchLang: 'en' };


describe('fetchUrlsInParallel', () => {
  // Clear mocks before each test to ensure a clean state
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return fetched data when all requests are successful', async () => {
    mockedGetBraveSearchResult.mockResolvedValue(TEST_URLS_MULTIPLE);
    mockedAxios.get
      .mockResolvedValueOnce(mockAxiosResponse(TEST_HTML_MULTIPLE[0]))
      .mockResolvedValueOnce(mockAxiosResponse(TEST_HTML_MULTIPLE[1]));

    const results = await fetchUrlsInParallel(MOCK_SEARCH_PARAMS);
    expect(results).toEqual(TEST_HTML_MULTIPLE);
    expect(mockedGetBraveSearchResult).toHaveBeenCalledWith(MOCK_SEARCH_PARAMS);
    expect(mockedAxios.get).toHaveBeenCalledTimes(TEST_URLS_MULTIPLE.length);
    expect(mockedAxios.get).toHaveBeenCalledWith(TEST_URLS_MULTIPLE[0], EXPECTED_AXIOS_CONFIG);
    expect(mockedAxios.get).toHaveBeenCalledWith(TEST_URLS_MULTIPLE[1], EXPECTED_AXIOS_CONFIG);
  });

  test('should return an empty array and log a warning when no URLs are found', async () => {
    mockedGetBraveSearchResult.mockResolvedValue([]);
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const results = await fetchUrlsInParallel(MOCK_SEARCH_PARAMS);
    expect(results).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Brave Searchの結果にURLが見つかりませんでした。');
    expect(mockedAxios.get).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  test('should return data from successful requests and log errors for failed requests', async () => {
    const failError = mockAxiosError('Network Error');

    mockedGetBraveSearchResult.mockResolvedValue(TEST_URLS_MULTIPLE);
    mockedAxios.get
      .mockResolvedValueOnce(mockAxiosResponse(TEST_HTML_MULTIPLE[0]))
      .mockRejectedValueOnce(failError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const results = await fetchUrlsInParallel(MOCK_SEARCH_PARAMS);
    expect(results).toEqual([TEST_HTML_MULTIPLE[0]]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(TEST_URLS_MULTIPLE.length);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('1 件のリクエストが失敗しました。理由:'),
      [failError.message]
    );
    consoleErrorSpy.mockRestore();
  });

  test('should return an empty array and log errors when all requests fail', async () => {
    const error1 = mockAxiosError('Network Error 1');
    const error2 = mockAxiosError('Timeout Error 2');

    mockedGetBraveSearchResult.mockResolvedValue(TEST_URLS_MULTIPLE);
    mockedAxios.get
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const results = await fetchUrlsInParallel(MOCK_SEARCH_PARAMS);
    expect(results).toEqual([]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(TEST_URLS_MULTIPLE.length);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('2 件のリクエストが失敗しました。理由:'),
      [error1.message, error2.message]
    );
    consoleErrorSpy.mockRestore();
  });

  test('should process URLs in batches', async () => {
    // BATCH_SIZE is 5 in the original file
    const mockUrls = Array.from({ length: 7 }, (_, i) => `${BASE_URL}/page${i + 1}`);
    const mockHtmlData = mockUrls.map((url, i) => `<html>Page ${i + 1} for ${url}</html>`);

    mockedGetBraveSearchResult.mockResolvedValue(mockUrls);

    mockedAxios.get.mockImplementation(url => {
        const index = mockUrls.indexOf(url);
        if (index !== -1) {
            return Promise.resolve(mockAxiosResponse(mockHtmlData[index]));
        }
        return Promise.reject(mockAxiosError('Unknown URL'));
    });

    const results = await fetchUrlsInParallel(BATCH_TEST_SEARCH_PARAMS);

    expect(results.length).toBe(mockUrls.length);
    expect(mockedAxios.get).toHaveBeenCalledTimes(mockUrls.length);
    mockUrls.forEach(url => {
      expect(mockedAxios.get).toHaveBeenCalledWith(url, EXPECTED_AXIOS_CONFIG);
    });
  });

  test('should handle exactly BATCH_SIZE (5) URLs', async () => {
    const BATCH_SIZE_EXACT_URLS = Array.from({ length: 5 }, (_, i) => `${BASE_URL}/batch_exact_${i + 1}`);
    const BATCH_SIZE_EXACT_HTML = BATCH_SIZE_EXACT_URLS.map((url, i) => `<html>Batch Exact ${i + 1} for ${url}</html>`);

    mockedGetBraveSearchResult.mockResolvedValue(BATCH_SIZE_EXACT_URLS);
    mockedAxios.get.mockImplementation(url => {
        const index = BATCH_SIZE_EXACT_URLS.indexOf(url);
        if (index !== -1) {
            return Promise.resolve(mockAxiosResponse(BATCH_SIZE_EXACT_HTML[index]));
        }
        return Promise.reject(mockAxiosError('Unknown URL in batch exact test'));
    });

    const results = await fetchUrlsInParallel({ query: 'test-batch-exact', searchLang: 'en' });
    expect(results.length).toBe(BATCH_SIZE_EXACT_URLS.length);
    expect(mockedAxios.get).toHaveBeenCalledTimes(BATCH_SIZE_EXACT_URLS.length);
    BATCH_SIZE_EXACT_URLS.forEach(url => {
      expect(mockedAxios.get).toHaveBeenCalledWith(url, EXPECTED_AXIOS_CONFIG);
    });
  });

  test('should handle BATCH_SIZE - 1 (4) URLs (single batch)', async () => {
    const BATCH_SIZE_LESS_URLS = Array.from({ length: 4 }, (_, i) => `${BASE_URL}/batch_less_${i + 1}`);
    const BATCH_SIZE_LESS_HTML = BATCH_SIZE_LESS_URLS.map((url, i) => `<html>Batch Less ${i + 1} for ${url}</html>`);

    mockedGetBraveSearchResult.mockResolvedValue(BATCH_SIZE_LESS_URLS);
    mockedAxios.get.mockImplementation(url => {
        const index = BATCH_SIZE_LESS_URLS.indexOf(url);
        if (index !== -1) {
            return Promise.resolve(mockAxiosResponse(BATCH_SIZE_LESS_HTML[index]));
        }
        return Promise.reject(mockAxiosError('Unknown URL in batch less test'));
    });

    const results = await fetchUrlsInParallel({ query: 'test-batch-less', searchLang: 'en' });
    expect(results.length).toBe(BATCH_SIZE_LESS_URLS.length);
    expect(mockedAxios.get).toHaveBeenCalledTimes(BATCH_SIZE_LESS_URLS.length);
    BATCH_SIZE_LESS_URLS.forEach(url => {
      expect(mockedAxios.get).toHaveBeenCalledWith(url, EXPECTED_AXIOS_CONFIG);
    });
  });

  test('should handle BATCH_SIZE + 1 (6) URLs (two batches)', async () => {
    const BATCH_SIZE_MORE_URLS = Array.from({ length: 6 }, (_, i) => `${BASE_URL}/batch_more_${i + 1}`);
    const BATCH_SIZE_MORE_HTML = BATCH_SIZE_MORE_URLS.map((url, i) => `<html>Batch More ${i + 1} for ${url}</html>`);

    mockedGetBraveSearchResult.mockResolvedValue(BATCH_SIZE_MORE_URLS);
    mockedAxios.get.mockImplementation(url => {
        const index = BATCH_SIZE_MORE_URLS.indexOf(url);
        if (index !== -1) {
            return Promise.resolve(mockAxiosResponse(BATCH_SIZE_MORE_HTML[index]));
        }
        return Promise.reject(mockAxiosError('Unknown URL in batch more test'));
    });

    const results = await fetchUrlsInParallel({ query: 'test-batch-more', searchLang: 'en' });
    expect(results.length).toBe(BATCH_SIZE_MORE_URLS.length);
    expect(mockedAxios.get).toHaveBeenCalledTimes(BATCH_SIZE_MORE_URLS.length);
    BATCH_SIZE_MORE_URLS.forEach(url => {
      expect(mockedAxios.get).toHaveBeenCalledWith(url, EXPECTED_AXIOS_CONFIG);
    });
    // Although direct observation of batching calls to Promise.allSettled is complex
    // without more invasive mocking, the code structure implies two batches here.
    // The primary check is that all URLs are fetched correctly.
  });

  test('should handle timeout errors from axios.get', async () => {
    const timeoutUrl = `${BASE_URL}/timeout`;
    const regularUrl = `${BASE_URL}/regular`;
    const regularHtml = `<html>Regular Content</html>`;

    mockedGetBraveSearchResult.mockResolvedValue([timeoutUrl, regularUrl]);

    const timeoutError = mockAxiosError('Timeout connecting to server', 'ECONNABORTED');
    // Ensure the config used in mockAxiosError is consistent or not an issue for the test
    // If specific config is needed for the error object:
    // const timeoutError = mockAxiosError('Timeout connecting to server', 'ECONNABORTED', { url: timeoutUrl, method: 'get' });


    mockedAxios.get
      .mockImplementation(async (url: string) => {
        if (url === timeoutUrl) {
          return Promise.reject(timeoutError);
        }
        if (url === regularUrl) {
          return Promise.resolve(mockAxiosResponse(regularHtml));
        }
        return Promise.reject(mockAxiosError('Unknown URL in timeout test'));
      });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const results = await fetchUrlsInParallel({ query: 'test-timeout', searchLang: 'en' });

    expect(results).toEqual([regularHtml]); // Only the regular page should be fetched
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get).toHaveBeenCalledWith(timeoutUrl, EXPECTED_AXIOS_CONFIG);
    expect(mockedAxios.get).toHaveBeenCalledWith(regularUrl, EXPECTED_AXIOS_CONFIG);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('1 件のリクエストが失敗しました。理由:'),
      [timeoutError.message]
    );

    consoleErrorSpy.mockRestore();
  });
});
