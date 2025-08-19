import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import open from 'open';
import { v4 as uuidv4 } from 'uuid';
import { components } from './emr-api-types'; 

// --- Type Definitions for API Contracts ---


// --- Use the imported types ---
type EndpointsResponse = components['schemas']['EndpointsResponse'];
type PatientListResponse = components['schemas']['PatientListResponse'];
type PostNoteForm = components['schemas']['PostNoteForm'];
type PostNoteResponse = components['schemas']['PostNoteResponse'];
type GetSummaryResponse = components['schemas']['GetSummaryResponse'];
type SetSummaryRequest = components['schemas']['SetSummaryRequest'];
type SetSummaryResponse = components['schemas']['SetSummaryResponse'];
type EncounterDetails = components['schemas']['EncounterDetails'];
type EncounterListResponse = components['schemas']['EncounterListResponse'];
type GetEncounterNoteResponse = components['schemas']['GetEncounterNoteResponse'];
type ErrorResponse = components['schemas']['ErrorResponse'];

// --- Type Definitions End Here ---

// --- Server Setup ---
const app = express();
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;


// This is the secret API key the app must send in Authorization header as Bearer token.
const API_KEY = 'your-super-secret-api-key';

// --- In-Memory Storage ---

// This variable will hold the data from the last POST request.
let latestNoteData: PostNoteForm | null = null;


let patients = [
  {
    id: 'pat_12345_dummy',
    display_name: 'John Doe',
    display_id: 'JD-001',
    display_gender: 'Male',
    display_birthdate: "1970-06-22",
  }, 
  {
    id: 'pat_67890_dummy',
    display_name: 'Jane Doe',
    display_id: 'JD-002',
    display_gender: 'Female',
    display_birthdate: "2000-05-15",
  }
];

// This object will hold the clinical summary notes for each patient.
let patientSummaries: { [key: string]: string } = {
  'pat_12345_dummy': 'John Doe has a history of hypertension and is currently on Lisinopril. He reports no new complaints today. Vitals are stable.',
  'pat_67890_dummy': 'Jane Doe is here for her annual check-up. She has a pollen allergy and uses a seasonal nasal spray. She is up-to-date on all vaccinations.'
};

// This object will hold the encounters for each patient.
let patientEncounters: { [key: string]: EncounterDetails[] } = {
  'pat_12345_dummy': [
    { id: 'enc_1', display_name: 'Follow-up on Hypertension', date: '2025-08-10'},
    { id: 'enc_2', display_name: 'Annual Check-up', date: '2024-07-15' },
  ],
  'pat_67890_dummy': [
    { id: 'enc_3', display_name: 'Allergy Consultation', date: '2025-08-01' },
  ],
};

