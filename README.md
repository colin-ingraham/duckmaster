# DM Table - AI-Powered D&D Game

An interactive Dungeons & Dragons digital tabletop experience powered by Claude AI as your Dungeon Master.

## Features

- 🎲 **AI Dungeon Master** - Claude AI generates dynamic stories and manages gameplay
- ⚔️ **Pre-made Characters** - Choose from 6 unique characters (Fighter, Wizard, Rogue, Cleric, Barbarian, Ranger)
- 🗺️ **Campaign Templates** - Start with The Tavern Mystery, Dragon's Peak, or Lost Temple
- 🎯 **D20 Dice System** - Roll for ability checks with automatic modifiers
- 💰 **Inventory Management** - Track gold, items, and equipment
- 💾 **Save Campaigns** - Continue your adventures across sessions
- 👥 **Multiplayer Support** - Play with 1-6 players locally

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- An Anthropic API key ([Get one here](https://console.anthropic.com/))

## Installation

1. **Clone or download this project**

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This installs both frontend (React) and backend (Express) dependencies.

3. **Set up your API key:**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Anthropic API key:
   ```
   REACT_APP_ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

4. **Start both servers:**
   ```bash
   npm start
   ```
   
   This will automatically start:
   - Backend API server on `http://localhost:3001`
   - Frontend React app on `http://localhost:3000`

5. **Open your browser:**
   
   The app will automatically open at `http://localhost:3000`

**Note:** The game now uses a local backend server to avoid CORS issues. Both frontend and backend must be running.

## How to Play

1. **Choose a Campaign** - Select from three starter adventures
2. **Select Players** - Choose 1-6 players
3. **Pick Characters** - Each player selects a pre-made character
4. **Start Adventure** - The AI Dungeon Master will guide your journey!

### During Gameplay

- **Type your actions** in the input box at the bottom
- **Roll dice** when prompted by clicking the dice button
- **View character stats** by clicking on player cards in the sidebar
- **Cycle active player** using the refresh button
- **Save your progress** through the sidebar menu

## Characters

- **Bran** - Mountain Dwarf Fighter (Tank)
- **Lyra** - High Elf Wizard (Spellcaster)
- **Pip** - Lightfoot Halfling Rogue (Sneaky)
- **Mara** - Human Cleric (Healer)
- **Grok** - Half-Orc Barbarian (Damage)
- **Finn** - Wood Elf Ranger (Archer)

## Project Structure

```
dm-table-game/
├── server/
│   └── index.js           # Backend API proxy server
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── DMTable.jsx    # Main game component
│   ├── App.js             # App wrapper
│   ├── index.js           # Entry point
│   └── index.css          # Global styles
├── .env                   # Your API key (create this)
├── .env.example          # Template for .env
├── package.json          # Dependencies (frontend + backend)
└── README.md            # This file
```

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from create-react-app (irreversible)

## Important Notes

- **API Costs**: This app uses Claude AI which incurs API costs. Monitor your usage at [Anthropic Console](https://console.anthropic.com/)
- **Keep API Key Secret**: Never commit your `.env` file to version control
- **Internet Required**: The game needs an internet connection to communicate with the AI

## Troubleshooting

**App won't start:**
- Make sure you ran `npm install`
- Check that Node.js is installed: `node --version`

**API errors:**
- Verify your API key is correct in `.env`
- Check your Anthropic account has credits
- Ensure the `.env` file is in the root directory

**Blank screen:**
- Open browser console (F12) to check for errors
- Make sure the API key format is correct

## Credits

Built with:
- React
- Claude AI (Anthropic)
- Lucide Icons
- Create React App

## License

This project is open source and available for personal use.
