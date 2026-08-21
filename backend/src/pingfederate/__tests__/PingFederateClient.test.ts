import nock from 'nock';

const BASE_URL = 'https://pf-admin.test:9999/pf-admin-api/v1';

function freshClient() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../PingFederateClient');
  return new mod.PingFederateClient();
}

describe('PingFederateClient', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('sends Basic auth + XSRF header on every request', async () => {
    const scope = nock(BASE_URL, {
      reqheaders: {
        authorization: (val) => typeof val === 'string' && val.startsWith('Basic '),
        'x-xsrf-header': 'PingFederate',
        accept: 'application/json'
      }
    })
      .get('/oauth/clients')
      .reply(200, { items: [] });

    const client = freshClient();
    const result = await client.listOAuthClients();
    expect(result).toEqual({ items: [] });
    expect(scope.isDone()).toBe(true);
  });

  it('uses OAuth2 bearer auth when PF_ADMIN_AUTH_MODE=oauth2', async () => {
    process.env.PF_ADMIN_AUTH_MODE = 'oauth2';
    process.env.PF_ADMIN_OAUTH_TOKEN_URL = 'https://pf-admin.test:9999/as/token.oauth2';
    process.env.PF_ADMIN_OAUTH_CLIENT_ID = 'portal';
    process.env.PF_ADMIN_OAUTH_CLIENT_SECRET = 'portal-secret';

    nock('https://pf-admin.test:9999')
      .post('/as/token.oauth2')
      .reply(200, { access_token: 'abc123', expires_in: 300 });

    const scope = nock(BASE_URL, {
      reqheaders: { authorization: 'Bearer abc123', 'x-xsrf-header': 'PingFederate' }
    })
      .get('/serverSettings')
      .reply(200, { instanceId: 'pf1' });

    const client = freshClient();
    const result = await client.getServerSettings();
    expect(result).toEqual({ instanceId: 'pf1' });
    expect(scope.isDone()).toBe(true);

    process.env.PF_ADMIN_AUTH_MODE = 'basic';
  });

  it('creates an https agent with rejectUnauthorized=false when PF_TLS_INSECURE=true', () => {
    process.env.PF_TLS_INSECURE = 'true';
    const client: any = freshClient();
    expect(client.http.defaults.httpsAgent.options.rejectUnauthorized).toBe(false);
    process.env.PF_TLS_INSECURE = 'false';
  });

  it('creates an https agent with rejectUnauthorized=true by default', () => {
    const client: any = freshClient();
    expect(client.http.defaults.httpsAgent.options.rejectUnauthorized).toBe(true);
  });

  it('creates an OAuth client (POST /oauth/clients)', async () => {
    const scope = nock(BASE_URL)
      .post('/oauth/clients', (body) => body.clientId === 'my-app')
      .reply(201, { clientId: 'my-app', name: 'My App', grantTypes: ['authorization_code'] });

    const client = freshClient();
    const result = await client.createOAuthClient({ clientId: 'my-app', name: 'My App', grantTypes: ['authorization_code'] });
    expect(result.clientId).toBe('my-app');
    expect(scope.isDone()).toBe(true);
  });

  it('gets a single OAuth client', async () => {
    nock(BASE_URL).get('/oauth/clients/my-app').reply(200, { clientId: 'my-app', name: 'My App', grantTypes: [] });
    const client = freshClient();
    const result = await client.getOAuthClient('my-app');
    expect(result.clientId).toBe('my-app');
  });

  it('updates an OAuth client', async () => {
    nock(BASE_URL).put('/oauth/clients/my-app').reply(200, { clientId: 'my-app', name: 'Renamed', grantTypes: [] });
    const client = freshClient();
    const result = await client.updateOAuthClient('my-app', { clientId: 'my-app', name: 'Renamed', grantTypes: [] });
    expect(result.name).toBe('Renamed');
  });

  it('deletes an OAuth client', async () => {
    const scope = nock(BASE_URL).delete('/oauth/clients/my-app').reply(204);
    const client = freshClient();
    await client.deleteOAuthClient('my-app');
    expect(scope.isDone()).toBe(true);
  });

  it('lists access token managers', async () => {
    nock(BASE_URL).get('/oauth/accessTokenManagers').reply(200, { items: [{ id: 'atm1' }] });
    const client = freshClient();
    const result = await client.listAccessTokenManagers();
    expect(result.items).toHaveLength(1);
  });

  it('lists OIDC policies', async () => {
    nock(BASE_URL).get('/oauth/openIdConnect/policies').reply(200, { items: [{ id: 'policy1' }] });
    const client = freshClient();
    const result = await client.listOidcPolicies();
    expect(result.items).toHaveLength(1);
  });

  it('lists, creates, gets, updates and deletes SP connections', async () => {
    nock(BASE_URL).get('/idp/spConnections').reply(200, { items: [] });
    nock(BASE_URL).post('/idp/spConnections').reply(201, { id: 'sp1', entityId: 'urn:sp1' });
    nock(BASE_URL).get('/idp/spConnections/sp1').reply(200, { id: 'sp1', entityId: 'urn:sp1' });
    nock(BASE_URL).put('/idp/spConnections/sp1').reply(200, { id: 'sp1', entityId: 'urn:sp1-updated' });
    nock(BASE_URL).delete('/idp/spConnections/sp1').reply(204);

    const client = freshClient();
    expect((await client.listSpConnections()).items).toEqual([]);
    expect((await client.createSpConnection({ id: 'sp1', entityId: 'urn:sp1' })).id).toBe('sp1');
    expect((await client.getSpConnection('sp1')).entityId).toBe('urn:sp1');
    expect((await client.updateSpConnection('sp1', { id: 'sp1', entityId: 'urn:sp1-updated' })).entityId).toBe(
      'urn:sp1-updated'
    );
    await client.deleteSpConnection('sp1');
  });

  it('lists idp adapters', async () => {
    nock(BASE_URL).get('/idp/adapters').reply(200, { items: [{ id: 'adapter1' }] });
    const client = freshClient();
    expect((await client.listIdpAdapters()).items).toHaveLength(1);
  });

  it('gets and puts authentication policies', async () => {
    nock(BASE_URL).get('/authenticationPolicies').reply(200, { rootNode: {} });
    nock(BASE_URL).put('/authenticationPolicies').reply(200, { rootNode: { updated: true } });
    const client = freshClient();
    expect(await client.getAuthenticationPolicies()).toEqual({ rootNode: {} });
    expect(await client.putAuthenticationPolicies({ rootNode: { updated: true } })).toEqual({
      rootNode: { updated: true }
    });
  });

  it('lists and creates authentication policy contracts', async () => {
    nock(BASE_URL).get('/authenticationPolicyContracts').reply(200, { items: [] });
    nock(BASE_URL).post('/authenticationPolicyContracts').reply(201, { id: 'apc1' });
    const client = freshClient();
    expect((await client.listAuthenticationPolicyContracts()).items).toEqual([]);
    expect(await client.createAuthenticationPolicyContract({ name: 'apc1' })).toEqual({ id: 'apc1' });
  });

  it('lists and creates data stores', async () => {
    nock(BASE_URL).get('/dataStores').reply(200, { items: [] });
    nock(BASE_URL).post('/dataStores').reply(201, { id: 'ds1' });
    const client = freshClient();
    expect((await client.listDataStores()).items).toEqual([]);
    expect(await client.createDataStore({ type: 'LDAP' })).toEqual({ id: 'ds1' });
  });

  it('lists and creates password credential validators', async () => {
    nock(BASE_URL).get('/passwordCredentialValidators').reply(200, { items: [] });
    nock(BASE_URL).post('/passwordCredentialValidators').reply(201, { id: 'pcv1' });
    const client = freshClient();
    expect((await client.listPasswordCredentialValidators()).items).toEqual([]);
    expect(await client.createPasswordCredentialValidator({ type: 'LDAP' })).toEqual({ id: 'pcv1' });
  });

  it('lists signing key pairs and PingOne connections', async () => {
    nock(BASE_URL).get('/keyPairs/signing').reply(200, { items: [] });
    nock(BASE_URL).get('/pingOneConnections').reply(200, { items: [] });
    const client = freshClient();
    expect((await client.listSigningKeyPairs()).items).toEqual([]);
    expect((await client.listPingOneConnections()).items).toEqual([]);
  });

  it('gets server settings', async () => {
    nock(BASE_URL).get('/serverSettings').reply(200, { instanceId: 'pf1' });
    const client = freshClient();
    expect(await client.getServerSettings()).toEqual({ instanceId: 'pf1' });
  });

  it('maps a 409 upstream error into a normalized PingFederateApiError without leaking the raw payload', async () => {
    nock(BASE_URL)
      .post('/oauth/clients')
      .reply(409, { resultId: 'CLIENT_ALREADY_EXISTS', message: 'A client with this ID already exists', internalDebugStack: 'sensitive-trace' });

    const client = freshClient();
    await expect(client.createOAuthClient({ clientId: 'dup', name: 'Dup', grantTypes: [] })).rejects.toMatchObject({
      status: 409,
      code: 'CLIENT_ALREADY_EXISTS',
      message: 'A client with this ID already exists'
    });
  });

  it('maps validation errors from a 400 response', async () => {
    nock(BASE_URL)
      .post('/oauth/clients')
      .reply(400, { validationErrors: [{ message: 'redirectUris is required for authorization_code' }] });

    const client = freshClient();
    await expect(client.createOAuthClient({ clientId: 'bad', name: 'Bad', grantTypes: ['authorization_code'] })).rejects.toMatchObject(
      { status: 400, message: 'redirectUris is required for authorization_code' }
    );
  });

  it('maps a network-level error (connection refused) to a 503', async () => {
    nock(BASE_URL).get('/serverSettings').replyWithError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });
    const client = freshClient();
    await expect(client.getServerSettings()).rejects.toMatchObject({ status: 503, code: 'PF_UNREACHABLE' });
  });
});
