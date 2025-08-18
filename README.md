# Mercurie EMR Integration Demo Server

This repository contains a sample Typescript Node.js server that demonstrates the basic functionalities of an Electronic Medical Record (EMR) platform and the various endpoints required to integrate with https://www.mercurie.ai.

The primary purpose of this server is to provide clients with a clear, working example of the API endpoints they need to expose from their own EMR systems to integrate successfully with Mercurie.

## Features

*   **Patient List Retrieval**: Exposes an endpoint to fetch a list of patients.
*   **Note Submission**: Provides an endpoint to receive and process medical notes from Mercurie.
*   **Clinical Summaries**: Includes endpoints to get and set clinical summary notes for a patient.
*   **In-Memory Storage**: Uses in-memory variables to store data for demonstration purposes, requiring no database setup.
*   **Browser Preview**: Automatically opens a browser tab to display the content of a submitted note.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 14 or higher recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)

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

### Running the Server

To start the server, run the following command:

```bash
npm run start
```

Once the server is running, your console will display:
- A secret API Key: This key must be sent in the Authorization header of every request for authentication.
- A list of available Endpoints: You will need to configure the 'Get All Endpoints' URL in the Mercurie platform settings to connect to this server.

```
🩺 Test Server is running on http://localhost:3001
---------------------------------------------------------
🔑 Your API Key is: "your-super-secret-api-key"
---------------------------------------------------------
Available Endpoints:
   - Get All Endpoints (GET):   http://localhost:3001/endpoints
   - Patient List (GET):        http://localhost:3001/patients
   - Post Notes (POST):         http://localhost:3001/notes
   - Get Summary (GET):         http://localhost:3001/patient-summary/:patientId
   - Set Summary (POST):        http://localhost:3001/patient-summary/:patientId
   - Get Encounters (GET):      http://localhost:3001/patients/:patientId/encounters
   - Get Encounter Note (GET):  http://localhost:3001/encounters/:encounterId

When you post a note, a new browser tab will open to display it.
```