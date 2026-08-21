import nock from 'nock';
import { loginAgent, PF_BASE_URL } from './testHelpers';

const SAMPLE_METADATA_XML = `<?xml version="1.0"?>
<EntityDescriptor entityID="urn:example:sp" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data><X509Certificate>MIICertDataHere==</X509Certificate></X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <AssertionConsumerService isDefault="true" index="0"
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://sp.example.com/acs"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

describe('POST /api/onboard/saml', () => {
  afterEach(() => nock.cleanAll());

  it('creates an SP connection from manual fields and returns runtime endpoints', async () => {
    const { agent, csrfToken } = await loginAgent();

    nock(PF_BASE_URL).get('/idp/spConnections').reply(200, { items: [] });
    nock(PF_BASE_URL)
      .post('/idp/spConnections')
      .reply(201, (_uri, body: any) => ({ id: body.id, entityId: body.entityId, name: body.name }));

    const res = await agent
      .post('/api/onboard/saml')
      .set('x-csrf-token', csrfToken)
      .send({
        partnerEntityId: 'urn:manual:sp',
        connectionName: 'Manual SP',
        acsUrl: 'https://sp.manual.com/acs',
        acsBinding: 'POST',
        nameIdFormat: 'emailAddress',
        attributeContract: [{ source: 'ldap', samlAttributeName: 'email' }],
        pfSigningKeyPairRef: 'key1'
      });

    expect(res.status).toBe(201);
    expect(res.body.connection.entityId).toBe('urn:manual:sp');
    expect(res.body.runtimeEndpoints).toMatchObject({
      sso: expect.stringContaining('/idp/SSO.saml2'),
      slo: expect.stringContaining('/idp/SLO.saml2'),
      metadata: expect.stringContaining('PartnerSpId=urn%3Amanual%3Asp')
    });
  });

  it('parses uploaded metadata XML to prefill entityId/ACS/signing cert', async () => {
    const { agent, csrfToken } = await loginAgent();

    nock(PF_BASE_URL).get('/idp/spConnections').reply(200, { items: [] });
    nock(PF_BASE_URL)
      .post('/idp/spConnections')
      .reply(201, (_uri, body: any) => ({ id: body.id, entityId: body.entityId, name: body.name }));

    const res = await agent
      .post('/api/onboard/saml')
      .set('x-csrf-token', csrfToken)
      .send({
        connectionName: 'Metadata SP',
        metadataXml: SAMPLE_METADATA_XML,
        pfSigningKeyPairRef: 'key1'
      });

    expect(res.status).toBe(201);
    expect(res.body.connection.entityId).toBe('urn:example:sp');
    expect(res.body.runtimeEndpoints.metadata).toContain('PartnerSpId=urn%3Aexample%3Asp');
  });

  it('rejects a duplicate partnerEntityId', async () => {
    const { agent, csrfToken } = await loginAgent();

    nock(PF_BASE_URL)
      .get('/idp/spConnections')
      .reply(200, { items: [{ id: 'urn:dup:sp', entityId: 'urn:dup:sp' }] });

    const res = await agent
      .post('/api/onboard/saml')
      .set('x-csrf-token', csrfToken)
      .send({
        partnerEntityId: 'urn:dup:sp',
        connectionName: 'Dup SP',
        acsUrl: 'https://sp.dup.com/acs',
        acsBinding: 'POST',
        pfSigningKeyPairRef: 'key1'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 403 feature-disabled when requireMfa is set but FEATURE_MFA_POLICY_WRITE=false', async () => {
    const { agent, csrfToken } = await loginAgent();

    nock(PF_BASE_URL).get('/idp/spConnections').reply(200, { items: [] });
    nock(PF_BASE_URL)
      .post('/idp/spConnections')
      .reply(201, (_uri, body: any) => ({ id: body.id, entityId: body.entityId, name: body.name }));

    const res = await agent
      .post('/api/onboard/saml')
      .set('x-csrf-token', csrfToken)
      .send({
        partnerEntityId: 'urn:mfa:sp',
        connectionName: 'MFA SP',
        acsUrl: 'https://sp.mfa.com/acs',
        acsBinding: 'POST',
        pfSigningKeyPairRef: 'key1',
        requireMfa: true
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FEATURE_DISABLED');
  });
});
