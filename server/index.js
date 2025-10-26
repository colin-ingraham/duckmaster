const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();

const app = express();
const PORT = 3001;
const RASPBERRY_PI_IP = "10.72.6.3";
const RASPBERRY_PI_PORT = 5000;

// --- Arduino Serial Configuration ---
// IMPORTANT: Set this to your Arduino's port!
// Windows: 'COM3', 'COM4', etc.
// Mac: '/dev/cu.usbserial-XXXX' or '/dev/cu.usbmodem-XXXX'
// Linux: '/dev/ttyUSB0' or '/dev/ttyACM0'
const ARDUINO_PORT = 'COM3'; // <-- CHANGE THIS TO YOUR PORT!
const BAUD_RATE = 9600;

// --- Arduino serial + queue + reconnect (DROP-IN REPLACEMENT) ---
let serialPort = null;
let parser = null;
let arduinoReady = false;
let reconnectTimer = null;
let lastOpenTimestamp = null;
let lastCloseTimestamp = null;
let lastCloseReason = null;

// Queue for pending coin commands while disconnected
// Each entry: { amount, reason, queuedAt }
const writeQueue = [];

// Helper: schedule a single reconnect (idempotent)
function scheduleReconnect() {
  if (reconnectTimer) return; // already scheduled
  console.log('🔄 Will attempt to reconnect in 5 seconds...');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initializeArduino(); // single controlled reconnect path
  }, 5000);
}

// Helper: process queued writes in order (called after successful open)
async function processQueue() {
  if (!serialPort || !serialPort.isOpen) {
    console.log('🟡 processQueue called but port is not open.');
    return;
  }

  if (writeQueue.length === 0) {
    return;
  }

  console.log(`📤 Replaying ${writeQueue.length} queued command(s) to Arduino...`);
  // send them sequentially
  while (writeQueue.length > 0) {
    const entry = writeQueue.shift();
    const command = `${entry.amount}\n`;
    try {
      await new Promise((resolve, reject) => {
        serialPort.write(command, (err) => {
          if (err) {
            // If write fails, push the entry back to front and trigger reconnect then abort processing
            console.error('❌ Failed to write queued command to Arduino:', err.message);
            writeQueue.unshift(entry);
            // Mark reason and schedule reconnect
            lastCloseReason = `write-error: ${err.message}`;
            arduinoReady = false;
            try { serialPort.close(); } catch(e) {}
            scheduleReconnect();
            return reject(err);
          }
          console.log(`💰 Sent queued command to dispense ${entry.amount} coins (queuedAt: ${new Date(entry.queuedAt).toISOString()})`);
          // wait for drain to avoid overwhelming device
          serialPort.drain((drainErr) => {
            if (drainErr) {
              console.warn('⚠️ drain error after queued write:', drainErr.message);
            }
            resolve();
          });
        });
      });
    } catch (err) {
      // stop processing on error — reconnect scheduled already
      break;
    }
  }
}

