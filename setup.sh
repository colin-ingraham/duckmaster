#!/bin/bash

echo "🎲 DM Table Game - Setup Script"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    echo ""
    read -p "Do you have an Anthropic API key? (y/n): " has_key
    
    if [ "$has_key" = "y" ] || [ "$has_key" = "Y" ]; then
        read -p "Enter your API key: " api_key
        echo "REACT_APP_ANTHROPIC_API_KEY=$api_key" > .env
        echo "✅ .env file created!"
    else
        echo ""
        echo "📝 Please get an API key from: https://console.anthropic.com/"
        echo "   Then create a .env file with:"
        echo "   REACT_APP_ANTHROPIC_API_KEY=your_key_here"
        cp .env.example .env
        echo ""
        echo "⚠️  Created .env file - please edit it with your API key"
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "================================"
echo "🎉 Setup complete!"
echo ""
echo "To start the game, run:"
echo "  npm start"
echo ""
