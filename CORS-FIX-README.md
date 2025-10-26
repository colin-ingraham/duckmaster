# CORS ERROR - FIXED!

## What Was Wrong

The browser was blocking direct API calls to Anthropic due to CORS (Cross-Origin Resource Sharing) security policy. This is normal - browsers don't allow frontend apps to call external APIs directly for security reasons.

## The Solution

I've added a **backend proxy server** that sits between your browser and the Anthropic API. The browser talks to your local server, and the server talks to Anthropic.

## What Changed

1. **Added Express server** in `/server/index.js`
2. **Updated package.json** with new dependencies
3. **Changed API calls** to use `http://localhost:3001` instead of Anthropic directly
4. **New start script** runs both frontend and backend together

## How to Use the Fixed Version

### Step 1: Stop Current Server
Press `Ctrl + C` in your terminal to stop the current server.

### Step 2: Install New Dependencies
```bash
npm install
```

This will install:
- `express` - Web server
- `cors` - Handles cross-origin requests
- `dotenv` - Reads .env file
- `concurrently` - Runs both servers at once

### Step 3: Make Sure .env File is Ready
Your `.env` file should still be in the root folder with:
```
REACT_APP_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### Step 4: Start Everything
```bash
npm start
```

This will automatically start:
- ✅ Backend server on `http://localhost:3001`
- ✅ Frontend React app on `http://localhost:3000`

You should see:
```
🎲 DM Table API Server running on http://localhost:3001
✅ API Key configured: Yes
```

### Step 5: Play!
Open your browser to `http://localhost:3000` and the AI should now work!

## Troubleshooting

**"Cannot find module 'express'"**
→ Run `npm install` again

**"EADDRINUSE: Port 3001 already in use"**
→ Another app is using port 3001
→ Kill it with: `npx kill-port 3001` or change the port in `server/index.js`

**"API Key configured: No"**
→ Your .env file isn't being read
→ Make sure it's in the root folder (same level as package.json)
→ Make sure it's named exactly `.env`

**Backend starts but frontend doesn't**
→ Make sure you installed all dependencies: `npm install`
→ Try running them separately:
  - Terminal 1: `npm run server`
  - Terminal 2: `npm run client`

**"Failed to fetch" from localhost:3001**
→ Backend server didn't start
→ Check the terminal for error messages
→ Make sure port 3001 is available

## How It Works

Before (CORS Error):
```
Browser → ❌ → Anthropic API (blocked by CORS)
```

After (Working):
```
Browser → ✅ → Your Local Server → ✅ → Anthropic API
```

Your local server doesn't have CORS restrictions, so it can talk to Anthropic freely!

## File Structure

```
dm-table-game/
├── server/
│   └── index.js         ← New backend server
├── src/
│   └── components/
│       └── DMTable.jsx  ← Updated to use localhost:3001
├── package.json         ← Updated with new dependencies & scripts
└── .env                 ← Your API key (create this)
```

## Important Notes

- Both servers must be running for the game to work
- The `npm start` command runs both automatically
- Backend server MUST see your .env file
- Make sure you have the .env file in the root (not in server/ or src/)

## Still Having Issues?

1. Delete `node_modules` folder
2. Delete `package-lock.json` file
3. Run `npm install`
4. Make sure .env file exists with your API key
5. Run `npm start`
6. Check terminal for any error messages

The game should now work perfectly! 🎲⚔️
