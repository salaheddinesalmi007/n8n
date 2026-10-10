# n8n-nodes-writealt

Generate multilingual image alt text with [WriteAlt](https://writealt.com) in n8n. This community node uses your WriteAlt account and production API.

## Installation

After verification, search for WriteAlt in the n8n nodes panel. On self-hosted n8n, install `n8n-nodes-writealt` under Settings > Community Nodes. Unverified community packages are not available on n8n Cloud.

## Credentials

1. Sign in at https://writealt.com/dashboard#settings/api.
2. Create an API key.
3. Add a WriteAlt API credential in n8n and paste the key.
4. Test the connection. Account checks consume no generation credits.

The key is handled by n8n credentials and sent to https://api.writealt.com/v1 in the X-API-Key header.

## Operations

### Generate Alt Text

Provide a publicly accessible image URL, comma-separated language codes (for example `en,es`), a writing style, and optional keywords or context. Supports 1 to 10 languages per image. Keywords/context must be 255 characters or fewer.

Returns the actual `image_url`, `image_id` when returned by the API, primary `language`, `alt_text`, and an `alt_texts` object containing descriptions by language. Other API response fields are preserved. Credits are shown only when returned by the API; they are never fabricated.

Each input item generates one image request. Multiple languages use one credit per language and image. Review generated descriptions before publishing them.

### Get Account

Returns account information and the real `credits_remaining`. Does not consume generation credits.

### Get Languages

Returns supported language codes and names. Does not consume generation credits.

## Bulk images and CSV

Read a CSV with n8n's Extract From File node, or use Google Sheets to return one item per row. Map your image URL column to Image URL using an expression such as `{{ $json.image_url }}`. WriteAlt processes all incoming items and links each output back to its source item.

For 1,000 or more images, use Loop Over Items with a small batch size and a Wait node as needed to respect your WriteAlt account limits. Save each batch to Google Sheets, your CMS, or a database. Avoid collecting a very large catalog in a single long-running execution. The WriteAlt node processes requests sequentially to limit concurrent API load.

## Example workflow

Import `examples/generate-alt-text.json`, select your WriteAlt credential, replace the image URL, and execute it. To save the results, connect Google Sheets or your CMS and map `alt_text` to the destination field.

## Errors and limits

- Invalid API key: create or reconnect your WriteAlt credential.
- Insufficient credits: add WriteAlt credits before running again.
- Inaccessible image: use a direct image URL that does not require login.
- Generation timeout: requests allow up to 180 seconds; your n8n hosting may impose a shorter execution limit. Check WriteAlt history before retrying a request that may have completed.
- To continue after an individual failed image, configure n8n's node error handling to continue using the regular output. Failed items return an `error` field.

The node does not download or save image files to disk. Images and URLs are processed by WriteAlt according to its privacy policy. Your n8n instance may retain execution input/output according to its own settings.

## Development

Use Node.js 22 or newer with npm:

```sh
npm ci
npm run lint
npm test
npm run dev
```

The official n8n development command opens a local n8n instance with the package loaded. Use a dedicated WriteAlt test API key; live generation consumes account credits.

## Support and license

API documentation: https://writealt.com/documentation

Support: support@writealt.com

MIT license. No external runtime dependencies.
