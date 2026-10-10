import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, JsonObject } from 'n8n-workflow';

const baseUrl = 'https://api.writealt.com/v1';

export class WriteAlt implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'WriteAlt',
    name: 'writeAlt',
    icon: { light: 'file:writealt.svg', dark: 'file:writealt.dark.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Generate multilingual image alt text with WriteAlt',
    defaults: { name: 'WriteAlt' },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'writeAltApi', required: true }],
    usableAsTool: true,
    codex: {
      categories: ['Marketing & Content'],
      resources: { primaryDocumentation: [{ url: 'https://writealt.com/documentation' }] },
    },
    properties: [
      {
        displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'generate',
        options: [
          { name: 'Generate Alt Text', value: 'generate', description: 'Generate alt text for an image URL', action: 'Generate alt text' },
          { name: 'Get Account', value: 'account', description: 'Get account information and credit balance', action: 'Get account information' },
          { name: 'Get Languages', value: 'languages', description: 'Get supported generation languages', action: 'Get supported languages' },
        ],
      },
      { displayName: 'Image URL', name: 'imageUrl', type: 'string', default: '', required: true, placeholder: 'https://example.com/image.jpg', description: 'Publicly accessible HTTP or HTTPS URL of the image', displayOptions: { show: { operation: ['generate'] } } },
      { displayName: 'Language Codes', name: 'languages', type: 'string', default: 'en', required: true, description: 'Comma-separated language codes, such as en,es,fr. Each image and language uses one credit.', displayOptions: { show: { operation: ['generate'] } } },
      {
        displayName: 'Writing Style', name: 'styleId', type: 'options', default: 2, displayOptions: { show: { operation: ['generate'] } },
        options: [
          { name: 'Briefest', value: 5 }, { name: 'Comprehensive', value: 4 }, { name: 'Professional', value: 1 }, { name: 'Recommended', value: 2 }, { name: 'Shorter', value: 3 },
        ],
      },
      { displayName: 'Keywords or Context', name: 'keywords', type: 'string', default: '', description: 'Optional context or SEO keywords, up to 255 characters', displayOptions: { show: { operation: ['generate'] } } },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const output: INodeExecutionData[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        let body: IDataObject | undefined;
        let endpoint: string;
        if (operation === 'generate') {
          const imageUrl = (this.getNodeParameter('imageUrl', i) as string).trim();
          let parsed: URL;
          try { parsed = new URL(imageUrl); } catch { throw new NodeOperationError(this.getNode(), 'Enter a valid public HTTP or HTTPS image URL.', { itemIndex: i }); }
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new NodeOperationError(this.getNode(), 'The image URL must use HTTP or HTTPS.', { itemIndex: i });
          const languages = [...new Set((this.getNodeParameter('languages', i) as string).split(',').map((v) => v.trim()).filter(Boolean))];
          if (!languages.length || languages.length > 10) throw new NodeOperationError(this.getNode(), 'Choose between 1 and 10 language codes.', { itemIndex: i });
          const styleId = Number(this.getNodeParameter('styleId', i));
          if (!Number.isInteger(styleId) || styleId < 1 || styleId > 5) throw new NodeOperationError(this.getNode(), 'Choose a valid writing style.', { itemIndex: i });
          const keywords = (this.getNodeParameter('keywords', i) as string).trim();
          if (keywords.length > 255) throw new NodeOperationError(this.getNode(), 'Keywords or context must be 255 characters or fewer.', { itemIndex: i });
          body = { image_url: imageUrl, languages, style_id: styleId, keywords };
          endpoint = 'generate.php';
        } else if (operation === 'account') endpoint = 'account.php';
        else if (operation === 'languages') endpoint = 'languages.php';
        else throw new NodeOperationError(this.getNode(), 'Unknown WriteAlt operation.', { itemIndex: i });

        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'writeAltApi', {
          method: body ? 'POST' : 'GET', url: `${baseUrl}/${endpoint}`, body, json: true, timeout: 180000,
        }) as IDataObject;
        if (response.success === false) {
          const error = response.error;
          const message = typeof error === 'string' ? error : (error as IDataObject | undefined)?.message;
          throw new NodeOperationError(this.getNode(), String(message || 'WriteAlt could not complete the request.'), { itemIndex: i });
        }
        const data = (response.data || response) as IDataObject;
        let result: IDataObject = data;
        if (operation === 'generate') {
          const altTexts = data.alt_texts as IDataObject | undefined;
          if (!altTexts || typeof altTexts !== 'object' || Array.isArray(altTexts) || !Object.values(altTexts).some((v) => typeof v === 'string' && v.trim())) throw new NodeOperationError(this.getNode(), 'WriteAlt returned no generated alt text.', { itemIndex: i });
          const languages = body!.languages as string[];
          const language = languages.find((code) => typeof altTexts[code] === 'string' && altTexts[code]) || Object.keys(altTexts)[0];
          result = { ...data, image_url: body!.image_url, language, alt_text: altTexts[language], alt_texts: altTexts };
        } else if (operation === 'account') {
          const user = (data.user || {}) as IDataObject;
          result = { ...data, credits_remaining: data.credits_remaining ?? user.credits ?? data.credits ?? null };
        }
        output.push({ json: result, pairedItem: { item: i } });
      } catch (error) {
        if (!this.continueOnFail()) {
          throw new NodeApiError(this.getNode(), error as JsonObject, { message: error instanceof Error ? error.message : String(error), itemIndex: i });
        }
        output.push({ json: { error: error instanceof Error ? error.message : String(error) }, pairedItem: { item: i } });
      }
    }
    return [output];
  }
}
