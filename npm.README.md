# Mercurie EMR Integration - OpenAPI Specification

[![NPM Version](https://img.shields.io/npm/v/@mercurie/emr-integration.svg)](https://www.npmjs.com/package/@mercurie/emr-integration)

This package contains the official OpenAPI 3.1 specification file (`openapi.yaml`) for the [Mercurie](https://www.mercurie.ai) EMR Integration API.

The purpose of this package is to provide a single, versioned source of truth for the API contract. It is intended to be used by developers building client-side adapters or other integrations that need to conform to the Mercurie EMR API.

The full implementation of the demo server for this API can be found in the [mercurie-emr-integration GitHub repository](https://github.com/mercurie-ai/mercurie-emr-integration).

## Installation

Install this package as a development dependency in your project using npm:

```bash
npm install --save-dev @mercurie/emr-integration
```

## Usage

Once installed, the `openapi.yaml` file is available within your project's `node_modules` directory. You can use this file with various tools to generate type-safe clients, server stubs, or documentation.

### Example: Generating TypeScript Types

A common use case is to generate TypeScript types for your project.

1.  First, ensure you have a tool like `openapi-typescript` installed:
    ```bash
    npm install -D openapi-typescript
    ```

2.  Add a script to your `package.json` to point to the spec file in `node_modules`:

    ```json
    {
      "scripts": {
        "generate:api-types": "openapi-typescript ./node_modules/@mercurie/emr-integration/openapi.yaml --output ./src/generated-api-types.ts"
      }
    }
    ```

3.  Now you can run the command to generate the types:
    ```bash
    npm run generate:api-types
    ```

This ensures that your adapter library always uses types that are perfectly in sync with the published API specification. When the API is updated, you can simply update this package to get the new specification and regenerate your types.