import nock from 'nock';
import { loginAgent, PF_BASE_URL } from './testHelpers';

describe('POST /api/onboard/oauth', () => {
  afterEach(() => nock.cleanAll());

  it('creates an OAuth client and returns runtime endpoints + a one-time secret', async () => {
    const { agent, csrfToken } = await loginAgent();

    nock(PF_BASE_URL)
      .post('/oauth/clients')
      .reply(201, (_uri, body: any) => ({
        clientId: body.clientId,
        name: body.name,
        grantTypes: body.grantTypes
      }));

    const res = await agent
      .post('/api/onboard/oauth')
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'My Test App',
        grantTypes: ['authorization_code'],
        redirectUris: ['https://app.example.com/callback'],
        scopes: ['profile'],
        oidcEnabled: true,
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenManagerRef: 'atm1',
        oidcPolicyRef: 'policy1'
      });

    expect(res.status).toBe(201);
    expect(res.body.client.clientId).toBe('my-test-app');
    expect(res.body.client.secretIssued).toBe(true);
    expect(typeof res.body.clientSecret).toBe('string');
    expect(res.body.client.clientSecret).toBeUndefined();
    expect(res.body.scopes).toEqual(expect.arrayContaining(['profile', 'openid']));
    expect(res.body.runtimeEndpoints).toMatchObject({
      discovery: expect.stringContaining('/.well-known/openid-configuration'),
      authorization: expect.stringContaining('/as/authorization.oauth2'),
      token: expect.stringContaining('/as/token.oauth2')
    });
  });

  it('rejects authorization_code without redirectUris', async () => {
    const { agent, csrfToken } = await loginAgent();

    const res = await agent.post('/api/onboard/oauth').set('x-csrf-token', csrfToken).send({
      name: 'Bad App',
      grantTypes: ['authorization_code'],
      tokenEndpointAuthMethod: 'client_secret_basic',
      accessTokenManagerRef: 'atm1'
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('supports PKCE public clients with no secret', async () => {
    const { agent, csrfToken } = await loginAgent();

    nock(PF_BASE_URL)
      .post('/oauth/clients')
      .reply(201, (_uri, body: any) => ({ clientId: body.clientId, name: body.name, grantTypes: body.grantTypes }));

    const res = await agent
      .post('/api/onboard/oauth')
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'SPA App',
        grantTypes: ['authorization_code'],
        redirectUris: ['https://spa.example.com/callback'],
        tokenEndpointAuthMethod: 'none',
        requireProofKeyForCodeExchange: true,
        accessTokenManagerRef: 'atm1'
      });

    expect(res.status).toBe(201);
    expect(res.body.client.secretIssued).toBe(false);
    expect(res.body.clientSecret).toBeUndefined();
  });

  it('rejects the request without a valid CSRF token', async () => {
    const { agent } = await loginAgent();

    const res = await agent.post('/api/onboard/oauth').send({
      name: 'No CSRF App',
      grantTypes: ['client_credentials'],
      tokenEndpointAuthMethod: 'client_secret_basic',
      accessTokenManagerRef: 'atm1'
    });

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated requests', async () => {
    const request = require('supertest');
    const { createApp } = require('../../app');
    const app = createApp();

    const res = await request(app).post('/api/onboard/oauth').send({});
    expect(res.status).toBe(401);
  });
});