let encounterNotes: { [key: string]: string } = {
  'enc_1': 'Patient presented for a follow-up on their hypertension. Blood pressure is well-controlled with Lisinopril. No new complaints. Advised to continue current medication and monitor blood pressure at home.',
  'enc_2': 'Annual check-up. Patient is in good health. Discussed importance of diet and exercise. All vaccinations are up-to-date.',
  'enc_3': 'Patient reports seasonal allergies. Prescribed a nasal spray to be used as needed. Advised to avoid known allergens.',
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

// 0. GET /endpoints - To fetch the available API endpoints
app.get('/endpoints', requireApiKey, (_req: Request, res: Response<EndpointsResponse>) => {
    console.log(`[${new Date().toISOString()}] GET /endpoints request received.`);

    const responseData: EndpointsResponse = {
        get_patients: `${BASE_URL}/patients`,
        post_note: `${BASE_URL}/notes`,
        get_patient_summary: `${BASE_URL}/patient-summary/:patientId`,
        set_patient_summary: `${BASE_URL}/patient-summary/:patientId`,
        get_patient_encounters: `${BASE_URL}/patients/:patientId/encounters`,
        get_encounter_note: `${BASE_URL}/encounters/:encounterId`,
    }
    
    res.status(200).json(responseData);
});

// 1. GET /patients - To fetch the patient list
app.get('/patients', requireApiKey, (_req: Request, res: Response<PatientListResponse>) => {
  console.log(`[${new Date().toISOString()}] GET /patients request received.`);

  const responseData: PatientListResponse = {
    patients,
  };

  res.status(200).json(responseData);
});

// 2. POST /notes - To post the generated notes
app.post('/notes', requireApiKey, async (req: Request<{}, {}, PostNoteForm>, res: Response<PostNoteResponse>) => {
  console.log(`[${new Date().toISOString()}] POST /notes request received.`);
  console.log('--- Incoming Request Headers ---');
  console.log(JSON.stringify(req.headers, null, 2));
  console.log('------------------------------');

  latestNoteData = req.body;
  console.log('Note data saved. Opening view in browser...');

  await open(`${BASE_URL}/view-note?apiKey=${API_KEY}`);

   let encounterId = req.body.encounter_id;

  if (!encounterId) {
    encounterId = `enc_${uuidv4()}`;
    // Create a new encounter
    if (!patientEncounters[req.body.patient_id]) {
        patientEncounters[req.body.patient_id] = [];
    }
    patientEncounters[req.body.patient_id].push({
        id: encounterId,
        display_name: req.body.note_title,
        date: new Date().toISOString().split('T')[0],
    });
  }

  const noteContent = 'notes' in req.body ? req.body.notes : JSON.stringify(req.body.notes_json, null, 2);
  encounterNotes[encounterId] = noteContent;

  res.status(200).json({ message: 'Note received and view opened in browser!', encounter_id: encounterId });
});

// 3. GET /patient-summary/:patientId - To fetch the clinical summary
app.get('/patient-summary/:patientId', requireApiKey, (req: Request<{ patientId: string }>, res: Response<GetSummaryResponse | ErrorResponse>) => {
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
app.post('/patient-summary/:patientId', requireApiKey, (req: Request<{ patientId: string }, {}, SetSummaryRequest>, res: Response<SetSummaryResponse | ErrorResponse>) => {
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


// 6. GET /patients/:patientId/encounters - To fetch the encounter list for a patient
app.get('/patients/:patientId/encounters', requireApiKey, (req: Request<{ patientId: string }>, res: Response<EncounterListResponse | ErrorResponse>) => {
    const { patientId } = req.params;
    console.log(`[${new Date().toISOString()}] GET /patients/${patientId}/encounters request received.`);

    const encounters = patientEncounters[patientId];

    if (encounters) {
        res.status(200).json({ encounters: encounters });
    } else {
        // Return an empty list if the patient exists but has no encounters
        if (patientSummaries.hasOwnProperty(patientId)) {
            res.status(200).json({ encounters: [] });
        } else {
            res.status(404).json({ error: 'Not Found', message: 'No encounters found for this patient.' });
        }
    }
});

// 6. GET /encounters/:encounterId - To fetch the saved note for an encounter
app.get('/encounters/:encounterId', requireApiKey, (req: Request<{ encounterId: string }>, res: Response<GetEncounterNoteResponse | ErrorResponse>) => {
    const { encounterId } = req.params;
    console.log(`[${new Date().toISOString()}] GET /encounters/${encounterId} request received.`);

    const note = encounterNotes[encounterId];

    if (note) {
        res.status(200).json({ note: note });
    } else {
        res.status(404).json({ error: 'Not Found', message: 'No note found for this encounter.' });
    }
});


// A1. GET /view-note - This is the endpoint to display the data
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
        <p><span class="label">Encounter ID:</span> ${latestNoteData.encounter_id || "New"}</p>

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
  console.log(`\n🩺 Test Server is running on ${BASE_URL}`);
  console.log('---------------------------------------------------------');
  console.log(`🔑 Your API Key is: "${API_KEY}"`);
  console.log('---------------------------------------------------------');
  console.log('Available Endpoints:');
  console.log(`   - Get All Endpoints (GET):     ${BASE_URL}/endpoints`);
  console.log(`   - Patient List (GET):          ${BASE_URL}/patients`);
  console.log(`   - Post Notes (POST):           ${BASE_URL}/notes`);
  console.log(`   - Get Summary (GET):           ${BASE_URL}/patient-summary/:patientId`);
  console.log(`   - Set Summary (POST):          ${BASE_URL}/patient-summary/:patientId`);
  console.log(`   - Get Encounters (GET):        ${BASE_URL}/patients/:patientId/encounters`);
  console.log(`   - Get Encounter Note (GET):    ${BASE_URL}/encounters/:encounterId`);
  console.log('\nWhen you post a note, a new browser tab will open to display it.');
});