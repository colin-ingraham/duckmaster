# Troubleshooting Guide

## Installation Issues

### "npm: command not found" or "node: command not found"
**Problem:** Node.js is not installed or not in your PATH

**Solution:**
1. Download Node.js from https://nodejs.org/ (LTS version recommended)
2. Install it with default settings
3. Restart your terminal/command prompt
4. Verify installation: `node --version` and `npm --version`

### "npm install" fails
**Problem:** Dependency installation errors

**Solutions:**
1. Delete `node_modules` folder and `package-lock.json` file
2. Run `npm install` again
3. If still failing, try: `npm install --legacy-peer-deps`
4. Update npm: `npm install -g npm@latest`

## Runtime Issues

### "Invalid API Key" or "401 Unauthorized"
**Problem:** API key is missing or incorrect

**Solutions:**
1. Check `.env` file exists in the root folder (same level as package.json)
2. Verify format: `REACT_APP_ANTHROPIC_API_KEY=sk-ant-...` (no quotes, no spaces)
3. Get a new key from https://console.anthropic.com/
4. Restart the dev server after changing .env file

### "Cannot find module" errors
**Problem:** Missing dependencies

**Solution:**
Run `npm install` again

### Port 3000 already in use
**Problem:** Another app is using port 3000

**Solutions:**
1. When prompted, type 'y' to use a different port
2. Or manually specify port: `PORT=3001 npm start` (Mac/Linux)
3. Or stop the other app using port 3000

### Blank white screen
**Problem:** JavaScript error preventing app from rendering

**Solutions:**
1. Open browser console (F12 or right-click → Inspect → Console)
2. Look for error messages
3. Common fixes:
   - Clear browser cache and reload
   - Check .env file is properly formatted
   - Verify all dependencies installed: `npm install`

### "Failed to fetch" or network errors
**Problem:** Can't connect to Anthropic API

**Solutions:**
1. Check your internet connection
2. Verify API key is active at https://console.anthropic.com/
3. Check if you have API credits remaining
4. Try a different network (corporate firewalls may block API calls)

### Game loads but AI doesn't respond
**Problem:** API communication issue

**Solutions:**
1. Check browser console for errors (F12)
2. Verify API key in .env file
3. Check Anthropic service status
4. Ensure you have API credits

## React Errors

### "Module not found: Can't resolve 'lucide-react'"
**Problem:** Missing icon library

**Solution:**
```bash
npm install lucide-react
```

### Hot reload not working
**Problem:** Changes don't appear without manual refresh

**Solutions:**
1. Check you saved the file
2. Restart dev server: Ctrl+C then `npm start`
3. Clear browser cache

## API Cost Concerns

### How much does this cost?
- The app uses Claude Haiku 4 which is very affordable
- Typical conversation: a few cents
- Monitor usage at https://console.anthropic.com/

### How to limit costs?
1. Set usage limits in Anthropic Console
2. Don't leave the app running unattended
3. Each message sent costs tokens

## Still Having Issues?

1. **Check the README.md** for detailed setup instructions
2. **Look at browser console** (F12) for specific error messages
3. **Verify all files** are in correct locations (see project structure in README)
4. **Try fresh install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Getting Help

If you're still stuck:
1. Check the error message carefully
2. Search for the specific error online
3. Verify your Node.js version: `node --version` (should be v14+)
4. Make sure you followed all setup steps in order

## Environment Variables Not Working?

**Windows users:** Environment variables must start with `REACT_APP_`

**Common mistakes:**
- ❌ `API_KEY=...` (won't work)
- ❌ `ANTHROPIC_API_KEY=...` (won't work)
- ✅ `REACT_APP_ANTHROPIC_API_KEY=...` (correct!)

**After editing .env:**
Always restart the development server (Ctrl+C, then `npm start`)
