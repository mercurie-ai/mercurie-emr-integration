import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import open from 'open';

interface PatientDetails {
  id: string; // should be url-safe and at max 32 characters 
  
  display_name: string,
  display_id?: string,
  display_gender?: string,
  display_birthdate?: string, // yyyy-mm-dd format
}

interface PatientListResponse {
  patients: PatientDetails[];
}

// patient_id in payload is the id from PatientDetails of the selected patient
type Payload  = 
    { patient_id: string, transcript?: string, audio_base64?: string, note_title?: string } & 
    ({ notes: string } |  { notes_json: object, notes_template: string })

// --- Server Setup ---
const app = express();
const PORT = 3001;

// This is the secret API key the app must send in Authorization header as Bearer token.
const API_KEY = 'your-super-secret-api-key';

// --- In-Memory Storage ---
// This variable will hold the data from the last POST request.
let latestNoteData: Payload | null = null;


// --- Middleware ---

// 1. CORS (Cross-Origin Resource Sharing)
// Mercurie website or Chrome extension will be blocked by the browser from making requests to 'http://localhost:3001'
// unless the server explicitly allows it. The cors() middleware adds the necessary
// headers to every response to permit this.
app.use(cors());

// 2. JSON Body Parser
// This middleware parses incoming request bodies with "Content-Type: application/json"
// Increase the body parser limit to handle large audio payloads, default is 100kb
app.use(express.json({ limit: '50mb' }));


// 3. Authentication Middleware
// This function checks for a valid API Key in the Authorization header.
const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // For API calls from the extension, check the Bearer token
  if (token && token === API_KEY) {
    return next(); // Key is valid, proceed.
  }

  // As a fallback for the /view-note browser request (which can't send headers),
  // we check for the API key in the query string.
  const queryApiKey = req.query.apiKey as string;
  if (queryApiKey && queryApiKey === API_KEY) {
    return next(); // Key is valid, proceed.
  }

  // If no valid key is found, send 401 Unauthorized.
  res.status(401).json({
    error: 'Unauthorized',
    message: 'A valid API key must be provided in the `Authorization: Bearer <key>` header.'
  });
};


// --- PROTECTED API Endpoints ---
// We add the 'requireApiKey' middleware to each route we want to protect.

// 1. GET /patients - To fetch the patient list
app.get('/patients', requireApiKey, (_req: Request, res: Response<PatientListResponse>) => {
  console.log(`[${new Date().toISOString()}] GET /patients request received.`);

  const dummyPatient1: PatientDetails = {
    id: 'pat_12345_dummy',
    display_name: 'John Doe',
    display_id: 'JD-001',
    display_gender: 'Male',
    display_birthdate: "1970-06-22",
  };

  const dummyPatient2: PatientDetails = {
    id: 'pat_67890_dummy',
    display_name: 'Jane Doe',
    display_id: 'JD-002',
    display_gender: 'Female',
    display_birthdate: "2000-05-15",
  };

  const responseData: PatientListResponse = {
    patients: [dummyPatient1, dummyPatient2],
  };

  res.status(200).json(responseData);
});


// 2. POST /notes - To post the generated notes
app.post('/notes', requireApiKey, async (req: Request<any, any, Payload>, res: Response) => {
  console.log(`[${new Date().toISOString()}] POST /notes request received.`);
  console.log('--- Incoming Request Headers ---');
  console.log(JSON.stringify(req.headers, null, 2));
  console.log('------------------------------');

  latestNoteData = req.body;
  console.log('Note data saved. Opening view in browser...');

  // Automatically open a new browser tab to the display page.
  // We pass the API key in the URL so the page can authenticate itself.
  await open(`http://localhost:${PORT}/view-note?apiKey=${API_KEY}`);

  res.status(200).json({ message: 'Note received and view opened in browser!' });
});


// 3. GET /view-note - This is the endpoint to display the data
app.get('/view-note', requireApiKey, (req: Request, res: Response) => {
  if (!latestNoteData) {
    res.status(404).send('<h1>No note data available.</h1><p>Please post a note from the extension first.</p>');
    return;
  }

  // Conditionally render the audio player if audio data exists
  const audioPlayerHtml = latestNoteData.audio_base64 ? `
    <h2>Audio Recording</h2>
    <audio controls style="width: 100%;">
      <source src="${latestNoteData.audio_base64}" type="audio/webm">
      Your browser does not support the audio element.
    </audio>
  ` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Note</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 900px; margin: auto; background-color: #f4f7f9; color: #333; }
        h1, h2 { color: #1a2b4d; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
        .container { background-color: #fff; padding: 20px 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        pre { background-color: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; font-family: "Courier New", Courier, monospace; }
        .label { font-weight: bold; color: #555; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Received Medical Note</h1>
        <h2>Patient Information</h2>
        <p><span class="label">Patient ID:</span> ${latestNoteData.patient_id}</p>

        ${audioPlayerHtml}

        <h2>Full Transcript</h2>
        <pre>${latestNoteData.transcript}</pre>

        <h2>Formatted Notes</h2>
        ${"notes" in latestNoteData &&
          `<pre>${latestNoteData.notes}</pre>`
        }
        ${"notes_json" in latestNoteData &&
          `<pre>${JSON.stringify(latestNoteData.notes_json, null, 2)}</pre>`
        }
      </div>
    </body>
    </html>
  `;

  res.send(htmlContent);
});


// --- Start the server ---
app.listen(PORT, () => {
  console.log(`\n🩺 Test Server is running on http://localhost:${PORT}`);
  console.log('---------------------------------------------------------');
  console.log(`🔑 Your API Key is: "${API_KEY}"`);
  console.log('---------------------------------------------------------');
  console.log(`   - Patient List Endpoint (GET): http://localhost:${PORT}/patients`);
  console.log(`   - Post Notes Endpoint (POST):  http://localhost:${PORT}/notes`);
  console.log('\nWhen you post a note, a new browser tab will open to display it.');
});