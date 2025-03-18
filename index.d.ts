import { CookieJar } from 'tough-cookie';
import { Response } from 'node-fetch';

interface EpicRvClientConfig {
  email: string;
  password: string;
  totpSecret?: string;
  baseURL?: string;
}

declare class EpicRvClient {
  email: string;
  password: string;
  totpSecret: string | null;
  baseURL: string;
  fetch: typeof fetch;
  cookieJar: CookieJar;

  constructor(config: EpicRvClientConfig);

  authenticate(): Promise<boolean>;
  request(method: string, url: string, body?: object | string, options?: object): Promise<Response>;
  get(url: string, options?: object): Promise<Response>;
  post(url: string, body: object | string, options?: object): Promise<Response>;
  put(url: string, body: object | string, options?: object): Promise<Response>;
  patch(url: string, body: object | string, options?: object): Promise<Response>;
  delete(url: string, options?: object): Promise<Response>;
  head(url: string, options?: object): Promise<Response>;
  options(url: string, options?: object): Promise<Response>;
}

export = EpicRvClient;
