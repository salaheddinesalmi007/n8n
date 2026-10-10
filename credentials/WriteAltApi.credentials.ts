import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class WriteAltApi implements ICredentialType {
  name = 'writeAltApi';
  displayName = 'WriteAlt API';
  documentationUrl = 'https://writealt.com/documentation';
  icon = 'file:../nodes/WriteAlt/writealt.svg' as const;
  properties: INodeProperties[] = [
    { displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, default: '', required: true },
  ];
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: { headers: { 'X-API-Key': '={{$credentials.apiKey}}', Accept: 'application/json' } },
  };
  test: ICredentialTestRequest = {
    request: { baseURL: 'https://api.writealt.com/v1', url: '/account.php', method: 'GET' },
    rules: [{ type: 'responseSuccessBody', properties: { key: 'success', value: false, message: 'WriteAlt rejected the API key. Check your account and API key.' } }],
  };
}
