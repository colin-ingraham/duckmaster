
import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Settings, Sword, Wand2, Shield, Crosshair, Book, Heart, RefreshCw, Camera } from 'lucide-react';

export default function DMTable() {
  // Core state
  const [page, setPage] = useState('setup'); // 'setup', 'game'
  const [step, setStep] = useState(1); // 1=campaign, 2=players, 3=characters
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [numPlayers, setNumPlayers] = useState(0);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [activePlayer, setActivePlayer] = useState(1);
  const [pendingRoll, setPendingRoll] = useState(null); // {stat, dc, action, player}
  const [isWaitingForPhysicalRoll, setIsWaitingForPhysicalRoll] = useState(false); // <-- ADD THIS STATE
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const updateCharacterCurrency = (playerNum, gold = 0, silver = 0, copper = 0) => {
    setSelectedCharacters(prev => prev.map(char => {
      if (char.playerNum === playerNum) {
        return {
          ...char,
          currency: {
            gold: char.currency.gold + gold,
            silver: char.currency.silver + silver,
            copper: char.currency.copper + copper
          }
        };
      }
      return char;
    }));
  };

  const cyclePlayer = () => {
    const nextPlayer = activePlayer >= selectedCharacters.length ? 1 : activePlayer + 1;
    setActivePlayer(nextPlayer);
  };

  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacterCard, setShowCharacterCard] = useState(false);
  const [selectedCharacterCard, setSelectedCharacterCard] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('campaigns');
  
  
  // Data
  const [campaigns, setCampaigns] = useState([]);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const campaignTemplates = [
    { id: 'tavern', name: 'The Tavern Mystery', starter: "You awaken in a dimly lit tavern, the smell of ale and smoke thick in the air. A hooded figure in the corner watches you intently." },
    { id: 'dragon', name: 'Dragon\'s Peak', starter: "You stand at the base of Dragon's Peak. Ancient legends speak of treasure hidden in the frozen summit. Your breath forms clouds in the frigid air." },
    { id: 'temple', name: 'Lost Temple', starter: "Deep in the jungle, you discover the Lost Temple of Zephyr. Vines cover crumbling stone walls. Strange markings glow faintly on the entrance." }
  ];

  const characterOptions = [
    { id: 1, name: 'Bran', race: 'Mountain Dwarf', class: 'Fighter', icon: Sword, hp: 13, ac: 18, str: 3, dex: 1, con: 3, int: 0, wis: 1, cha: -1, currency: { gold: 10, silver: 5, copper: 20 }, magicalItems: ['Health Potion'], backpack: ['Battleaxe', 'Shield', 'Rope'] },
    { id: 2, name: 'Lyra', race: 'High Elf', class: 'Wizard', icon: Wand2, hp: 7, ac: 12, str: -1, dex: 2, con: 1, int: 3, wis: 1, cha: 0, currency: { gold: 15, silver: 8, copper: 10 }, magicalItems: ['Health Potion', 'Health Potion'], backpack: ['Staff', 'Spellbook', 'Ink & Quill'] },
    { id: 3, name: 'Pip', race: 'Lightfoot Halfling', class: 'Rogue', icon: Crosshair, hp: 9, ac: 15, str: 0, dex: 3, con: 1, int: 1, wis: 2, cha: 1, currency: { gold: 20, silver: 15, copper: 25 }, magicalItems: ['Health Potion'], backpack: ['Shortsword', 'Lockpicks', 'Thieves Tools'] },
    { id: 4, name: 'Mara', race: 'Human', class: 'Cleric', icon: Heart, hp: 10, ac: 16, str: 2, dex: 0, con: 2, int: 0, wis: 3, cha: 1, currency: { gold: 8, silver: 12, copper: 18 }, magicalItems: ['Health Potion', 'Health Potion'], backpack: ['Mace', 'Shield', 'Holy Symbol'] },
    { id: 5, name: 'Grok', race: 'Half-Orc', class: 'Barbarian', icon: Shield, hp: 14, ac: 14, str: 3, dex: 2, con: 3, int: -1, wis: 0, cha: 0, currency: { gold: 5, silver: 10, copper: 30 }, magicalItems: ['Health Potion'], backpack: ['Greataxe', 'Javelins', 'Tribal Totem'] },
    { id: 6, name: 'Finn', race: 'Wood Elf', class: 'Ranger', icon: Book, hp: 11, ac: 15, str: 1, dex: 3, con: 1, int: 0, wis: 2, cha: 1, currency: { gold: 14, silver: 7, copper: 22 }, magicalItems: ['Health Potion'], backpack: ['Longbow', 'Arrows', 'Rope', 'Rations'] }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleCampaignSelect = (templateId) => {
    const template = campaignTemplates.find(t => t.id === templateId);
    setSelectedCampaign(template);
    setStep(2);
  };

  const handlePlayerCountSelect = (count) => {
    setNumPlayers(count);
    setStep(3);
  };

  const handleCharacterToggle = (character) => {
    if (selectedCharacters.find(c => c.id === character.id)) {
      setSelectedCharacters(selectedCharacters.filter(c => c.id !== character.id));
    } else if (selectedCharacters.length < numPlayers) {
      setSelectedCharacters([...selectedCharacters, { ...character, playerNum: selectedCharacters.length + 1 }]);
    }
  };

  const startGame = () => {
    const newCampaign = {
      id: Date.now(),
      name: selectedCampaign.name,
      starter: selectedCampaign.starter,
      active: true
    };
    setCampaigns([...campaigns.map(c => ({ ...c, active: false })), newCampaign]);
    
    const characterNames = selectedCharacters.map(c => c.name).join(', ');
    setMessages([
      `Campaign: ${selectedCampaign.name}`,
      `Your party: ${characterNames}`,
      selectedCampaign.starter
    ]);
    setPage('game');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    const currentPlayer = selectedCharacters.find(c => c.playerNum === activePlayer);
    const playerLabel = currentPlayer ? `Player ${activePlayer} (${currentPlayer.name})` : `Player ${activePlayer}`;
    
    setInput('');
    setMessages(prev => [...prev, `${playerLabel} said: "${userMessage}"`]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const partyContext = selectedCharacters.map(c => `${c.name} (${c.class}, Player ${c.playerNum})`).join(', ');
      const stats = currentPlayer ? `STR:${currentPlayer.str} DEX:${currentPlayer.dex} CON:${currentPlayer.con} INT:${currentPlayer.int} WIS:${currentPlayer.wis} CHA:${currentPlayer.cha}` : '';
      
// 1. Prepare the messages array for the backend
      const messagesForBackend = [{
        role: "user",
        // Keep your existing prompt construction logic here
        content: `You are a D&D Dungeon Master. Stay in character. CRITICAL: Keep responses UNDER 500 characters total.

PARTY: ${partyContext}
CAMPAIGN: ${selectedCampaign.name}
CURRENT PLAYER: ${currentPlayer ? currentPlayer.name : `Player ${activePlayer}`} (${stats})

CONTEXT:
${messages.slice(-3).join('\n')}

ROLLING SYSTEM:
When action needs a roll, ask: "Roll a [stat] check (DC [number])."
- DC 5: Trivial
- DC 10: Easy
- DC 15: Moderate
- DC 20: Hard
- DC 25: Very Hard
- DC 30+: Impossible (explain why it won't work)

WRITING STYLE:
- NO markdown formatting (no **, __, etc.)
- Simple, clear prose
- Direct and concise
- IDEAL: Under 250 characters
- MAX: 500 characters
- Optimize for readability
- When addressing specific players or asking for rolls, USE THEIR CHARACTER NAME
- Example: "Thorin, roll a Strength check" not "Roll a Strength check"

After your response, provide 2-3 suggested actions in this EXACT format on new lines:
[SUGGEST]Action text here[/SUGGEST]
[SUGGEST]Another action option[/SUGGEST]
[SUGGEST]Third option[/SUGGEST]

Keep suggestions short (under 50 characters). These will become clickable buttons for the player.

VOICE ACTING HINTS (for text-to-speech):
When writing dialogue or narration, include context hints:
- For children/young characters: mention "child" or "young voice"
- For villains/monsters: mention "villain", "monster", "demon", "dragon"
- For women: mention "woman", "lady", "she says"
- For men: mention "man", "he says", "mysterious figure"
- For accented characters: mention "accent" or "foreign"
This helps the TTS system choose appropriate voices.

INVENTORY SYSTEM:
Player has currency (gold, silver, copper), magical items (health potions), and backpack items (weapons, tools, food).
When player finds/buys/uses items, mention it naturally in narration. System will track automatically.

CURRENCY RULES (IMPORTANT):
- Standard rewards: 1-2 silver, 1-5 copper
- Gold is RARE: Max 3 gold pieces per reward
- Conversion: 1 gold = 2 silver, 1 silver = 5 copper
- When giving currency, FORMAT EXACTLY: "[+2 silver]" or "[+1 gold, +3 copper]" or "[+15 copper]"
- Examples: "You find a pouch. [+2 silver, +8 copper]" or "He pays you. [+1 gold]"
- System auto-tracks when you use this format

If action doesn't need roll, respond normally with narrative.

${currentPlayer ? currentPlayer.name : `Player ${activePlayer}`}: "${userMessage}"

DM Response (plain text, under 500 chars):`
      }];

      // 2. Call your backend server instead of Anthropic directly
      const response = await fetch("http://localhost:3001/api/chat", { // <-- CHANGED URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // REMOVED 'x-api-key' and 'anthropic-version' headers
        },
        // 3. Send the body structure the backend expects
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", // Or your desired model
          max_tokens: 500,                  // Or your desired max tokens
          stream: true,                     // Keep streaming enabled
          messages: messagesForBackend      // Pass the messages array
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text || '';
                fullText += text;
                setStreamingMessage(fullText);
              }
            } catch (e) {}
          }
        }
      }

      // Check if DM is asking for a roll
      const rollMatch = fullText.match(/Roll (?:a|an) (\w+) check \(DC (\d+)\)/i);
      if (rollMatch) {
        const stat = rollMatch[1].toLowerCase();
        const dc = parseInt(rollMatch[2]);
        setPendingRoll({ stat, dc, action: userMessage, player: currentPlayer });
      } else {
        setPendingRoll(null); // Good practice to clear if no roll is needed
      }

      // Extract suggestions
      const suggestMatches = fullText.match(/\[SUGGEST\](.*?)\[\/SUGGEST\]/g);
      if (suggestMatches) {
        const extractedSuggestions = suggestMatches.map(match => 
          match.replace(/\[SUGGEST\]|\[\/SUGGEST\]/g, '').trim()
        );
        setSuggestions(extractedSuggestions);
        // Remove suggestions from displayed text
        fullText = fullText.replace(/\[SUGGEST\].*?\[\/SUGGEST\]/g, '').trim();
      } else {
        setSuggestions([]);
      }

      // Check for currency rewards and update inventory
      const currencyMatch = fullText.match(/\[([+\-])(\d+)\s*(gold|silver|copper)(?:,?\s*([+\-])(\d+)\s*(gold|silver|copper))*\]/gi);
      if (currencyMatch && currentPlayer) {
        let goldChange = 0, silverChange = 0, copperChange = 0;
        let receivedItems = [];
        
        // Parse all currency mentions in brackets
        const fullMatch = fullText.match(/\[(.*?)\]/g);
        if (fullMatch) {
          fullMatch.forEach(bracket => {
            const content = bracket.slice(1, -1); // Remove [ and ]
            const parts = content.split(',');
            
            parts.forEach(part => {
              const match = part.trim().match(/([+\-])(\d+)\s*(gold|silver|copper)/i);
              if (match) {
                const [, sign, amount, type] = match;
                const value = parseInt(amount) * (sign === '+' ? 1 : -1);
                
                if (type.toLowerCase() === 'gold') {
                  goldChange += value;
                  if (value > 0) receivedItems.push(`${value} GP`);
                }
                if (type.toLowerCase() === 'silver') {
                  silverChange += value;
                  if (value > 0) receivedItems.push(`${value} SP`);
                }
                if (type.toLowerCase() === 'copper') {
                  copperChange += value;
                  if (value > 0) receivedItems.push(`${value} CP`);
                }
              }
            });
          });
        }
        
        if (receivedItems.length > 0) {
          updateCharacterCurrency(activePlayer, goldChange, silverChange, copperChange);
          const systemMessage = `💰 ${currentPlayer.name} received: ${receivedItems.join(', ')}`;
          setMessages(prev => [...prev, `Dungeon Master: ${fullText}`, systemMessage]);
          setStreamingMessage('');
          setIsLoading(false);
          return;
        } else {
          updateCharacterCurrency(activePlayer, goldChange, silverChange, copperChange);
        }
      }

      setMessages(prev => [...prev, `Dungeon Master: ${fullText}`]);
      setStreamingMessage('');
    } catch (error) {
      setMessages(prev => [...prev, "Dungeon Master: *The mystical connection wavers...*"]);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };
