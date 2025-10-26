const express = require('express');
const cors = require('cors');
require('dotenv').config();
// No need for 'node-fetch' if using Node.js v18+ where fetch is global

const app = express();
const PORT = 3001;
const RASPBERRY_PI_IP = "10.72.6.3"; // <-- IMPORTANT: Replace this!
const RASPBERRY_PI_PORT = 5000;
let lastDiceResult = null;
let lastDiceResultTimestamp = null;

app.use(cors());
// Increase the limit to allow for larger base64 image strings
app.use(express.json({ limit: '50mb' }));

// --- Existing /api/chat endpoint ---
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, max_tokens, stream } = req.body;

    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('API Error: Anthropic API Key not configured on server.');
      return res.status(500).json({ error: 'API key not configured on server.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001', // Use a vision-capable model
        max_tokens: max_tokens || 500,
        stream: stream || false, // Streaming might not be ideal for simple dice read response
        messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return res.status(response.status).json({ error: `Anthropic API Error: ${errorText}` });
    }

    // Handle streaming or non-streaming based on request
    if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          // Write chunk directly; frontend handles SSE parsing
          res.write(chunk);
        }
        res.end();
    } else {
        const data = await response.json();
        res.json(data);
    }

  } catch (error) {
    console.error('Server error in /api/chat:', error);
    res.status(500).json({ error: error.message });
  }
});


// --- NEW /api/read-dice endpoint ---
app.post('/api/read-dice', async (req, res) => {
  console.log("Received request on /api/read-dice"); // Add logging
  try {
    const { imageData } = req.body; // Expecting { "imageData": "base64string..." }

    if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
        console.error('Invalid image data received');
        return res.status(400).json({ error: 'Invalid or missing imageData. Must be a base64 encoded data URI string (e.g., "data:image/jpeg;base64,...").' });
    }

    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('API Error: Anthropic API Key not configured on server.');
      return res.status(500).json({ error: 'API key not configured on server.' });
    }

    // Extract base64 data and media type from the data URI
    const base64Data = imageData.split(',')[1];
    const mediaTypeMatch = imageData.match(/^data:(image\/.*?);base64,/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg'; // Default to jpeg if not found

    console.log(`Sending image (${mediaType}) to Anthropic for analysis...`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // Use a model that supports vision, like Claude 3 Haiku, Sonnet, or Opus
        model: 'claude-3-haiku-20240307',
        max_tokens: 50, // Keep it short for just the number
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType, // e.g., 'image/jpeg', 'image/png'
                  data: base64Data,
                },
              },
              {
                type: 'text',
                // Simple prompt focused on the task
                text: 'Analyze the attached image which shows a standard polyhedral die (like d6 OR d20) after a roll. What number is showing face-up? If it is a d6, the number should only be from 1-6. Respond ONLY with the single number (as an integer). If you cannot clearly determine the number, respond with "null".',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API Error:', response.status, errorText);
      return res.status(response.status).json({ error: `Anthropic API Error: ${errorText}` });
    }

    const data = await response.json();

    // --- Extract the number ---
    // Claude's response structure might vary slightly, adjust extraction as needed.
    // Assuming the number is in the first content block's text.
    let diceValue = null;
    if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        const textResponse = data.content[0].text.trim();
        // Try to parse the text response as an integer
        const parsedNumber = parseInt(textResponse, 10);
        if (!isNaN(parsedNumber)) {
            diceValue = parsedNumber;
        } else if (textResponse.toLowerCase() === 'null') {
            diceValue = null; // Claude couldn't determine
        }
        // Add more robust parsing if Claude sometimes includes extra text
    }

    console.log("Anthropic response processed. Determined dice value:", diceValue);

    if (diceValue !== null) {
      lastDiceResult = diceValue;
      lastDiceResultTimestamp = Date.now(); // Store when we got it
      console.log(`Stored dice result: ${lastDiceResult}`);
      res.json({ diceValue: diceValue });
    } else {
      console.error('Could not determine dice value from image.');
      lastDiceResult = null;
      lastDiceResultTimestamp = null;
      res.status(400).json({ error: 'Could not determine dice value from image.' });
    }

  } catch (error) {
    console.error('Server error in /api/read-dice:', error);
    lastDiceResult = null;
    lastDiceResultTimestamp = null;
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/get-last-roll', (req, res) => {
  // Optional: Clear result if it's too old (e.g., > 30 seconds)
  const MAX_AGE_MS = 30000;
  if (lastDiceResultTimestamp && (Date.now() - lastDiceResultTimestamp > MAX_AGE_MS)) {
      console.log("Clearing stale dice result.");
      lastDiceResult = null;
      lastDiceResultTimestamp = null;
  }

  if (lastDiceResult !== null) {
    const resultToSend = lastDiceResult;
    console.log(`Sending stored dice result: ${resultToSend}`);
    // Clear the result immediately after sending it to the frontend
    lastDiceResult = null;
    lastDiceResultTimestamp = null;
    res.json({ diceValue: resultToSend });
  } else {
    // No result ready yet
    res.json({ diceValue: null });
  }
});

app.post('/api/request-physical-roll', async (req, res) => {
  if (!RASPBERRY_PI_IP || RASPBERRY_PI_IP === "YOUR_RASPBERRY_PI_IP_ADDRESS") {
    console.error("Raspberry Pi IP address is not configured in server/index.js");
    return res.status(500).json({ error: "Raspberry Pi trigger endpoint not configured on server." });
  }

  const piTriggerUrl = `http://${RASPBERRY_PI_IP}:${RASPBERRY_PI_PORT}/trigger-capture`;
  console.log(`Sending trigger to Raspberry Pi at ${piTriggerUrl}`);

  try {
    // Send a POST request to the Pi's server
    const piResponse = await fetch(piTriggerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Send empty body, POST indicates the trigger
    });

    if (!piResponse.ok) {
      // If the Pi server responds with an error
      const errorText = await piResponse.text();
      console.error(`Error triggering Raspberry Pi: ${piResponse.status} - ${errorText}`);
      return res.status(500).json({ error: `Failed to trigger Raspberry Pi (${piResponse.status})` });
    }

    const piData = await piResponse.json();
    console.log("Raspberry Pi response:", piData.message);
    res.status(202).json({ message: "Physical roll process initiated." }); // Send 'Accepted' back to frontend

  } catch (error) {
    console.error('Error sending trigger request to Raspberry Pi:', error);
    res.status(500).json({ error: 'Could not reach Raspberry Pi to trigger roll.' });
  }
});


// --- Existing Listener ---
app.listen(PORT, () => {
  console.log(`🎲 DM Table API Server running on http://localhost:${PORT}`);
  console.log(`✅ API Key configured: ${process.env.REACT_APP_ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);
});