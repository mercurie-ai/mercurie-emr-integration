import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import open from 'open';

interface PatientDetails {
  id: string; // should be url-safe and at max 32 characters 
  
  display_name: string,
  display_id?: string,
  display_gender?: string,
  display_birthdate?: string, // yyyy-mm-dd format

  patient_summary?: {
    get_endpoint?: string, // url to fetch patient summary notes, using the api key for external EMR
    set_endpoint?: string, // url where to post edited summary notes, using the api key for external EMR
  }
}

interface PatientListResponse {
  patients: PatientDetails[];
}

// patient_id in payload is the id from PatientDetails of the selected patient
type PostNoteForm = 
    { 
      patient_id: string, 
      transcript?: string, // if user selects send transcript in prescription settings
      audio_base64?: string[], // if user selects send audio in prescription settings
      note_title: string 
    } & 
    (
      { 
        notes: string  // if user selects unstructured note format
      } 
      | 
      { 
        notes_json: object,  // if user selects structured note format
        notes_template: string 
      }
    )

// --- Server Setup ---
const app = express();
const PORT = 3001;

// This is the secret API key the app must send in Authorization header as Bearer token.
const API_KEY = 'your-super-secret-api-key';

// --- In-Memory Storage ---
// This variable will hold the data from the last POST request.
let latestNoteData: PostNoteForm | null = null;

// This object will hold the clinical summary notes for each patient.
let patientSummaries: { [key: string]: string } = {
  'pat_12345_dummy': 'John Doe has a history of hypertension and is currently on Lisinopril. He reports no new complaints today. Vitals are stable.',
  'pat_67890_dummy': 'Jane Doe is here for her annual check-up. She has a pollen allergy and uses a seasonal nasal spray. She is up-to-date on all vaccinations.'
};


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
    patient_summary: {
      get_endpoint: `http://localhost:${PORT}/patient-summary/pat_12345_dummy`,
      set_endpoint: `http://localhost:${PORT}/patient-summary/pat_12345_dummy`,
    }
  };

  const dummyPatient2: PatientDetails = {
    id: 'pat_67890_dummy',
    display_name: 'Jane Doe',
    display_id: 'JD-002',
    display_gender: 'Female',
    display_birthdate: "2000-05-15",
    patient_summary: {
      get_endpoint: `http://localhost:${PORT}/patient-summary/pat_67890_dummy`,
      set_endpoint: `http://localhost:${PORT}/patient-summary/pat_67890_dummy`,
    }
  };

  const responseData: PatientListResponse = {
    patients: [dummyPatient1, dummyPatient2],
  };

  res.status(200).json(responseData);
});

// 2. POST /notes - To post the generated notes
app.post('/notes', requireApiKey, async (req: Request<any, any, PostNoteForm>, res: Response) => {
  console.log(`[${new Date().toISOString()}] POST /notes request received.`);
  console.log('--- Incoming Request Headers ---');
  console.log(JSON.stringify(req.headers, null, 2));
  console.log('------------------------------');

  latestNoteData = req.body;
  console.log('Note data saved. Opening view in browser...');

  await open(`http://localhost:${PORT}/view-note?apiKey=${API_KEY}`);

  res.status(200).json({ message: 'Note received and view opened in browser!' });
});

// 3. GET /patient-summary/:patientId - To fetch the clinical summary
app.get('/patient-summary/:patientId', requireApiKey, (req: Request, res: Response) => {
    const { patientId } = req.params;
    console.log(`[${new Date().toISOString()}] GET /patient-summary/${patientId} request received.`);

    const summary = patientSummaries[patientId];

    if (summary) {
        res.status(200).json({ summary_notes: summary });
    } else {
        res.status(404).json({ error: 'Not Found', message: 'No summary found for this patient.' });
    }
});

// 4. POST /patient-summary/:patientId - To update the clinical summary
app.post('/patient-summary/:patientId', requireApiKey, (req: Request, res: Response) => {
    const { patientId } = req.params;
    const { summary_notes } = req.body;

    console.log(`[${new Date().toISOString()}] POST /patient-summary/${patientId} request received.`);

    if (patientSummaries.hasOwnProperty(patientId)) {
        if (typeof summary_notes === 'string') {
            patientSummaries[patientId] = summary_notes;
            console.log(`Summary for ${patientId} updated to: "${summary_notes}"`);
            res.status(200).json({ message: 'Summary updated successfully.' });
        } else {
            res.status(400).json({ error: 'Bad Request', message: 'Request body must contain a "summary_notes" string.' });
        }
    } else {
        res.status(404).json({ error: 'Not Found', message: 'Patient not found.' });
    }
});


// 5. GET /view-note - This is the endpoint to display the data
app.get('/view-note', requireApiKey, (req: Request, res: Response) => {
  if (!latestNoteData) {
    res.status(404).send('<h1>No note data available.</h1><p>Please post a note from the extension first.</p>');
    return;
  }

  // Conditionally render the audio player if audio data exists
  const audioPlayerHtml = latestNoteData.audio_base64 && latestNoteData.audio_base64.length > 0
    ? latestNoteData.audio_base64.map((audioData, index) => `
        <h2>Audio Recording ${index + 1}</h2>
        <audio controls style="width: 100%;">
          <source src="${audioData}" type="audio/webm">
          Your browser does not support the audio element.
        </audio>
      `).join('')
    : '';
    
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
  console.log(`   - Get Summary (GET):           http://localhost:${PORT}/patient-summary/:patientId`);
  console.log(`   - Set Summary (POST):          http://localhost:${PORT}/patient-summary/:patientId`);
  console.log('\nWhen you post a note, a new browser tab will open to display it.');
});