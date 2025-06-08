import axios, { AxiosError, AxiosResponse } from 'axios';
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

// Utility function to create a mock AxiosError
const mockAxiosError = (message: string, code?: string): AxiosError => {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.toJSON = () => ({
    message: error.message,
    name: error.name,
    stack: error.stack,
    config: {} as any, // Use 'as any'
    code,
  });
  error.config = {} as any; // Use 'as any'
  return error;
};


describe('fetchUrlsInParallel', () => {
  // Clear mocks before each test to ensure a clean state
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return fetched data when all requests are successful', async () => {
    const mockUrls = ['http://example.com/page1', 'http://example.com/page2'];
    const mockHtmlData = ['<html>Page 1</html>', '<html>Page 2</html>'];

    mockedGetBraveSearchResult.mockResolvedValue(mockUrls);
    mockedAxios.get
      .mockResolvedValueOnce(mockAxiosResponse(mockHtmlData[0]))
      .mockResolvedValueOnce(mockAxiosResponse(mockHtmlData[1]));

    const results = await fetchUrlsInParallel({ query: 'test', searchLang: 'en' });
    expect(results).toEqual(mockHtmlData);
    expect(mockedGetBraveSearchResult).toHaveBeenCalledWith({ query: 'test', searchLang: 'en' });
    expect(mockedAxios.get).toHaveBeenCalledTimes(mockUrls.length);
    expect(mockedAxios.get).toHaveBeenCalledWith(mockUrls[0], expect.any(Object));
    expect(mockedAxios.get).toHaveBeenCalledWith(mockUrls[1], expect.any(Object));
  });

  test('should return an empty array and log a warning when no URLs are found', async () => {
    mockedGetBraveSearchResult.mockResolvedValue([]);
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const results = await fetchUrlsInParallel({ query: 'test', searchLang: 'en' });
    expect(results).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Brave Searchの結果にURLが見つかりませんでした。');
    expect(mockedAxios.get).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  test('should return data from successful requests and log errors for failed requests', async () => {
    const mockUrls = ['http://example.com/success', 'http://example.com/fail'];
    const successHtml = '<html>Success</html>';
    const failError = mockAxiosError('Network Error');

    mockedGetBraveSearchResult.mockResolvedValue(mockUrls);
    mockedAxios.get
      .mockResolvedValueOnce(mockAxiosResponse(successHtml))
      .mockRejectedValueOnce(failError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const results = await fetchUrlsInParallel({ query: 'test', searchLang: 'en' });
    expect(results).toEqual([successHtml]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(mockUrls.length);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('1 件のリクエストが失敗しました。理由:'),
      [failError.message]
    );
    consoleErrorSpy.mockRestore();
  });

  test('should return an empty array and log errors when all requests fail', async () => {
    const mockUrls = ['http://example.com/fail1', 'http://example.com/fail2'];
    const error1 = mockAxiosError('Network Error 1');
    const error2 = mockAxiosError('Timeout Error 2');

    mockedGetBraveSearchResult.mockResolvedValue(mockUrls);
    mockedAxios.get
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const results = await fetchUrlsInParallel({ query: 'test', searchLang: 'en' });
    expect(results).toEqual([]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(mockUrls.length);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('2 件のリクエストが失敗しました。理由:'),
      [error1.message, error2.message]
    );
    consoleErrorSpy.mockRestore();
  });

  test('should process URLs in batches', async () => {
    // BATCH_SIZE is 5 in the original file
    const mockUrls = Array.from({ length: 7 }, (_, i) => `http://example.com/page${i + 1}`);
    const mockHtmlData = mockUrls.map((url, i) => `<html>Page ${i + 1} for ${url}</html>`);

    mockedGetBraveSearchResult.mockResolvedValue(mockUrls);

    // For this test, we'll assign the mock implementation to ensure it maps correctly.
    mockedAxios.get.mockImplementation(url => {
        const index = mockUrls.indexOf(url);
        if (index !== -1) {
            return Promise.resolve(mockAxiosResponse(mockHtmlData[index]));
        }
        return Promise.reject(mockAxiosError('Unknown URL'));
    });

    const results = await fetchUrlsInParallel({ query: 'test-batching', searchLang: 'en' });

    expect(results.length).toBe(mockUrls.length);
    expect(mockedAxios.get).toHaveBeenCalledTimes(mockUrls.length);
    mockUrls.forEach(url => {
      expect(mockedAxios.get).toHaveBeenCalledWith(url, expect.any(Object));
    });

  });
});