// Initialize Arduino serial connection
function initializeArduino() {
  // If port exists and is open or opening, do nothing
  if (serialPort && serialPort.isOpen) return;

  console.log(`🔌 Attempting to connect to Arduino on ${ARDUINO_PORT}...`);

  // Clean up previous serialPort object listeners if any (avoid listener buildup)
  try {
    if (serialPort) {
      try {
        serialPort.removeAllListeners && serialPort.removeAllListeners();
      } catch (e) {
        // ignore
      }
      serialPort = null;
    }
  } catch (e) {
    // ignore
  }

  serialPort = new SerialPort({
    path: ARDUINO_PORT,
    baudRate: BAUD_RATE,
    autoOpen: false, // open manually so we control timing
    dtr: false,
    rts: false,
    hupcl: false,
  });

  parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

  serialPort.on('open', () => {
    lastOpenTimestamp = Date.now();
    console.log('✅ Arduino serial port opened successfully at', new Date(lastOpenTimestamp).toISOString());
    arduinoReady = true;
    lastCloseReason = null;

    // Clear any scheduled reconnect
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // Small safety delay to allow Arduino to settle if it just reset
    setTimeout(() => {
      processQueue().catch(err => {
        console.error('❌ processQueue failed after open:', err && err.message ? err.message : err);
      });
    }, 200); // 200ms grace period
  });

  parser.on('data', (data) => {
    try {
      console.log('🤖 Arduino:', data.trim());
    } catch (e) {
      // ignore
    }
  });

  serialPort.on('error', (err) => {
    console.error('❌ Arduino serial port error:', err.message);
    lastCloseReason = `serial-error: ${err.message}`;
    arduinoReady = false;
    // avoid double scheduling
    scheduleReconnect();
  });

  serialPort.on('close', () => {
    lastCloseTimestamp = Date.now();
    const sinceOpen = lastOpenTimestamp ? `${lastCloseTimestamp - lastOpenTimestamp}ms` : 'unknown';
    console.log('⚠️  Arduino serial port closed at', new Date(lastCloseTimestamp).toISOString(), `(open-duration: ${sinceOpen})`);
    arduinoReady = false;

    // Provide diagnostic hint when close happens quickly after open (possible reset/brownout)
    if (lastOpenTimestamp && (lastCloseTimestamp - lastOpenTimestamp) < 1000) {
      console.log('💡 Diagnostic: port closed within 1s of opening — possible auto-reset, USB brownout, or bootloader activity.');
    }

    if (lastCloseReason) {
      console.log('💡 Close reason (if known):', lastCloseReason);
    }

    console.log(`📦 Pending queued commands at close: ${writeQueue.length}`);
    scheduleReconnect();
  });

  // Attempt open
  serialPort.open((err) => {
    if (err) {
      console.error('❌ Failed to open Arduino:', err.message);
      arduinoReady = false;
      lastCloseReason = `open-failed: ${err.message}`;
      scheduleReconnect();
    }
  });
}

// Redefine dispenseCoins to support queuing behavior (B2a) and immediate resolve when queued (P1)
function dispenseCoins(amount, reason = 'unspecified') {
  return new Promise((resolve, reject) => {
    // Validate amount
    if (typeof amount !== 'number' || amount < 1 || amount > 100) {
      reject(new Error('Amount must be a number between 1 and 100'));
      return;
    }

    // If Arduino ready and port open, attempt immediate write
    if (arduinoReady && serialPort && serialPort.isOpen) {
      const command = `${amount}\n`;
      serialPort.write(command, (err) => {
        if (err) {
          // If immediate write fails, queue the command and schedule reconnect if needed.
          console.error('❌ Failed to send command to Arduino:', err.message);
          lastCloseReason = `write-failed: ${err.message}`;
          arduinoReady = false;
          // queue the command for retry
          writeQueue.push({ amount, reason, queuedAt: Date.now() });
          scheduleReconnect();
          // Resolve immediately saying queued
          resolve({ queued: true, amount });
          return;
        }
        console.log(`💰 Sent command to dispense ${amount} coins to Arduino`);
        // drain then resolve
        serialPort.drain((drainErr) => {
          if (drainErr) {
            console.warn('⚠️ drain error after immediate write:', drainErr.message);
          }
          resolve({ success: true, amount });
        });
      });
    } else {
      // Not ready: queue the command for later replay
      writeQueue.push({ amount, reason, queuedAt: Date.now() });
      console.log(`🕒 Arduino not ready — queued dispense command: ${amount} (queue size: ${writeQueue.length})`);
      // Start reconnect if not already scheduled
      scheduleReconnect();
      // Resolve immediately to keep API responsive (P1)
      resolve({ queued: true, amount });
    }
  });
}

// Start connection on server boot
initializeArduino();



let lastDiceResult = null;
let lastDiceResultTimestamp = null;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Dispense coins function ---
function dispenseCoins(amount) {
  return new Promise((resolve, reject) => {
    // Check Arduino connection
    if (!arduinoReady || !serialPort || !serialPort.isOpen) {
      reject(new Error('Arduino not ready or not connected. Check console for connection status.'));
      return;
    }

    // Validate amount
    if (amount < 1 || amount > 100) {
      reject(new Error('Amount must be between 1 and 100'));
      return;
    }

    // Send command to Arduino
    const command = `${amount}\n`;
    serialPort.write(command, (err) => {
      if (err) {
        reject(new Error('Failed to send command to Arduino: ' + err.message));
        return;
      }
      console.log(`💰 Sent command to dispense ${amount} coins to Arduino`);
      resolve({ success: true, amount: amount });
    });
  });
}

