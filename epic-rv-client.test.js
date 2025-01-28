// epic-rv-client.test.js
require('dotenv').config();           // Loads variables from .env into process.env
const EpicRvClient = require('./index');  // CommonJS import of your library

// Jest test definitions
describe('EpicRvClient Integration Test', () => {
  // Pull credentials from environment
  const EMAIL = process.env.EMAIL;
  const PASSWORD = process.env.PASSWORD;
  const TOTP_SECRET = process.env.TOTP_SECRET;
  const EPIC_DOMAIN = process.env.EPIC_DOMAIN || 'https://api.twenty20solutions.com';

  // The endpoint we want to GET after authenticating
  const TEST_ENDPOINT = '/organization/00000001a01d1c4c9395f80b';

  it('Should login with 2FA and fetch data successfully', async () => {
    const client = new EpicRvClient({
      email: EMAIL,
      password: PASSWORD,
      totpSecret: TOTP_SECRET,
      baseURL: EPIC_DOMAIN,
    });

    await client.authenticate();

    const resp = await client.get(TEST_ENDPOINT);
    expect(resp.ok).toBe(true);

    const data = await resp.json();

    expect(data).toBeTruthy()
    expect(data).toHaveProperty('name')

  });
});
