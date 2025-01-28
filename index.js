const fetch = require('node-fetch');
const fetchCookie = require('fetch-cookie').default;
const { CookieJar } = require('tough-cookie');
const otplib = require('otplib');

function createFetchWithCookies() {
  const jar = new CookieJar();
  // Wrap node-fetch with fetch-cookie for automatic cookie management
  const wrappedFetch = fetchCookie(fetch, jar);
  return { wrappedFetch, jar };
}

class EpicRvClient {
  /**
   * @param {Object} config
   * @param {string} config.email - The email (username).
   * @param {string} config.password - The password.
   * @param {string} [config.totpSecret] - The TOTP secret for 2FA (optional).
   * @param {string} [config.baseURL] - Base URL for the API (default: https://api.twenty20solutions.com).
   */
  constructor({ email, password, totpSecret, baseURL }) {
    if (!email || !password) {
      throw new Error('email and password are required');
    }
    // totpSecret is optional, so we don't throw if missing
    this.email = email;
    this.password = password;
    this.totpSecret = totpSecret || null;
    this.baseURL = baseURL || 'https://api.twenty20solutions.com';

    // Create a fetch instance bound to a new cookie jar
    const { wrappedFetch, jar } = createFetchWithCookies();
    this.fetch = wrappedFetch;
    this.cookieJar = jar;
  }

  /**
   * Perform login, and if the response indicates two-factor authentication
   * is required, attempt 2FA only if totpSecret is present.
   * Sets session cookies for subsequent calls.
   */
  async authenticate() {
    // 1) Basic login (POST /auth/login)
    const loginPayload = {
      email: this.email,
      password: this.password,
    };

    const loginRes = await this.fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginPayload),
    });

    if (!loginRes.ok) {
      const msg = await this._extractErrorMessage(loginRes);
      throw new Error(`Login failed. HTTP ${loginRes.status}: ${msg}`);
    }

    // Parse the login response
    const loginData = await loginRes.json();

    // 2) Check if two-factor is required
    const needs2FA =
        loginData &&
        loginData.code === 1003;

    if (needs2FA) {
      // If we need 2FA but don't have a TOTP secret, throw
      if (!this.totpSecret) {
        throw new Error('2FA required but totpSecret was not provided!');
      }

      // Perform second factor
      const code = this._generateTOTP();
      const secondFactorRes = await this.fetch(`${this.baseURL}/auth/secondFactor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: code }),
      });

      if (!secondFactorRes.ok) {
        const msg = await this._extractErrorMessage(secondFactorRes);
        throw new Error(`2FA failed. HTTP ${secondFactorRes.status}: ${msg}`);
      }
    }

    // If we got here, the user is authenticated (with or without 2FA).
    return true;
  }

  /**
   * Generate a TOTP code using otplib.
   * Make sure your system time is correct, or it may fail.
   */
  _generateTOTP() {
    return otplib.authenticator.generate(this.totpSecret);
  }

  /**
   * A helper to parse error messages from responses if needed.
   */
  async _extractErrorMessage(res) {
    let text;
    try {
      text = await res.text();
    } catch (err) {
      text = err.message;
    }
    return text || res.statusText;
  }

  /**
   * Main request wrapper supporting all HTTP methods
   * @param {string} method - e.g. 'GET', 'POST', 'PUT', etc.
   * @param {string} url - relative or absolute URL
   * @param {object|string|undefined} [body] - JSON body or string for request
   * @param {object} [options] - Additional fetch options (headers, etc.)
   * @returns {Promise<Response>} node-fetch Response object
   */
  async request(method, url, body, options = {}) {
    const headers = {
      ...(options.headers || {}),
    };

    // If the user passes a plain object, assume JSON
    let requestBody;
    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      requestBody = JSON.stringify(body);
    } else {
      requestBody = body; // string/Buffer
    }

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    const response = await this.fetch(fullUrl, {
      method: method.toUpperCase(),
      headers,
      body: requestBody,
      ...options,
    });

    return response;
  }

  // Convenience wrappers:

  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  async post(url, body, options = {}) {
    return this.request('POST', url, body, options);
  }

  async put(url, body, options = {}) {
    return this.request('PUT', url, body, options);
  }

  async patch(url, body, options = {}) {
    return this.request('PATCH', url, body, options);
  }

  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  async head(url, options = {}) {
    return this.request('HEAD', url, null, options);
  }

  async options(url, options = {}) {
    return this.request('OPTIONS', url, null, options);
  }
}

module.exports = EpicRvClient;