const triggerPhysicalRoll = async () => { // Make function async
    if (!pendingRoll || isLoading) return;

    setIsWaitingForPhysicalRoll(true);
    setMessages(prev => [...prev, `⏳ Requesting physical dice roll for ${pendingRoll.stat.toUpperCase()} check (DC ${pendingRoll.dc})...`]);
    setIsLoading(true);

    // --- NEW: Call the main server to trigger the Pi ---
    try {
      console.log("Sending request to server to trigger physical roll...");
      const triggerResponse = await fetch("http://localhost:3001/api/request-physical-roll", {
        method: 'POST',
      });

      if (!triggerResponse.ok) {
         // Handle error if server couldn't trigger Pi
         const errorData = await triggerResponse.json();
         console.error("Failed to trigger physical roll:", errorData.error);
         setMessages(prev => [...prev.filter(msg => !msg.startsWith('⏳')), `⚠️ Error: ${errorData.error || 'Could not start physical roll.'}`]);
         setIsLoading(false);
         setIsWaitingForPhysicalRoll(false);
         return; // Stop here if trigger failed
      }
      console.log("Server acknowledged trigger request.");
      // Update message slightly
      setMessages(prev => prev.map(msg => msg.startsWith('⏳ Requesting') ? '⏳ Physical roll triggered. Waiting for result...' : msg));

    } catch (error) {
      console.error("Network error triggering physical roll:", error);
      setMessages(prev => [...prev.filter(msg => !msg.startsWith('⏳')), `⚠️ Network Error: Could not request physical roll.`]);
      setIsLoading(false);
      setIsWaitingForPhysicalRoll(false);
      return; // Stop here
    }
    // Clear any previous polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Start Polling (This part remains the same as before)
    pollIntervalRef.current = setInterval(async () => {
      try {
        console.log("Polling /api/get-last-roll...");
        const response = await fetch("http://localhost:3001/api/get-last-roll");
        // ... (rest of polling logic: check response, handle result or continue polling) ...
        if (!response.ok) {
           console.error("Polling error:", response.status); return;
        }
        const data = await response.json();
        if (data.diceValue !== null) {
          console.log("Received dice value:", data.diceValue);
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setIsLoading(false);
          // Make sure the "Waiting..." message is removed correctly before processing
          setMessages(prev => prev.filter(msg => !msg.startsWith('⏳')));
          handlePhysicalRollResult(data.diceValue); // Process the received value
        } else {
           console.log("No dice value available yet...");
        }
      } catch (error) {
        console.error("Error during polling:", error);
        // Maybe stop polling on error
      }
    }, 2000);

    // Polling Timeout (This part also remains the same)
    setTimeout(() => {
        if (pollIntervalRef.current) {
            console.log("Polling timed out.");
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoading(false);
            setIsWaitingForPhysicalRoll(false);
             // Update message to show timeout
            setMessages(prev => [...prev.filter(msg => !msg.startsWith('⏳')), "Physical roll timed out. Please try again or use digital roll."]);
        }
    }, 30000); // 30-second timeout
  };

  const handlePhysicalRollResult = (rollValue) => {
    if (!pendingRoll) return; // Should not happen if called correctly, but good check

    const { dc, action, player, stat } = pendingRoll; // Get all needed details
    const playerLabel = player ? `Player ${player.playerNum} (${player.name})` : `Player ${activePlayer}`;

    // Construct a message showing the physical result
    const rollMessage = `🎲 Physical die result for ${playerLabel} (${stat.toUpperCase()} Check): ${rollValue}`;

    // Update messages, clear waiting state, clear the pending roll request
    setMessages(prev => [...prev.filter(msg => !msg.startsWith('⏳ Waiting for physical dice')), rollMessage]); // Remove waiting msg, add result
    setIsWaitingForPhysicalRoll(false);
    setPendingRoll(null);

    // IMPORTANT: Send the raw physical roll value to resolveRoll.
    // The AI will narrate the outcome based on this raw value vs the DC.
    resolveRoll(rollValue, dc, action, player);
  };

  const executeRoll = () => {
    if (!pendingRoll) return;

    const { stat, dc, action, player } = pendingRoll;
    const d20 = Math.floor(Math.random() * 20) + 1;

    // Get the modifier based on stat name
    const statMap = {
      'strength': 'str',
      'dexterity': 'dex',
      'constitution': 'con',
      'intelligence': 'int',
      'wisdom': 'wis',
      'charisma': 'cha'
    };

    const statKey = statMap[stat] || 'str'; // Default to str if stat name is weird
    const modifier = player ? player[statKey] : 0;
    const total = d20 + modifier;

    const playerLabel = player ? `Player ${player.playerNum} (${player.name})` : `Player ${activePlayer}`;
    const rollMessage = `🎲 ${playerLabel} rolled ${d20} + ${modifier} = ${total} for ${stat.toUpperCase()}`;

    setMessages(prev => [...prev, rollMessage]);
    setPendingRoll(null); // Clear the pending roll state AFTER getting details
    setIsWaitingForPhysicalRoll(false); // Ensure waiting state is also reset

    // Now get DM's response to the calculated roll total
    resolveRoll(total, dc, action, player);
  };
  const resolveRoll = async (total, dc, action, player) => {
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const partyContext = selectedCharacters.map(c => `${c.name} (${c.class}, Player ${c.playerNum})`).join(', ');
      
      const messagesForBackend = [{
        role: "user",
        // Keep your existing roll resolution prompt logic here
        content: `You are a D&D Dungeon Master. Player rolled ${total} against DC ${dc} for action: "${action}".

CONTEXT:
${messages.slice(-5).join('\n')}

Narrate outcome in plain text (under 500 chars):
- Natural 1: Critical fail with consequences
- Beat DC by 10+: Critical success
- Beat DC by 5+: Good success
- Beat DC: Success
- Miss by 1-4: Minor failure
- Miss by 5+: Failure

WRITING STYLE:
- NO markdown formatting (no **, __, etc.)
- Simple, direct prose
- Under 500 characters
- Easy to read

${player ? player.name : `Player ${activePlayer}`}'s result:`
      }];

      // 2. Call your backend server
      const response = await fetch("http://localhost:3001/api/chat", { // <-- CHANGED URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // REMOVED 'x-api-key' and 'anthropic-version' headers
        },
        // 3. Send the body structure the backend expects
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", // Or your desired model
          max_tokens: 500,                  // Or your desired max tokens
          stream: true,                     // Keep streaming enabled
          messages: messagesForBackend      // Pass the messages array
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text || '';
                fullText += text;
                setStreamingMessage(fullText);
              }
            } catch (e) {}
          }
        }
      }

      setMessages(prev => [...prev, `Dungeon Master: ${fullText}`]);
      setStreamingMessage('');
    } catch (error) {
      setMessages(prev => [...prev, "Dungeon Master: *The mystical connection wavers...*"]);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Page
  if (page === 'setup') {
    return (
      <div className="w-full h-screen flex items-center justify-center"
           style={{
             background: 'linear-gradient(to bottom, #f4e4c1, #e8d4a0)',
             backgroundImage: `repeating-linear-gradient(0deg, rgba(139, 101, 63, 0.03) 0px, transparent 1px, transparent 2px, rgba(139, 101, 63, 0.03) 3px), linear-gradient(to bottom, #f4e4c1, #e8d4a0)`
           }}>
        <div className="max-w-4xl w-full p-8">
          
          {step === 1 && (
            <div className="text-center space-y-6">
              <h1 className="text-5xl font-bold mb-8" style={{ fontFamily: '"Cinzel", serif', color: '#1a1a1a' }}>
                Choose Your Campaign
              </h1>
              <div className="space-y-4">
                {campaignTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleCampaignSelect(template.id)}
                    className="w-full text-left px-8 py-6 rounded-lg transition-all hover:scale-105"
                    style={{ background: '#ffffff', border: '3px solid #8b6f47' }}>
                    <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: '"Cinzel", serif', color: '#1a1a1a' }}>
                      {template.name}
                    </h2>
                    <p className="text-sm opacity-75" style={{ fontFamily: '"Cinzel", serif' }}>
                      {template.starter}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-8">
              <h2 className="text-4xl font-bold" style={{ fontFamily: '"Cinzel", serif', color: '#1a1a1a' }}>
                How many players?
              </h2>
              <div className="flex gap-4 justify-center flex-wrap">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => handlePlayerCountSelect(num)}
                    className="w-20 h-20 text-3xl font-bold rounded-lg transition-all hover:scale-110"
                    style={{ background: '#8b6f47', color: '#f4e4c1', border: '3px solid #6b5537', fontFamily: '"Cinzel", serif' }}>
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold text-center mb-6" style={{ fontFamily: '"Cinzel", serif', color: '#1a1a1a' }}>
                Select {numPlayers} Character{numPlayers > 1 ? 's' : ''}
                <div className="text-lg mt-2 opacity-75">{selectedCharacters.length}/{numPlayers} selected</div>
              </h2>
              <div className="grid grid-cols-2 gap-6 mb-6">
                {characterOptions.map(character => {
                  const selected = selectedCharacters.find(c => c.id === character.id);
                  const Icon = character.icon;
                  return (
                    <button
                      key={character.id}
                      onClick={() => handleCharacterToggle(character)}
                      className="p-5 rounded-lg transition-all hover:scale-105 relative"
                      style={{
                        background: selected ? '#8b6f47' : '#ffffff',
                        border: '3px solid #8b6f47',
                        opacity: !selected && selectedCharacters.length >= numPlayers ? 0.5 : 1,
                        cursor: !selected && selectedCharacters.length >= numPlayers ? 'not-allowed' : 'pointer'
                      }}>
                      {selected && (
                        <div className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                             style={{ background: '#f4e4c1', fontFamily: '"Cinzel", serif', fontWeight: 'bold', fontSize: '14px' }}>
                          P{selected.playerNum}
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                             style={{ background: selected ? '#f4e4c1' : '#8b6f47' }}>
                          <Icon size={32} color={selected ? '#1a1a1a' : '#f4e4c1'} />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-xl font-bold" style={{ fontFamily: '"Cinzel", serif', color: selected ? '#f4e4c1' : '#1a1a1a' }}>
                            {character.name}
                          </h3>
                          <p className="text-sm mb-1" style={{ color: selected ? '#f4e4c1' : '#8b6f47', fontWeight: '600' }}>
                            {character.race} {character.class}
                          </p>
                          <div className="flex gap-3 text-sm font-bold mb-1" style={{ color: selected ? '#f4e4c1' : '#1a1a1a' }}>
                            <span>HP: {character.hp}</span>
                            <span>AC: {character.ac}</span>
                          </div>
                          <div className="text-xs" style={{ color: selected ? '#f4e4c1' : '#666' }}>
                            STR {character.str >= 0 ? '+' : ''}{character.str}, DEX {character.dex >= 0 ? '+' : ''}{character.dex}, CON {character.con >= 0 ? '+' : ''}{character.con}, INT {character.int >= 0 ? '+' : ''}{character.int}, WIS {character.wis >= 0 ? '+' : ''}{character.wis}, CHA {character.cha >= 0 ? '+' : ''}{character.cha}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedCharacters.length === numPlayers && (
                <div className="text-center">
                  <button
                    onClick={startGame}
                    className="px-12 py-4 text-2xl font-bold rounded-lg transition-all hover:scale-105"
                    style={{ background: '#8b6f47', color: '#f4e4c1', border: '3px solid #6b5537', fontFamily: '"Cinzel", serif' }}>
                    Begin Adventure
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap');`}</style>
      </div>
    );
  }

  // Game Page
  return (
    <div className="w-full h-screen flex relative overflow-hidden"
         style={{
           background: 'linear-gradient(to bottom, #f4e4c1, #e8d4a0)',
           backgroundImage: `repeating-linear-gradient(0deg, rgba(139, 101, 63, 0.03) 0px, transparent 1px, transparent 2px, rgba(139, 101, 63, 0.03) 3px), linear-gradient(to bottom, #f4e4c1, #e8d4a0)`
         }}>
      
      {/* Character Card Modal */}
      {showCharacterCard && selectedCharacterCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCharacterCard(false)}>
          <div className="bg-white rounded-lg p-8 max-w-md w-full" style={{ border: '4px solid #8b6f47' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold" style={{ fontFamily: '"Cinzel", serif', color: '#1a1a1a' }}>
                {selectedCharacterCard.name}
              </h2>
              <button onClick={() => setShowCharacterCard(false)}><X size={28} /></button>
            </div>
            
                          <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b-2" style={{ borderColor: '#8b6f47' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#8b6f47' }}>
                  {React.createElement(selectedCharacterCard.icon, { size: 32, color: '#f4e4c1' })}
                </div>
                <div>
                  <div className="text-xl font-bold" style={{ fontFamily: '"Cinzel", serif' }}>{selectedCharacterCard.name}</div>
                  <div className="text-sm opacity-75">{selectedCharacterCard.race} {selectedCharacterCard.class}</div>
                  <div className="text-xs opacity-60">Player {selectedCharacterCard.playerNum}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ background: '#f4e4c1' }}>
                  <div className="text-xs opacity-75">Health</div>
                  <div className="text-2xl font-bold">{selectedCharacterCard.hp}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: '#f4e4c1' }}>
                  <div className="text-xs opacity-75">Armor Class</div>
                  <div className="text-2xl font-bold">{selectedCharacterCard.ac}</div>
                </div>
              </div>

              <div className="pt-3 border-t-2" style={{ borderColor: '#8b6f47' }}>
                <h3 className="font-bold mb-3" style={{ fontFamily: '"Cinzel", serif' }}>Ability Modifiers</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded text-center" style={{ background: '#f4e4c1' }}>
                    <div className="text-xs opacity-75">STR</div>
                    <div className="text-xl font-bold">{selectedCharacterCard.str >= 0 ? '+' : ''}{selectedCharacterCard.str}</div>
                  </div>
                  <div className="p-2 rounded text-center" style={{ background: '#f4e4c1' }}>
                    <div className="text-xs opacity-75">DEX</div>
                    <div className="text-xl font-bold">{selectedCharacterCard.dex >= 0 ? '+' : ''}{selectedCharacterCard.dex}</div>
                  </div>
                  <div className="p-2 rounded text-center" style={{ background: '#f4e4c1' }}>
                    <div className="text-xs opacity-75">CON</div>
                    <div className="text-xl font-bold">{selectedCharacterCard.con >= 0 ? '+' : ''}{selectedCharacterCard.con}</div>
                  </div>
                  <div className="p-2 rounded text-center" style={{ background: '#f4e4c1' }}>
                    <div className="text-xs opacity-75">INT</div>
                    <div className="text-xl font-bold">{selectedCharacterCard.int >= 0 ? '+' : ''}{selectedCharacterCard.int}</div>
                  </div>
                  <div className="p-2 rounded text-center" style={{ background: '#f4e4c1' }}>
                    <div className="text-xs opacity-75">WIS</div>
                    <div className="text-xl font-bold">{selectedCharacterCard.wis >= 0 ? '+' : ''}{selectedCharacterCard.wis}</div>
                  </div>
                  <div className="p-2 rounded text-center" style={{ background: '#f4e4c1' }}>
                    <div className="text-xs opacity-75">CHA</div>
                    <div className="text-xl font-bold">{selectedCharacterCard.cha >= 0 ? '+' : ''}{selectedCharacterCard.cha}</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2" style={{ borderColor: '#8b6f47' }}>
                <h3 className="font-bold mb-3" style={{ fontFamily: '"Cinzel", serif' }}>Currency</h3>
                <div className="flex gap-4 justify-between">
                  <div className="text-center">
                    <div className="text-2xl font-bold">🪙</div>
                    <div className="text-xs opacity-75">Gold</div>
                    <div className="font-bold">{selectedCharacterCard.currency.gold}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">⚪</div>
                    <div className="text-xs opacity-75">Silver</div>
                    <div className="font-bold">{selectedCharacterCard.currency.silver}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">🟤</div>
                    <div className="text-xs opacity-75">Copper</div>
                    <div className="font-bold">{selectedCharacterCard.currency.copper}</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2" style={{ borderColor: '#8b6f47' }}>
                <h3 className="font-bold mb-2" style={{ fontFamily: '"Cinzel", serif' }}>Magical Items</h3>
                <div className="space-y-1">
                  {selectedCharacterCard.magicalItems.map((item, idx) => (
                    <div key={idx} className="p-2 rounded text-sm" style={{ background: '#f4e4c1' }}>
                      🧪 {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t-2" style={{ borderColor: '#8b6f47' }}>
                <h3 className="font-bold mb-2" style={{ fontFamily: '"Cinzel", serif' }}>Backpack</h3>
                <div className="space-y-1">
                  {selectedCharacterCard.backpack.map((item, idx) => (
                    <div key={idx} className="p-2 rounded text-sm" style={{ background: '#f4e4c1' }}>
                      🎒 {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-lg p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto" style={{ border: '4px solid #8b6f47' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold" style={{ fontFamily: '"Cinzel", serif', color: '#1a1a1a' }}>Settings</h2>
              <button onClick={() => setShowSettings(false)}><X size={28} /></button>
            </div>
            
            <div className="space-y-6">
              {/* API Info */}
              <div className="p-4 rounded-lg" style={{ background: '#f4e4c1' }}>
                <h3 className="font-bold text-lg mb-2" style={{ fontFamily: '"Cinzel", serif' }}>API Configuration</h3>
                <div className="text-sm space-y-1 opacity-75">
                  <div>✓ Claude Haiku 4: Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="h-full transition-all duration-300"
           style={{ width: showSidebar ? '280px' : '0px', background: '#ffffff', borderRight: showSidebar ? '3px solid #8b6f47' : 'none', overflow: 'hidden' }}>
        <div className="h-full flex flex-col">
          <div className="p-4 flex justify-end" style={{ borderBottom: '2px solid #8b6f47', background: '#f4e4c1' }}>
            <button onClick={() => setShowSidebar(false)}><X size={24} /></button>
          </div>
          
          <div className="flex" style={{ borderBottom: '2px solid #8b6f47' }}>
            <button onClick={() => setSidebarTab('campaigns')} className="flex-1 py-3"
                    style={{ background: sidebarTab === 'campaigns' ? '#f4e4c1' : 'transparent', fontFamily: '"Cinzel", serif', fontWeight: sidebarTab === 'campaigns' ? 'bold' : 'normal', borderRight: '1px solid #8b6f47' }}>
              Campaigns
            </button>
            <button onClick={() => setSidebarTab('party')} className="flex-1 py-3"
                    style={{ background: sidebarTab === 'party' ? '#f4e4c1' : 'transparent', fontFamily: '"Cinzel", serif', fontWeight: sidebarTab === 'party' ? 'bold' : 'normal' }}>
              Party
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === 'campaigns' && (
              <div>
                {campaigns.length > 0 ? campaigns.map(campaign => (
                  <div key={campaign.id} className="px-4 py-3 rounded mb-2"
                       style={{ background: campaign.active ? '#8b6f47' : '#f4e4c1', color: campaign.active ? '#f4e4c1' : '#1a1a1a', fontFamily: '"Cinzel", serif' }}>
                    {campaign.name} {campaign.active && '✦'}
                  </div>
                )) : <p className="text-sm opacity-60 text-center mt-8" style={{ fontFamily: '"Cinzel", serif' }}>No campaigns yet</p>}
              </div>
            )}
            {sidebarTab === 'party' && (
              <div>
                {selectedCharacters.map(character => {
                  const Icon = character.icon;
                  return (
                    <button
                      key={character.id}
                      onClick={() => {
                        setSelectedCharacterCard(character);
                        setShowCharacterCard(true);
                      }}
                      className="w-full mb-4 p-3 rounded-lg transition-all hover:scale-105"
                      style={{ background: '#f4e4c1', border: '2px solid #8b6f47', cursor: 'pointer' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#8b6f47' }}>
                          <Icon size={20} color="#f4e4c1" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-sm" style={{ fontFamily: '"Cinzel", serif' }}>Player {character.playerNum}</div>
                          <div className="text-xs">{character.name}</div>
                        </div>
                      </div>
                      <div className="text-xs flex gap-3">
                        <span>HP: {character.hp}</span>
                        <span>AC: {character.ac}</span>
                        <span className="font-semibold">{character.class}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t-2" style={{ borderColor: '#8b6f47' }}>
            <button onClick={() => { setPage('setup'); setStep(1); setShowSidebar(false); }}
                    className="w-full px-4 py-3 rounded-lg font-bold"
                    style={{ background: '#8b6f47', color: '#f4e4c1', border: '2px solid #6b5537', fontFamily: '"Cinzel", serif' }}>
              + New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!showSidebar && (
          <button onClick={() => setShowSidebar(true)} className="absolute top-6 left-6 z-40 p-3 rounded-lg"
                  style={{ background: '#8b6f47', border: '2px solid #6b5537' }}>
            <Menu size={28} color="#f4e4c1" />
          </button>
        )}
        
        <button onClick={() => setShowSettings(true)} className="absolute top-6 right-6 z-40 p-3 rounded-lg"
                style={{ background: '#8b6f47', border: '2px solid #6b5537' }}>
          <Settings size={28} color="#f4e4c1" />
        </button>

        <div className="flex-1 overflow-y-auto p-16 pt-24">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, idx) => {
              const isPlayer = msg.includes('Player') && msg.includes('said:');
              const isRoll = msg.startsWith('🎲');
              const isSystem = msg.startsWith('💰');
              
              return (
                <div key={idx} className={`flex ${isPlayer || isRoll || isSystem ? 'justify-end' : 'justify-start'}`}>
                  <p className="text-xl leading-relaxed max-w-2xl"
                     style={{ 
                       color: '#1a1a1a', 
                       fontFamily: '"Cinzel", serif', 
                       fontWeight: isRoll || isSystem ? '700' : (isPlayer ? '500' : '600'), 
                       fontStyle: isPlayer ? 'italic' : 'normal', 
                       textAlign: isPlayer || isRoll || isSystem ? 'right' : 'left',
                       background: isRoll || isSystem ? '#f4e4c1' : 'transparent',
                       padding: isRoll || isSystem ? '8px 12px' : '0',
                       borderRadius: isRoll || isSystem ? '8px' : '0',
                       border: isRoll || isSystem ? '2px solid #8b6f47' : 'none'
                     }}>
                    {msg}
                  </p>
                </div>
              );
            })}
            {streamingMessage && (
              <div className="flex justify-start">
                <p className="text-xl leading-relaxed max-w-2xl"
                   style={{ color: '#1a1a1a', fontFamily: '"Cinzel", serif', fontWeight: '600', textAlign: 'left' }}>
                  Dungeon Master: {streamingMessage}<span className="animate-pulse">|</span>
                </p>
              </div>
            )}
            
            {pendingRoll && !isWaitingForPhysicalRoll && (
      <div className="flex justify-center items-center gap-4 mt-4"> {/* Container for both buttons */}

        {/* Original Digital Roll Button */}
        <button
          onClick={executeRoll} // Calls the restored function
          className="px-8 py-4 text-xl font-bold rounded-lg transition-all hover:scale-110"
          style={{ background: '#8b6f47', color: '#f4e4c1', border: '3px solid #6b5537', fontFamily: '"Cinzel", serif' }}>
          🎲 Roll {pendingRoll.stat.toUpperCase()} Check (Digital)
        </button>

        {/* Physical Roll Trigger Button */}
        <button
          onClick={triggerPhysicalRoll}
          className="px-8 py-4 text-xl font-bold rounded-lg transition-all hover:scale-110 flex items-center gap-2"
          style={{ background: '#4a90e2', color: '#ffffff', border: '3px solid #357ABD', fontFamily: '"Cinzel", serif' }}
        >
          <Camera size={24} />
          Use Physical Dice
        </button>

      </div>
    )}

            {isWaitingForPhysicalRoll && (
                <div className="text-center mt-4 text-lg font-semibold italic" style={{ fontFamily: '"Cinzel", serif', color: '#6b5537' }}>
                    Waiting for physical dice input...
                </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-8 border-t-4" style={{ borderColor: '#8b6f47', background: 'rgba(139, 101, 63, 0.1)' }}>
          <div className="max-w-4xl mx-auto">
            {selectedCharacters.length > 0 && (
              <div className="flex gap-3 mb-4 items-center">
                {/* Cycle Button */}
                <button
                  onClick={cyclePlayer}
                  className="p-3 rounded-lg transition-all hover:scale-110 flex-shrink-0"
                  style={{ background: '#8b6f47', color: '#f4e4c1', border: '2px solid #6b5537', cursor: 'pointer' }}>
                  <RefreshCw size={24} />
                </button>
                
                {/* All Players Display */}
                <div className="flex gap-2 flex-1 justify-center flex-wrap">
                  {selectedCharacters.map(character => {
                    const Icon = character.icon;
                    const isActive = character.playerNum === activePlayer;
                    return (
                      <div
                        key={character.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg"
                        style={{ 
                          background: isActive ? '#8b6f47' : '#f4e4c1', 
                          color: isActive ? '#f4e4c1' : '#1a1a1a', 
                          border: `2px solid ${isActive ? '#6b5537' : '#8b6f47'}`,
                          opacity: isActive ? 1 : 0.6
                        }}>
                        <Icon size={20} color={isActive ? '#f4e4c1' : '#1a1a1a'} />
                        <span className="font-bold" style={{ fontFamily: '"Cinzel", serif' }}>
                          {character.name} ({character.playerNum})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                     onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                     placeholder="What do you do?" disabled={isLoading}
                     className="flex-1 px-6 py-4 text-xl rounded-lg"
                     style={{ background: '#ffffff', border: '2px solid #8b6f47', color: '#1a1a1a', fontFamily: '"Cinzel", serif', outline: 'none' }} />
              <button onClick={handleSend} disabled={!input.trim() || isLoading}
                      className="px-8 py-4 text-xl font-semibold rounded-lg"
                      style={{ background: isLoading || !input.trim() ? '#999' : '#8b6f47', color: '#f4e4c1', fontFamily: '"Cinzel", serif', border: '2px solid #6b5537' }}>
                {isLoading ? 'Waiting...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

