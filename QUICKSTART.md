# Quick Start Guide

## Get Running in 3 Steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Add Your API Key
Create a file called `.env` in this folder and add:
```
REACT_APP_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key from: https://console.anthropic.com/

### 3. Start Both Servers
```bash
npm start
```

This starts both the backend API server (port 3001) and the React app (port 3000).
The game will open in your browser at http://localhost:3000

---

## What's Running?

When you run `npm start`, you'll see TWO servers start:
- 🎲 Backend API Server on http://localhost:3001
- ⚛️ React Frontend on http://localhost:3000

Both need to be running for the game to work!

---

## First Time Using This?

If you see errors about "npm not found":
1. Install Node.js from: https://nodejs.org/
2. Restart your terminal
3. Try again from step 1

## Common Issues

**"Invalid API key" error?**
- Double-check your API key is correct in `.env`
- Make sure there are no extra spaces
- Verify your Anthropic account is active

**Port 3000 already in use?**
The terminal will ask if you want to use a different port. Type `y` and press Enter.

**Need help?**
Check the full README.md for detailed instructions.