// --- Tool definition for Claude ---
const COIN_DISPENSER_TOOL = {
  name: "dispense_coins",
  description: "Dispenses a specified number of coins from the physical coin dispenser. Use this when the game requires giving coins/gold to players as rewards, loot, or currency. Each coin represents 1 gold piece.",
  input_schema: {
    type: "object",
    properties: {
      amount: {
        type: "integer",
        description: "The number of coins to dispense (1-100). Each coin = 1 gold piece.",
        minimum: 1,
        maximum: 100
      },
      reason: {
        type: "string",
        description: "Brief explanation of why coins are being dispensed (e.g., 'Quest reward', 'Treasure chest', 'Combat loot')"
      }
    },
    required: ["amount"]
  }
};

// --- /api/chat endpoint ---
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, max_tokens, stream } = req.body;

    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('API Error: Anthropic API Key not configured on server.');
      return res.status(500).json({ error: 'API key not configured on server.' });
    }

    // Build request body
    const requestBody = {
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: max_tokens || 500,
      stream: stream || false,
      messages
    };

    // Only add tools in non-streaming mode
    if (!stream) {
      requestBody.tools = [COIN_DISPENSER_TOOL];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      return res.status(response.status).json({ error: `Anthropic API Error: ${errorText}` });
    }

    // Handle streaming
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
          res.write(chunk);
        }
        res.end();
    } else {
        // Handle non-streaming with tool use support
        const data = await response.json();

        // Check if Claude wants to use the coin dispenser tool
        if (data.stop_reason === 'tool_use' && data.content) {
          const toolUseBlock = data.content.find(block => block.type === 'tool_use');
          
          if (toolUseBlock && toolUseBlock.name === 'dispense_coins') {
            console.log('🤖 Claude requested coin dispense:', toolUseBlock.input);
            
            try {
              // Actually dispense the coins
              const result = await dispenseCoins(toolUseBlock.input.amount);
              console.log(`✅ Successfully dispensed ${result.amount} coins`);
              
              // Send the tool result back to Claude for a follow-up response
              const followUpMessages = [
                ...messages,
                {
                  role: 'assistant',
                  content: data.content
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'tool_result',
                      tool_use_id: toolUseBlock.id,
                      content: JSON.stringify({
                        success: true,
                        dispensed: result.amount,
                        message: `Successfully dispensed ${result.amount} coins`
                      })
                    }
                  ]
                }
              ];

              // Get Claude's final response after tool execution
              const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: model || 'claude-haiku-4-5-20251001',
                  max_tokens: max_tokens || 1024,
                  messages: followUpMessages,
                  tools: [COIN_DISPENSER_TOOL]
                })
              });

              const followUpData = await followUpResponse.json();
              return res.json(followUpData);

            } catch (error) {
              console.error('❌ Error dispensing coins:', error.message);
              // Send error back to Claude
              const errorMessages = [
                ...messages,
                {
                  role: 'assistant',
                  content: data.content
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'tool_result',
                      tool_use_id: toolUseBlock.id,
                      content: JSON.stringify({
                        success: false,
                        error: error.message
                      }),
                      is_error: true
                    }
                  ]
                }
              ];

              const errorFollowUp = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: model || 'claude-haiku-4-5-20251001',
                  max_tokens: max_tokens || 1024,
                  messages: errorMessages,
                  tools: [COIN_DISPENSER_TOOL]
                })
              });

              const errorData = await errorFollowUp.json();
              return res.json(errorData);
            }
          }
        }

        // No tool use, return response normally
        res.json(data);
    }

  } catch (error) {
    console.error('Server error in /api/chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Manual coin dispense endpoint (for testing) ---
app.post('/api/dispense-coins', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Amount must be a number' });
    }

    const result = await dispenseCoins(amount);
    console.log(`✅ Manual dispense successful: ${result.amount} coins`);
    res.json({ success: true, dispensed: result.amount, message: 'Coins dispensed successfully' });

  } catch (error) {
    console.error('❌ Error in /api/dispense-coins:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Check Arduino status ---
app.get('/api/arduino-status', (req, res) => {
  res.json({
    connected: arduinoReady,
    port: ARDUINO_PORT,
    baudRate: BAUD_RATE,
    status: arduinoReady ? 'ready' : 'disconnected'
  });
});

// --- /api/read-dice endpoint ---
app.post('/api/read-dice', async (req, res) => {
  console.log("📸 Received request on /api/read-dice");
  try {
    const { imageData } = req.body;

    if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
        console.error('Invalid image data received');
        return res.status(400).json({ error: 'Invalid or missing imageData. Must be a base64 encoded data URI string (e.g., "data:image/jpeg;base64,...").' });
    }

    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('API Error: Anthropic API Key not configured on server.');
      return res.status(500).json({ error: 'API key not configured on server.' });
    }

    const base64Data = imageData.split(',')[1];
    const mediaTypeMatch = imageData.match(/^data:(image\/.*?);base64,/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';

    console.log(`🔍 Sending image (${mediaType}) to Anthropic for analysis...`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
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

    let diceValue = null;
    if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        const textResponse = data.content[0].text.trim();
        const parsedNumber = parseInt(textResponse, 10);
        if (!isNaN(parsedNumber)) {
            diceValue = parsedNumber;
        } else if (textResponse.toLowerCase() === 'null') {
            diceValue = null;
        }
    }

    console.log("🎲 Dice value determined:", diceValue);

    if (diceValue !== null) {
      lastDiceResult = diceValue;
      lastDiceResultTimestamp = Date.now();
      console.log(`✅ Stored dice result: ${lastDiceResult}`);
      res.json({ diceValue: diceValue });
    } else {
      console.error('❌ Could not determine dice value from image.');
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

// --- Get last roll endpoint ---
app.get('/api/get-last-roll', (req, res) => {
  const MAX_AGE_MS = 30000;
  if (lastDiceResultTimestamp && (Date.now() - lastDiceResultTimestamp > MAX_AGE_MS)) {
      console.log("⏰ Clearing stale dice result.");
      lastDiceResult = null;
      lastDiceResultTimestamp = null;
  }

  if (lastDiceResult !== null) {
    const resultToSend = lastDiceResult;
    console.log(`🎲 Sending stored dice result: ${resultToSend}`);
    lastDiceResult = null;
    lastDiceResultTimestamp = null;
    res.json({ diceValue: resultToSend });
  } else {
    res.json({ diceValue: null });
  }
});

// --- Request physical roll endpoint ---
app.post('/api/request-physical-roll', async (req, res) => {
  if (!RASPBERRY_PI_IP || RASPBERRY_PI_IP === "YOUR_RASPBERRY_PI_IP_ADDRESS") {
    console.error("Raspberry Pi IP address is not configured in server/index.js");
    return res.status(500).json({ error: "Raspberry Pi trigger endpoint not configured on server." });
  }

  const piTriggerUrl = `http://${RASPBERRY_PI_IP}:${RASPBERRY_PI_PORT}/trigger-capture`;
  console.log(`🎲 Sending trigger to Raspberry Pi at ${piTriggerUrl}`);

  try {
    const piResponse = await fetch(piTriggerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!piResponse.ok) {
      const errorText = await piResponse.text();
      console.error(`Error triggering Raspberry Pi: ${piResponse.status} - ${errorText}`);
      return res.status(500).json({ error: `Failed to trigger Raspberry Pi (${piResponse.status})` });
    }

    const piData = await piResponse.json();
    console.log("✅ Raspberry Pi response:", piData.message);
    res.status(202).json({ message: "Physical roll process initiated." });

  } catch (error) {
    console.error('Error sending trigger request to Raspberry Pi:', error);
    res.status(500).json({ error: 'Could not reach Raspberry Pi to trigger roll.' });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log('\n🎲 ====================================');
  console.log('   DM Table API Server');
  console.log('   ====================================');
  console.log(`   Server running on: http://localhost:${PORT}`);
  console.log(`   API Key configured: ${process.env.REACT_APP_ANTHROPIC_API_KEY ? '✅ Yes' : '❌ No'}`);
  console.log(`   Raspberry Pi dice reader: ${RASPBERRY_PI_IP}`);
  console.log('   ====================================\n');

});