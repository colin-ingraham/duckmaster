import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Settings, Sword, Wand2, Shield, Crosshair, Book, Heart, Camera } from 'lucide-react';

export default function DMTable() {
  // Core state
  const [page, setPage] = useState('setup');
  const [step, setStep] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [numPlayers, setNumPlayers] = useState(0);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [activePlayer, setActivePlayer] = useState(1);
  const [pendingRoll, setPendingRoll] = useState(null);
  const [isWaitingForPhysicalRoll, setIsWaitingForPhysicalRoll] = useState(false);
  
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
      
      const messagesForBackend = [{
        role: "user",
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

      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          stream: true,
          messages: messagesForBackend
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

      const rollMatch = fullText.match(/Roll (?:a|an) (\w+) check \(DC (\d+)\)/i);
      if (rollMatch) {
        const stat = rollMatch[1].toLowerCase();
        const dc = parseInt(rollMatch[2]);
        setPendingRoll({ stat, dc, action: userMessage, player: currentPlayer });
      } else {
        setPendingRoll(null);
      }

      const suggestMatches = fullText.match(/\[SUGGEST\](.*?)\[\/SUGGEST\]/g);
      if (suggestMatches) {
        const extractedSuggestions = suggestMatches.map(match => 
          match.replace(/\[SUGGEST\]|\[\/SUGGEST\]/g, '').trim()
        );
        setSuggestions(extractedSuggestions);
        fullText = fullText.replace(/\[SUGGEST\].*?\[\/SUGGEST\]/g, '').trim();
      } else {
        setSuggestions([]);
      }

      const currencyMatch = fullText.match(/\[([+\-])(\d+)\s*(gold|silver|copper)(?:,?\s*([+\-])(\d+)\s*(gold|silver|copper))*\]/gi);
      if (currencyMatch && currentPlayer) {
        let goldChange = 0, silverChange = 0, copperChange = 0;
        let receivedItems = [];
        
        const fullMatch = fullText.match(/\[(.*?)\]/g);
        if (fullMatch) {
          fullMatch.forEach(bracket => {
            const content = bracket.slice(1, -1);
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
          const systemMessage = `${currentPlayer.name} received: ${receivedItems.join(', ')}`;
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

  const triggerPhysicalRoll = async () => {
    if (!pendingRoll || isLoading) return;

    setIsWaitingForPhysicalRoll(true);
    setMessages(prev => [...prev, `Requesting physical dice roll for ${pendingRoll.stat.toUpperCase()} check (DC ${pendingRoll.dc})...`]);
    setIsLoading(true);

    try {
      console.log("Sending request to server to trigger physical roll...");
      const triggerResponse = await fetch("http://localhost:3001/api/request-physical-roll", {
        method: 'POST',
      });

      if (!triggerResponse.ok) {
        const errorData = await triggerResponse.json();
        console.error("Failed to trigger physical roll:", errorData.error);
        setMessages(prev => [...prev.filter(msg => !msg.startsWith('⏳')), `Error: ${errorData.error || 'Could not start physical roll.'}`]);
        setIsLoading(false);
        setIsWaitingForPhysicalRoll(false);
        return;
      }
      console.log("Server acknowledged trigger request.");
      setMessages(prev => prev.map(msg => msg.startsWith('Requesting') ? 'Physical roll triggered. Waiting for result...' : msg));

    } catch (error) {
      console.error("Network error triggering physical roll:", error);
      setMessages(prev => [...prev.filter(msg => !msg.startsWith('⏳')), `Network Error: Could not request physical roll.`]);
      setIsLoading(false);
      setIsWaitingForPhysicalRoll(false);
      return;
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        console.log("Polling /api/get-last-roll...");
        const response = await fetch("http://localhost:3001/api/get-last-roll");
        if (!response.ok) {
          console.error("Polling error:", response.status);
          return;
        }
        const data = await response.json();
        if (data.diceValue !== null) {
          console.log("Received dice value:", data.diceValue);
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setIsLoading(false);
          setMessages(prev => prev.filter(msg => !msg.startsWith('⏳')));
          handlePhysicalRollResult(data.diceValue);
        } else {
          console.log("No dice value available yet...");
        }
      } catch (error) {
        console.error("Error during polling:", error);
      }
    }, 2000);

    setTimeout(() => {
      if (pollIntervalRef.current) {
        console.log("Polling timed out.");
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setIsLoading(false);
        setIsWaitingForPhysicalRoll(false);
        setMessages(prev => [...prev.filter(msg => !msg.startsWith('⏳')), "Physical roll timed out. Please try again or use digital roll."]);
      }
    }, 30000);
  };

  const handlePhysicalRollResult = (rollValue) => {
    if (!pendingRoll) return;

    const { dc, action, player, stat } = pendingRoll;
    const playerLabel = player ? `Player ${player.playerNum} (${player.name})` : `Player ${activePlayer}`;

    const rollMessage = `Physical die result for ${playerLabel} (${stat.toUpperCase()} Check): ${rollValue}`;

    setMessages(prev => [...prev.filter(msg => !msg.startsWith('Waiting for physical dice')), rollMessage]);
    setIsWaitingForPhysicalRoll(false);
    setPendingRoll(null);

    resolveRoll(rollValue, dc, action, player);
  };

  const executeRoll = () => {
    if (!pendingRoll) return;

    const { stat, dc, action, player } = pendingRoll;
    const d20 = Math.floor(Math.random() * 20) + 1;

    const statMap = {
      'strength': 'str',
      'dexterity': 'dex',
      'constitution': 'con',
      'intelligence': 'int',
      'wisdom': 'wis',
      'charisma': 'cha'
    };

    const statKey = statMap[stat] || 'str';
    const modifier = player ? player[statKey] : 0;
    const total = d20 + modifier;

    const playerLabel = player ? `Player ${player.playerNum} (${player.name})` : `Player ${activePlayer}`;
    const rollMessage = `${playerLabel} rolled ${d20} + ${modifier} = ${total} for ${stat.toUpperCase()}`;

    setMessages(prev => [...prev, rollMessage]);
    setPendingRoll(null);
    setIsWaitingForPhysicalRoll(false);

    resolveRoll(total, dc, action, player);
  };

  const resolveRoll = async (total, dc, action, player) => {
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const partyContext = selectedCharacters.map(c => `${c.name} (${c.class}, Player ${c.playerNum})`).join(', ');
      
      const messagesForBackend = [{
        role: "user",
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

      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          stream: true,
          messages: messagesForBackend
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
      <div className="parchment-container">
        <div className="max-w-4xl w-full p-8">
          
          {step === 1 && (
            <div className="text-center space-y-6 fade-in">
              <h1 className="title-text">
                Choose Your Campaign
              </h1>
              <div className="space-y-4">
                {campaignTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleCampaignSelect(template.id)}
                    className="campaign-card">
                    <h2 className="campaign-title">
                      {template.name}
                    </h2>
                    <p className="campaign-description">
                      {template.starter}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-8 fade-in">
              <h2 className="section-title">
                How many players?
              </h2>
              <div className="flex gap-4 justify-center flex-wrap">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => handlePlayerCountSelect(num)}
                    className="number-button">
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <h2 className="section-title text-center mb-6">
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
                      className={`character-card ${selected ? 'selected' : ''}`}
                      style={{
                        opacity: !selected && selectedCharacters.length >= numPlayers ? 0.5 : 1,
                        cursor: !selected && selectedCharacters.length >= numPlayers ? 'not-allowed' : 'pointer'
                      }}>
                      {selected && (
                        <div className="player-badge">
                          P{selected.playerNum}
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="character-icon">
                          <Icon size={32} color={selected ? '#1a1410' : '#f4e7d7'} />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="character-name">
                            {character.name}
                          </h3>
                          <p className="character-race">
                            {character.race} {character.class}
                          </p>
                          <div className="character-stats">
                            <span>HP: {character.hp}</span>
                            <span>AC: {character.ac}</span>
                          </div>
                          <div className="character-abilities">
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
                    className="begin-button">
                    Begin Adventure
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <style>{parchmentStyles}</style>
      </div>
    );
  }

  // Game Page
  return (
    <div className="game-container">
      
      {/* Left Campaign Sidebar */}
      <div className="campaign-sidebar">
        <div className="campaign-sidebar-content">
          {/* Logo */}
          <div className="logo-container">
            <img src="/static/logo.png" alt="Campaign Logo" className="campaign-logo" />
          </div>

          {/* Campaign Info */}
          <div className="campaign-info-section">
            <h3 className="campaign-info-title">Campaign</h3>
            <p className="campaign-info-text">{selectedCampaign?.name || "Active Campaign"}</p>
          </div>

          {/* Party Members */}
          <div className="campaign-info-section">
            <h3 className="campaign-info-title">Party Members</h3>
            <div className="party-members-list">
              {selectedCharacters.map(character => {
                const Icon = character.icon;
                return (
                  <button
                    key={character.id}
                    onClick={() => {
                      setSelectedCharacterCard(character);
                      setShowCharacterCard(true);
                    }}
                    className="party-member-item">
                    <div className="party-member-icon-small">
                      <Icon size={16} color="#f4e7d7" />
                    </div>
                    <div className="party-member-info">
                      <div className="party-member-name-small">{character.name}</div>
                      <div className="party-member-class-small">{character.class}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="campaign-info-section">
            <h3 className="campaign-info-title">Active Player</h3>
            {selectedCharacters.find(c => c.playerNum === activePlayer) && (
              <div className="active-player-display">
                <div className="active-player-name">
                  {selectedCharacters.find(c => c.playerNum === activePlayer).name}
                </div>
                <div className="active-player-hp">
                  HP: {selectedCharacters.find(c => c.playerNum === activePlayer).hp} | 
                  AC: {selectedCharacters.find(c => c.playerNum === activePlayer).ac}
                </div>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button 
            onClick={() => setShowSettings(true)} 
            className="sidebar-settings-button">
            <Settings size={20} color="#f4e7d7" />
            <span>Settings</span>
          </button>
        </div>
      </div>
      
      {/* Character Card Modal */}
      {showCharacterCard && selectedCharacterCard && (
        <div className="modal-overlay" onClick={() => setShowCharacterCard(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowCharacterCard(false)} className="modal-close-button">
              <X size={28} color="#3d2817" />
            </button>
            
            <h2 className="modal-title">
              {selectedCharacterCard.name}
            </h2>
            
            <div className="space-y-4">
              <div className="character-header">
                <div className="character-icon-large">
                  {React.createElement(selectedCharacterCard.icon, { size: 32, color: '#f4e7d7' })}
                </div>
                <div>
                  <div className="character-name-large">{selectedCharacterCard.name}</div>
                  <div className="character-info">{selectedCharacterCard.race} {selectedCharacterCard.class}</div>
                  <div className="player-number">Player {selectedCharacterCard.playerNum}</div>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-label">Health</div>
                  <div className="stat-value">{selectedCharacterCard.hp}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Armor Class</div>
                  <div className="stat-value">{selectedCharacterCard.ac}</div>
                </div>
              </div>

              <div className="section-divider">
                <h3 className="section-heading">Ability Modifiers</h3>
                <div className="abilities-grid">
                  <div className="ability-box">
                    <div className="ability-label">STR</div>
                    <div className="ability-value">{selectedCharacterCard.str >= 0 ? '+' : ''}{selectedCharacterCard.str}</div>
                  </div>
                  <div className="ability-box">
                    <div className="ability-label">DEX</div>
                    <div className="ability-value">{selectedCharacterCard.dex >= 0 ? '+' : ''}{selectedCharacterCard.dex}</div>
                  </div>
                  <div className="ability-box">
                    <div className="ability-label">CON</div>
                    <div className="ability-value">{selectedCharacterCard.con >= 0 ? '+' : ''}{selectedCharacterCard.con}</div>
                  </div>
                  <div className="ability-box">
                    <div className="ability-label">INT</div>
                    <div className="ability-value">{selectedCharacterCard.int >= 0 ? '+' : ''}{selectedCharacterCard.int}</div>
                  </div>
                  <div className="ability-box">
                    <div className="ability-label">WIS</div>
                    <div className="ability-value">{selectedCharacterCard.wis >= 0 ? '+' : ''}{selectedCharacterCard.wis}</div>
                  </div>
                  <div className="ability-box">
                    <div className="ability-label">CHA</div>
                    <div className="ability-value">{selectedCharacterCard.cha >= 0 ? '+' : ''}{selectedCharacterCard.cha}</div>
                  </div>
                </div>
              </div>

              <div className="section-divider">
                <h3 className="section-heading">Currency</h3>
                <div className="currency-display">
                  <div className="currency-item">
                    <div className="currency-icon">GP</div>
                    <div className="currency-label">Gold</div>
                    <div className="currency-amount">{selectedCharacterCard.currency.gold}</div>
                  </div>
                  <div className="currency-item">
                    <div className="currency-icon">SP</div>
                    <div className="currency-label">Silver</div>
                    <div className="currency-amount">{selectedCharacterCard.currency.silver}</div>
                  </div>
                  <div className="currency-item">
                    <div className="currency-icon">CP</div>
                    <div className="currency-label">Copper</div>
                    <div className="currency-amount">{selectedCharacterCard.currency.copper}</div>
                  </div>
                </div>
              </div>

              <div className="section-divider">
                <h3 className="section-heading">Magical Items</h3>
                <div className="space-y-1">
                  {selectedCharacterCard.magicalItems.map((item, idx) => (
                    <div key={idx} className="item-entry">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-divider">
                <h3 className="section-heading">Backpack</h3>
                <div className="space-y-1">
                  {selectedCharacterCard.backpack.map((item, idx) => (
                    <div key={idx} className="item-entry">
                      {item}
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
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowSettings(false)} className="modal-close-button">
              <X size={28} color="#3d2817" />
            </button>
            
            <h2 className="modal-title">Settings</h2>
            
            <div className="space-y-6">
              <div className="settings-info">
                <h3 className="settings-title">API Configuration</h3>
                <div className="settings-status">
                  <div>Claude Haiku 4: Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        <div className="chat-area">
          <div className="chat-messages-container">
            {messages.map((msg, idx) => {
              const isPlayer = msg.includes('Player') && msg.includes('said:');
              const isRoll = msg.includes('rolled') || msg.includes('Physical die result');
              const isSystem = msg.includes('received:');
              
              return (
                <div key={idx} className={`message-wrapper ${isPlayer || isRoll || isSystem ? 'message-right' : 'message-left'}`}>
                  <p className={`message-text ${isPlayer ? 'player-message' : ''} ${isRoll || isSystem ? 'roll-message' : ''}`}>
                    {msg}
                  </p>
                </div>
              );
            })}
            {streamingMessage && (
              <div className="message-wrapper message-left">
                <p className="message-text">
                  Dungeon Master: {streamingMessage}<span className="animate-pulse">|</span>
                </p>
              </div>
            )}
            
            {pendingRoll && !isWaitingForPhysicalRoll && (
              <div className="roll-buttons-container">
                <button
                  onClick={executeRoll}
                  className="roll-button digital">
                  Roll {pendingRoll.stat.toUpperCase()} Check
                </button>

                <button
                  onClick={triggerPhysicalRoll}
                  className="roll-button physical">
                  <Camera size={24} />
                  Use Physical Dice
                </button>
              </div>
            )}

            {isWaitingForPhysicalRoll && (
              <div className="waiting-message">
                Waiting for physical dice input...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="input-area">
          <div className="input-container">
            {selectedCharacters.length > 0 && (
              <div className="player-selector">
                <div className="players-display">
                  {selectedCharacters.map(character => {
                    const Icon = character.icon;
                    const isActive = character.playerNum === activePlayer;
                    return (
                      <button
                        key={character.id}
                        onClick={() => setActivePlayer(character.playerNum)}
                        className={`player-chip ${isActive ? 'active' : ''}`}>
                        <Icon size={20} color={isActive ? '#f4e7d7' : '#3d2817'} />
                        <span>
                          {character.name} ({character.playerNum})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="input-row">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="What do you do?" 
                disabled={isLoading}
                className="message-input" />
              <button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
                className="send-button"
                style={{ opacity: isLoading || !input.trim() ? 0.5 : 1 }}>
                {isLoading ? 'Waiting...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{parchmentStyles}</style>
    </div>
  );
}

const parchmentStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=IM+Fell+English:ital@0;1&display=swap');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .parchment-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #e8d5c4;
    background-image: 
      radial-circle at 20% 30%, rgba(107, 30, 30, 0.05) 0%, transparent 40%),
      radial-circle at 80% 70%, rgba(61, 40, 23, 0.08) 0%, transparent 35%),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 2px,
        rgba(61, 40, 23, 0.02) 2px,
        rgba(61, 40, 23, 0.02) 3px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 2px,
        rgba(61, 40, 23, 0.02) 2px,
        rgba(61, 40, 23, 0.02) 3px
      );
    position: relative;
  }

  .parchment-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      radial-circle at 15% 25%, rgba(92, 64, 51, 0.1) 0%, transparent 15%),
      radial-circle at 85% 15%, rgba(92, 64, 51, 0.08) 0%, transparent 12%),
      radial-circle at 50% 80%, rgba(92, 64, 51, 0.06) 0%, transparent 20%);
    pointer-events: none;
  }

  .game-container {
    width: 100%;
    height: 100vh;
    display: flex;
    position: relative;
    overflow: hidden;
    background-color: #e8d5c4;
    background-image: 
      radial-circle at 20% 30%, rgba(107, 30, 30, 0.05) 0%, transparent 40%),
      radial-circle at 80% 70%, rgba(61, 40, 23, 0.08) 0%, transparent 35%),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 2px,
        rgba(61, 40, 23, 0.02) 2px,
        rgba(61, 40, 23, 0.02) 3px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 2px,
        rgba(61, 40, 23, 0.02) 2px,
        rgba(61, 40, 23, 0.02) 3px
      );
  }

  /* Campaign Sidebar */
  .campaign-sidebar {
    width: 280px;
    height: 100vh;
    background: #3d2817;
    border-right: 4px solid #1a1410;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    box-shadow: 4px 0 12px rgba(26, 20, 16, 0.4);
  }

  .campaign-sidebar-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .logo-container {
    text-align: center;
    padding: 1rem 0;
    border-bottom: 2px solid #5c4033;
  }

  .campaign-logo {
    max-width: 180px;
    height: auto;
    border-radius: 8px;
    border: 3px solid #5c4033;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .campaign-info-section {
    padding-bottom: 1rem;
    border-bottom: 2px solid #5c4033;
  }

  .campaign-info-title {
    font-family: 'Cinzel', serif;
    font-size: 0.875rem;
    font-weight: 700;
    color: #e8d5c4;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
  }

  .campaign-info-text {
    font-family: 'Crimson Text', serif;
    font-size: 1rem;
    color: #f4e7d7;
    line-height: 1.5;
  }

  .party-members-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .party-member-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(244, 231, 215, 0.1);
    border: 2px solid #5c4033;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .party-member-item:hover {
    background: rgba(244, 231, 215, 0.2);
    transform: translateX(4px);
  }

  .party-member-icon-small {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #5c4033;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .party-member-info {
    flex: 1;
    text-align: left;
  }

  .party-member-name-small {
    font-family: 'Cinzel', serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #f4e7d7;
  }

  .party-member-class-small {
    font-family: 'Crimson Text', serif;
    font-size: 0.75rem;
    color: #e8d5c4;
    opacity: 0.8;
  }

  .active-player-display {
    padding: 0.75rem;
    background: rgba(107, 30, 30, 0.3);
    border: 2px solid #6b1e1e;
    border-radius: 4px;
  }

  .active-player-name {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 700;
    color: #f4e7d7;
    margin-bottom: 0.25rem;
  }

  .active-player-hp {
    font-family: 'Crimson Text', serif;
    font-size: 0.875rem;
    color: #e8d5c4;
  }

  .sidebar-settings-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #5c4033;
    border: 2px solid #3d2817;
    border-radius: 4px;
    color: #f4e7d7;
    font-family: 'Cinzel', serif;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: auto;
  }

  .sidebar-settings-button:hover {
    background: #6b5537;
    transform: translateY(-2px);
  }

  /* Main Content Area */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-area {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    justify-content: center;
  }

  .chat-messages-container {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .message-wrapper {
    display: flex;
    animation: fadeIn 0.4s ease-out;
  }

  .message-wrapper.message-left {
    justify-content: flex-start;
  }

  .message-wrapper.message-right {
    justify-content: flex-end;
  }

  .message-text {
    font-size: 1.125rem;
    line-height: 1.7;
    max-width: 700px;
    color: #1a1410;
    font-family: 'Crimson Text', serif;
    font-weight: 600;
    padding: 1rem 1.25rem;
    background: rgba(244, 231, 215, 0.6);
    border-radius: 6px;
    border: 2px solid rgba(92, 64, 51, 0.3);
  }

  .player-message {
    font-weight: 500;
    font-style: italic;
    background: rgba(232, 213, 196, 0.5);
  }

  .roll-message {
    font-weight: 700;
    background: #e8d5c4;
    border: 2px solid #5c4033;
    box-shadow: 2px 2px 0px rgba(61, 40, 23, 0.2);
  }

  .roll-buttons-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0;
  }

  .roll-button {
    padding: 1rem 2rem;
    font-size: 1.125rem;
    font-weight: 700;
    border-radius: 6px;
    transition: all 0.3s ease;
    font-family: 'Cinzel', serif;
    cursor: pointer;
    box-shadow: 3px 3px 0px rgba(26, 20, 16, 0.3);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .roll-button:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 5px 5px 0px rgba(26, 20, 16, 0.4);
  }

  .roll-button.digital {
    background: #5c4033;
    color: #f4e7d7;
    border: 3px solid #3d2817;
  }

  .roll-button.physical {
    background: #6b1e1e;
    color: #f4e7d7;
    border: 3px solid #4a1414;
  }

  .waiting-message {
    text-align: center;
    margin: 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    font-style: italic;
    font-family: 'Crimson Text', serif;
    color: #5c4033;
  }

  /* Input Area */
  .input-area {
    padding: 1.5rem 2rem;
    border-top: 4px solid #5c4033;
    background: rgba(232, 213, 196, 0.8);
    display: flex;
    justify-content: center;
  }

  .input-container {
    width: 100%;
    max-width: 900px;
  }

  .player-selector {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    align-items: center;
    justify-content: center;
  }

  .players-display {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .player-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 2px solid #5c4033;
    background: #e8d5c4;
    color: #1a1410;
    opacity: 0.7;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .player-chip:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 2px 2px 0px rgba(61, 40, 23, 0.3);
  }

  .player-chip.active {
    background: #5c4033;
    color: #f4e7d7;
    border-color: #3d2817;
    opacity: 1;
    box-shadow: 3px 3px 0px rgba(26, 20, 16, 0.4);
  }

  .player-chip span {
    font-weight: 700;
    font-family: 'Cinzel', serif;
    font-size: 0.875rem;
  }

  .input-row {
    display: flex;
    gap: 1rem;
  }

  .message-input {
    flex: 1;
    padding: 1rem 1.5rem;
    font-size: 1.125rem;
    border-radius: 6px;
    background: #f4e7d7;
    border: 2px solid #5c4033;
    color: #1a1410;
    font-family: 'Crimson Text', serif;
    outline: none;
    transition: all 0.2s ease;
  }

  .message-input:focus {
    border-color: #3d2817;
    box-shadow: 0 0 0 3px rgba(92, 64, 51, 0.2);
  }

  .message-input::placeholder {
    color: rgba(61, 40, 23, 0.5);
  }

  .send-button {
    padding: 1rem 2rem;
    font-size: 1.125rem;
    font-weight: 600;
    border-radius: 6px;
    background: #5c4033;
    color: #f4e7d7;
    font-family: 'Cinzel', serif;
    border: 2px solid #3d2817;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .send-button:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 3px 3px 0px rgba(26, 20, 16, 0.4);
  }

  .send-button:disabled {
    cursor: not-allowed;
  }

  .title-text {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 2rem;
    font-family: 'Cinzel', serif;
    color: #1a1410;
    text-shadow: 2px 2px 0px rgba(92, 64, 51, 0.2);
    letter-spacing: 0.05em;
    text-align: center;
  }

  .section-title {
    font-size: 2.5rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #1a1410;
    letter-spacing: 0.03em;
    text-align: center;
  }

  .campaign-card {
    width: 100%;
    text-align: left;
    padding: 2rem;
    border-radius: 4px;
    transition: all 0.3s ease;
    background: #f4e7d7;
    border: 3px solid #5c4033;
    border-style: solid;
    box-shadow: 
      3px 3px 0px rgba(61, 40, 23, 0.3),
      inset 0 0 20px rgba(244, 231, 215, 0.5);
    cursor: pointer;
  }

  .campaign-card:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 
      5px 5px 0px rgba(61, 40, 23, 0.4),
      inset 0 0 25px rgba(244, 231, 215, 0.6);
  }

  .campaign-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    font-family: 'Cinzel', serif;
    color: #1a1410;
    letter-spacing: 0.02em;
  }

  .campaign-description {
    font-size: 0.875rem;
    opacity: 0.75;
    font-family: 'Crimson Text', serif;
    line-height: 1.6;
    color: #3d2817;
  }

  .number-button {
    width: 5rem;
    height: 5rem;
    font-size: 1.875rem;
    font-weight: 700;
    border-radius: 4px;
    transition: all 0.3s ease;
    background: #5c4033;
    color: #f4e7d7;
    border: 3px solid #3d2817;
    font-family: 'Cinzel', serif;
    box-shadow: 3px 3px 0px rgba(26, 20, 16, 0.4);
    cursor: pointer;
  }

  .number-button:hover {
    transform: scale(1.15) rotate(5deg);
    box-shadow: 5px 5px 0px rgba(26, 20, 16, 0.5);
  }

  .character-card {
    padding: 1.25rem;
    border-radius: 4px;
    transition: all 0.3s ease;
    background: #f4e7d7;
    border: 3px solid #5c4033;
    position: relative;
    box-shadow: 2px 2px 0px rgba(61, 40, 23, 0.3);
    cursor: pointer;
  }

  .character-card:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 4px 4px 0px rgba(61, 40, 23, 0.4);
  }

  .character-card.selected {
    background: #5c4033;
    border-color: #3d2817;
  }

  .player-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4e7d7;
    font-family: 'Cinzel', serif;
    font-weight: 700;
    font-size: 0.875rem;
    color: #3d2817;
    border: 2px solid #3d2817;
  }

  .character-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #5c4033;
    border: 2px solid #3d2817;
  }

  .character-card.selected .character-icon {
    background: #f4e7d7;
    border-color: #3d2817;
  }

  .character-name {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #1a1410;
  }

  .character-card.selected .character-name {
    color: #f4e7d7;
  }

  .character-race {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    font-weight: 600;
    color: #5c4033;
  }

  .character-card.selected .character-race {
    color: #f4e7d7;
  }

  .character-stats {
    display: flex;
    gap: 0.75rem;
    font-size: 0.875rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
    color: #1a1410;
  }

  .character-card.selected .character-stats {
    color: #f4e7d7;
  }

  .character-abilities {
    font-size: 0.75rem;
    color: #666;
  }

  .character-card.selected .character-abilities {
    color: #e8d5c4;
  }

  .begin-button {
    padding: 1rem 3rem;
    font-size: 1.5rem;
    font-weight: 700;
    border-radius: 4px;
    transition: all 0.3s ease;
    background: #5c4033;
    color: #f4e7d7;
    border: 3px solid #3d2817;
    font-family: 'Cinzel', serif;
    box-shadow: 4px 4px 0px rgba(26, 20, 16, 0.4);
    cursor: pointer;
  }

  .begin-button:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 6px 6px 0px rgba(26, 20, 16, 0.5);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(26, 20, 16, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .modal-card {
    background: #f4e7d7;
    border-radius: 4px;
    padding: 2rem;
    max-width: 28rem;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    border: 4px solid #5c4033;
    box-shadow: 0 10px 30px rgba(26, 20, 16, 0.5);
    position: relative;
  }

  .modal-close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    cursor: pointer;
    transition: transform 0.2s ease;
    background: transparent;
    border: none;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .modal-close-button:hover {
    transform: scale(1.1) rotate(90deg);
  }

  .modal-title {
    font-size: 1.875rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #1a1410;
    letter-spacing: 0.02em;
    margin-bottom: 1.5rem;
    padding-right: 2rem;
  }

  .close-button {
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .close-button:hover {
    transform: scale(1.1) rotate(90deg);
  }

  .character-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #5c4033;
  }

  .character-icon-large {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #5c4033;
    border: 2px solid #3d2817;
  }

  .character-name-large {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #1a1410;
  }

  .character-info {
    font-size: 0.875rem;
    opacity: 0.75;
    color: #3d2817;
    font-family: 'Crimson Text', serif;
  }

  .player-number {
    font-size: 0.75rem;
    opacity: 0.6;
    color: #3d2817;
    font-family: 'Crimson Text', serif;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-box {
    padding: 0.75rem;
    border-radius: 4px;
    background: #e8d5c4;
    border: 2px solid #5c4033;
  }

  .stat-label {
    font-size: 0.75rem;
    opacity: 0.75;
    font-family: 'Crimson Text', serif;
    color: #3d2817;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #1a1410;
  }

  .section-divider {
    padding-top: 0.75rem;
    border-top: 2px solid #5c4033;
  }

  .section-heading {
    font-weight: 700;
    margin-bottom: 0.75rem;
    font-family: 'Cinzel', serif;
    color: #1a1410;
    font-size: 1.1rem;
    letter-spacing: 0.02em;
  }

  .abilities-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .ability-box {
    padding: 0.5rem;
    border-radius: 4px;
    text-align: center;
    background: #e8d5c4;
    border: 2px solid #5c4033;
  }

  .ability-label {
    font-size: 0.75rem;
    opacity: 0.75;
    font-family: 'Crimson Text', serif;
    color: #3d2817;
  }

  .ability-value {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #1a1410;
  }

  .currency-display {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
  }

  .currency-item {
    text-align: center;
  }

  .currency-icon {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #5c4033;
  }

  .currency-label {
    font-size: 0.75rem;
    opacity: 0.75;
    font-family: 'Crimson Text', serif;
    color: #3d2817;
  }

  .currency-amount {
    font-weight: 700;
    font-family: 'Cinzel', serif;
    color: #1a1410;
  }

  .item-entry {
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    background: #e8d5c4;
    border: 1px solid #5c4033;
    font-family: 'Crimson Text', serif;
    color: #3d2817;
  }

  .settings-info {
    padding: 1rem;
    border-radius: 4px;
    background: #e8d5c4;
    border: 2px solid #5c4033;
  }

  .settings-title {
    font-weight: 700;
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
    font-family: 'Cinzel', serif;
    color: #1a1410;
  }

  .settings-status {
    font-size: 0.875rem;
    opacity: 0.75;
    font-family: 'Crimson Text', serif;
    color: #3d2817;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-in {
    animation: fadeIn 0.6s ease-out;
  }
`;