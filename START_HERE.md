# 🎲 START HERE - DM Table Game

Welcome! This is an AI-powered Dungeons & Dragons game that runs in your web browser.

## What You Need Before Starting

1. **A computer** (Windows, Mac, or Linux)
2. **Node.js installed** - Download from: https://nodejs.org/
3. **An Anthropic API key** - Get free credits at: https://console.anthropic.com/
4. **5-10 minutes** for setup

## Super Quick Start

### Option A: Automated Setup (Recommended)

**On Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
npm start
```

**On Windows:**
```cmd
setup.bat
npm start
```

### Option B: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
3. **Edit `.env` and add your API key:**
   ```
   REACT_APP_ANTHROPIC_API_KEY=your_key_here
   ```

4. **Start the game:**
   ```bash
   npm start
   ```

5. **Play!** Your browser will open to http://localhost:3000

## First Time Setup - Detailed

### Step 1: Install Node.js

1. Go to https://nodejs.org/
2. Download the LTS (Long Term Support) version
3. Run the installer with default settings
4. Restart your terminal/command prompt

Verify installation:
```bash
node --version
npm --version
```

### Step 2: Get Your API Key

1. Go to https://console.anthropic.com/
2. Sign up for an account (free credits included!)
3. Go to API Keys section
4. Create a new key
5. Copy it - you'll need it in the next step

### Step 3: Configure the Game

Create a file named `.env` in this folder (same location as this file) with:

```
REACT_APP_ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

Replace `sk-ant-your-actual-key-here` with your actual API key.

**Important:** 
- No quotes around the key
- No spaces before or after the =
- The file must be named exactly `.env` (with the dot)

### Step 4: Install Game Dependencies

Open terminal/command prompt in this folder and run:

```bash
npm install
```

This will download all required packages (might take a few minutes).

### Step 5: Start Playing!

```bash
npm start
```

The game will automatically open in your default browser at http://localhost:3000

## How to Play

1. **Choose a campaign** from the three available adventures
2. **Select number of players** (1-6)
3. **Pick characters** for each player
4. **Start adventuring!** Type what you want to do and the AI Dungeon Master will guide you

### Game Controls

- **Type actions** in the text box and press Enter or click Send
- **Roll dice** when prompted by clicking the dice button
- **View character sheets** by clicking player cards in the sidebar
- **Switch active player** using the refresh icon
- **Save your game** through the sidebar menu
- **Open settings** with the gear icon (top right)

## Troubleshooting

**Game won't start?**
→ See TROUBLESHOOTING.md for detailed help

**API errors?**
→ Double-check your .env file and API key

**Need more help?**
→ Check README.md for full documentation

## What's Next?

Once you have the game running:
- Read the full README.md for all features
- Check out the different character classes
- Try all three campaign adventures
- Experiment with different party compositions

## Important Notes

- **This uses real AI** - Each message costs a small amount (fractions of a cent)
- **Monitor your usage** at https://console.anthropic.com/
- **Keep your API key private** - Don't share it or commit it to Git
- **Internet required** - The AI needs to connect to Anthropic's servers

## File Overview

- `START_HERE.md` ← You are here
- `README.md` - Full documentation
- `QUICKSTART.md` - Condensed setup guide
- `TROUBLESHOOTING.md` - Problem solving guide
- `setup.sh` / `setup.bat` - Automated setup scripts
- `.env.example` - Template for your API key
- `package.json` - Project dependencies
- `src/` - Game source code

## Ready to Adventure?

```bash
npm start
```

**Have fun and may your rolls be high! 🎲⚔️**
