# Mercurie EMR Integration Demo Server

This repository contains a sample Typescript Node.js server that demonstrates the API endpoints required to integrate an Electronic Medical Record (EMR) platform with [Mercurie.ai](https://www.mercurie.ai).

The server is built using an **OpenAPI specification** as the single source of truth, ensuring the API is well-documented, consistent, and easy to work with. All TypeScript types are automatically generated from this specification.

The primary purpose of this server is to provide clients with a clear, working example of the API they need to expose from their own EMR systems to integrate successfully with Mercurie.

## Core Features

*   **OpenAPI Driven**: The entire API contract is defined in `openapi.yaml`, enabling automatic generation of client SDKs, server stubs, and documentation.
*   **Type Safe**: TypeScript types are generated directly from the OpenAPI spec, eliminating inconsistencies between the API definition and the server's implementation.
*   **Patient & Encounter Management**: Exposes endpoints to fetch patients, retrieve encounter histories, and get specific encounter notes.
*   **Note & Drug Order Submission**: Provides an endpoint to receive medical notes, including drug orders, from Mercurie. New notes can create new encounters, and the unique `encounter_id` is returned in the response.
*   **Clinical Summaries**: Includes endpoints to get and set high-level clinical summary notes for a patient.
*   **Zero-DB Setup**: Uses in-memory storage for demonstration purposes, requiring no external database.
*   **Instant Note Preview**: Automatically opens a browser tab to display the content of a newly submitted note.

## API Specification

The API contract is formally defined in the [openapi.yaml](./openapi.yaml) file. This file serves as the single source of truth for all endpoints, data models, and security requirements.

We encourage you to use tools like the [Swagger Editor](https://editor-next.swagger.io/) to view the interactive documentation for this API.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 16 or higher recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/mercurie-ai/mercurie-emr-integration.git
    cd mercurie-emr-integration
    ```

2.  Install the project dependencies:
    ```bash
    npm install
    ```

3.  **Generate API Types**: Before starting the server for the first time, you must generate the TypeScript interfaces from the OpenAPI specification:
    ```bash
    npm run generate-types
    ```
    This command reads `openapi.yaml` and creates the `src/emr-api-types.ts` file, which is used by `server.ts`.

### Running the Server

You can run the server in two modes:

1.  **Development Mode (Recommended)**: This uses `ts-node-dev` to automatically restart the server whenever you make changes to the code.
    ```bash
    npm run dev
    ```

2.  **Production Mode**:
    ```bash
    npm run start
    ```

These commands re-generate the TypeScript interfaces into `src/emr-api-types.ts` from the OpenAPI specification at `openapi.yaml` before starting the server. Once the server is running, your console will display:
- A secret **API Key**: This key must be sent in the `Authorization: Bearer <key>` header of every request.
- A list of **Available Endpoints**: You will need to configure the 'Get All Endpoints' URL (`http://localhost:3001/endpoints`) in the Mercurie external EMR settings to connect to this server.

```
🩺 Test Server is running on http://localhost:3001
---------------------------------------------------------
🔑 Your API Key is: "your-super-secret-api-key"
---------------------------------------------------------
Available Endpoints:
   - Get All Endpoints (GET):           http://localhost:3001/endpoints
   - Patient List (GET):                http://localhost:3001/patients
   - Post Notes (POST):                 http://localhost:3001/notes
   - Get Summary (GET):                 http://localhost:3001/patient-summary/:patientId
   - Set Summary (POST):                http://localhost:3001/patient-summary/:patientId
   - Get Encounters (GET):              http://localhost:3001/patients/:patientId/encounters
   - Get Encounter Note (GET):          http://localhost:3001/encounters/:encounterId
   - Get Drug Order Templates (GET):    http://localhost:3001/med-templates

When you post a note, a new browser tab will open to display it.
```

## Development Workflow

This project is designed to be "spec-first". If you need to make changes to the API (e.g., add a new endpoint or change a data model), you should follow these steps:

1.  **Modify the Contract**: Make your changes in the `openapi.yaml` file.
2.  **Regenerate Types**: Run the type generation script to update the TypeScript interfaces.
    ```bash
    npm run generate-types
    ```
3.  **Implement the Logic**: Update `server.ts` to implement the new functionality. TypeScript will guide you by showing errors if your code doesn't match the newly generated types.


## Adapters

These adapters are integration layers connecting Mercurie to various EMRs using the API schema defined in this project:

- [mercurie-ai/mercurie-emr-integration-openmrs](https://github.com/mercurie-ai/mercurie-emr-integration-openmrs): integration with OpenMRS.

If you have developed an open source adapter that you would like to share with the community, please drop us a message or create a pull request to update this README.