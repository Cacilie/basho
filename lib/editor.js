import fs from 'fs';
import path from 'path';
import { Terminal, ANSI } from './terminal.js';
import { getRandomHaiku } from './haikus.js';

export class Editor {
  constructor(filepath = null, initialText = '', settings = null) {
    this.filepath = filepath;
    this.lines = initialText ? initialText.split(/\r?\n/) : [''];
    
    // Editor coordinates (0-based indexing)
    this.cursorX = 0;
    this.cursorY = 0;
    this.scrollRow = 0;
    this.scrollCol = 0;
    
    this.isDirty = false;
    this.settings = settings;
    this.zenMode = this.settings ? this.settings.zenMode : false;
    this.message = ''; // Temporary status message
    this.messageTimeout = null;

    // Command mode state
    this.isCommandMode = false;
    this.commandBuffer = '';
    this.commandCursorX = 0;

    // Overlay state (e.g., help or haiku reflection)
    this.activeOverlay = null; // 'help' | 'haiku' | 'quit_confirm'
    
    // Splash screen state
    this.isSplash = !initialText; 
    this.splashHaiku = this.isSplash ? getRandomHaiku() : null;

    // Resize handler binding
    this.onResize = this.handleResize.bind(this);
  }

  // Set temporary status bar message
  setStatusMessage(msg, duration = 3000) {
    this.message = msg;
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    this.messageTimeout = setTimeout(() => {
      this.message = '';
      this.render();
    }, duration);
  }

  handleResize() {
    this.render();
  }

  // Core drawing method
  render() {
    const { cols, rows } = Terminal.size;

    if (this.isSplash) {
      this.drawSplashScreen(cols, rows);
      return;
    }

    // Enclosure geometry definitions
    const userMargin = this.settings ? this.settings.margin : 12;
    const margin = cols > 90 ? userMargin : 2;
    const borderLeft = margin; 
    const borderRight = cols - (margin - 1);
    const insideWidth = Math.max(10, cols - (margin * 2 + 2));
    const viewportHeight = Math.max(3, rows - 5);

    // Scroll calculations
    if (this.cursorY < this.scrollRow) {
      this.scrollRow = this.cursorY;
    }
    if (this.cursorY >= this.scrollRow + viewportHeight) {
      this.scrollRow = this.cursorY - viewportHeight + 1;
    }
    if (this.cursorX < this.scrollCol) {
      this.scrollCol = this.cursorX;
    }
    if (this.cursorX >= this.scrollCol + insideWidth) {
      this.scrollCol = this.cursorX - insideWidth + 1;
    }

    // Move to home position and draw text rows
    Terminal.hideCursor();

    // Clear top line
    Terminal.moveCursor(1, 1);
    Terminal.write('\x1b[2K'); 

    // Clear second line (no horizontal border)
    Terminal.moveCursor(1, 2);
    Terminal.write('\x1b[2K');

    // Draw text rows inside the borders
    const themeColor = this.getThemeColor();
    for (let sRow = 0; sRow < viewportHeight; sRow++) {
      const docRow = this.scrollRow + sRow;
      const screenRow = 3 + sRow;
      Terminal.moveCursor(1, screenRow);

      let textContent = '';
      if (docRow < this.lines.length) {
        const line = this.lines[docRow];
        if (this.scrollCol < line.length) {
          textContent = line.substring(this.scrollCol, this.scrollCol + insideWidth);
        }
      }

      const paddedText = textContent.padEnd(insideWidth, ' ');
      const prefix = ' '.repeat(margin - 1) + themeColor + '│' + ANSI.RESET + ' ';
      const suffix = ' ' + themeColor + '│' + ANSI.RESET;

      Terminal.write(prefix + paddedText + suffix + '\x1b[K');
    }

    // Clear line below writing viewport (no horizontal border)
    Terminal.moveCursor(1, rows - 2);
    Terminal.write('\x1b[2K');

    // Clear row above status line
    Terminal.moveCursor(1, rows - 1);
    Terminal.write('\x1b[2K');

    // Draw status bar or command line
    Terminal.moveCursor(1, rows);
    if (this.isCommandMode) {
      // Draw command bar
      Terminal.write(ANSI.BG_ZEN_STATUS + ` /${this.commandBuffer}`.padEnd(cols).substring(0, cols) + ANSI.RESET);
    } else if (this.activeOverlay === 'quit_confirm') {
      Terminal.write(ANSI.BG_ZEN_STATUS + ' Departing the temple? Save changes first? (y / n / escape)'.padEnd(cols).substring(0, cols) + ANSI.RESET);
    } else {
      // Normal status bar (hidden completely in Zen Mode unless there is a status message)
      if (this.zenMode && !this.message) {
        Terminal.write('\x1b[2K'); // Completely blank status bar in Zen mode
      } else {
        const filename = this.filepath ? path.basename(this.filepath) : '[untitled]';
        const dirtyMarker = this.isDirty ? ' *' : '';
        const position = `${this.cursorY + 1}:${this.cursorX + 1}`;
        const wordCount = this.getWordCount();
        const wordStr = `${wordCount} word${wordCount !== 1 ? 's' : ''}`;
        
        const leftSide = ` ${filename}${dirtyMarker} (${wordStr})`;
        const rightSide = `${this.message ? `[${this.message}] ` : ''}${position} `;
        
        const padLen = cols - leftSide.length - rightSide.length;
        const padding = padLen > 0 ? ' '.repeat(padLen) : ' ';
        const statusBarContent = leftSide + padding + rightSide;
        
        Terminal.write(ANSI.BG_ZEN_STATUS + statusBarContent.substring(0, cols) + ANSI.RESET);
      }
    }

    // Draw active overlay (if any)
    if (this.activeOverlay === 'help') {
      this.drawHelpOverlay(cols, rows);
    } else if (this.activeOverlay === 'haiku') {
      this.drawHaikuOverlay(cols, rows);
    }

    // Position the physical cursor
    if (this.isCommandMode) {
      Terminal.moveCursor(this.commandBuffer.length + 3, rows); // +3 to account for space and slash
    } else if (this.activeOverlay === 'quit_confirm') {
      Terminal.moveCursor(54, rows);
    } else if (this.activeOverlay) {
      // Hide cursor during static dialog overlays
      Terminal.hideCursor();
    } else {
      const physicalX = (margin + 2) + this.cursorX - this.scrollCol;
      const physicalY = 3 + this.cursorY - this.scrollRow;
      Terminal.moveCursor(physicalX, physicalY);
      Terminal.showCursor();
    }
  }

  getThemeColor() {
    const theme = this.settings ? this.settings.theme : 'green';
    switch (theme.toLowerCase()) {
      case 'red': return ANSI.FG_RED;
      case 'blue': return ANSI.FG_BLUE;
      case 'yellow': return ANSI.FG_YELLOW;
      case 'cyan': return ANSI.FG_CYAN;
      case 'magenta': return ANSI.FG_MAGENTA;
      case 'white': return ANSI.FG_WHITE;
      case 'gray': return ANSI.FG_ZEN_GRAY;
      case 'green':
      default:
        return ANSI.FG_ZEN_GREEN;
    }
  }

  drawSplashScreen(cols, rows) {
    Terminal.clear();
    const haiku = this.splashHaiku;
    
    const title = 'B A S H O';
    const subtitle = 'Minimalist Zen Word Processor';
    const themeColor = this.getThemeColor();
    
    const titleY = Math.max(3, Math.floor(rows / 4));
    
    // Draw title
    Terminal.moveCursor(Math.max(1, Math.floor((cols - title.length) / 2)), titleY);
    Terminal.write(themeColor + ANSI.BOLD + title + ANSI.RESET);
    
    // Draw subtitle
    Terminal.moveCursor(Math.max(1, Math.floor((cols - subtitle.length) / 2)), titleY + 1);
    Terminal.write(ANSI.FG_ZEN_GRAY + ANSI.DIM + subtitle + ANSI.RESET);
    
    // Draw haiku box (centered)
    const transLines = haiku.translation.split('\n');
    const haikuBoxWidth = Math.max(
      haiku.original.length * 2,
      haiku.romaji.length,
      ...transLines.map(l => l.length)
    ) + 6;
    
    const haikuBoxHeight = transLines.length + 5;
    const haikuX = Math.max(1, Math.floor((cols - haikuBoxWidth) / 2));
    const haikuY = titleY + 3;
    
    // Top border
    Terminal.moveCursor(haikuX, haikuY);
    Terminal.write(themeColor + '┌' + '─'.repeat(haikuBoxWidth - 2) + '┐' + ANSI.RESET);
    
    // Original Japanese
    Terminal.moveCursor(haikuX + 2, haikuY + 1);
    Terminal.write(ANSI.BOLD + haiku.original + ANSI.RESET);
    
    // Romaji
    Terminal.moveCursor(haikuX + 2, haikuY + 2);
    Terminal.write(ANSI.ITALIC + ANSI.DIM + haiku.romaji + ANSI.RESET);
    
    // Translation
    for (let i = 0; i < transLines.length; i++) {
      Terminal.moveCursor(haikuX + 4, haikuY + 4 + i);
      Terminal.write(transLines[i]);
    }
    
    // Bottom border
    Terminal.moveCursor(haikuX, haikuY + haikuBoxHeight - 1);
    Terminal.write(themeColor + '└' + '─'.repeat(haikuBoxWidth - 2) + '┘' + ANSI.RESET);
    
    // Bottom prompt
    const prompt = 'Press any key to enter the writing temple...';
    Terminal.moveCursor(Math.max(1, Math.floor((cols - prompt.length) / 2)), rows - 2);
    Terminal.write(ANSI.FG_ZEN_GRAY + ANSI.DIM + prompt + ANSI.RESET);
  }

  getWordCount() {
    let count = 0;
    for (const line of this.lines) {
      const words = line.trim().split(/\s+/);
      if (words.length > 0 && words[0] !== '') {
        count += words.length;
      }
    }
    return count;
  }

  // Draw overlay frames
  drawBox(title, lines, cols, rows) {
    const boxWidth = Math.min(60, cols - 4);
    const boxHeight = lines.length + 4;
    const startX = Math.floor((cols - boxWidth) / 2);
    const startY = Math.max(2, Math.floor((rows - boxHeight) / 2));

    // Top border
    const themeColor = this.getThemeColor();
    Terminal.moveCursor(startX, startY);
    Terminal.write(themeColor + '┌' + '─'.repeat(boxWidth - 2) + '┐' + ANSI.RESET);
    
    // Title (if any)
    if (title) {
      const paddedTitle = ` ${title} `;
      const titleStart = startX + Math.floor((boxWidth - paddedTitle.length) / 2);
      Terminal.moveCursor(titleStart, startY);
      Terminal.write(themeColor + ANSI.BOLD + paddedTitle + ANSI.RESET);
    }

    // Middle rows
    for (let i = 0; i < lines.length; i++) {
      Terminal.moveCursor(startX, startY + 1 + i);
      const content = lines[i];
      const padLen = boxWidth - 4 - content.length;
      const padding = padLen > 0 ? ' '.repeat(padLen) : '';
      Terminal.write(themeColor + '│ ' + ANSI.RESET + content + padding + themeColor + ' │' + ANSI.RESET);
    }

    // Press any key hint row
    Terminal.moveCursor(startX, startY + boxHeight - 2);
    const hint = '[ Press Escape or Enter to return ]';
    const hintPad = boxWidth - 4 - hint.length;
    const hintPadding = hintPad > 0 ? ' '.repeat(hintPad) : '';
    Terminal.write(
      themeColor + '│ ' + ANSI.RESET + 
      ANSI.DIM + hint + ANSI.RESET + hintPadding + 
      themeColor + ' │' + ANSI.RESET
    );

    // Bottom border
    Terminal.moveCursor(startX, startY + boxHeight - 1);
    Terminal.write(themeColor + '└' + '─'.repeat(boxWidth - 2) + '┘' + ANSI.RESET);
  }

  drawHelpOverlay(cols, rows) {
    const helpLines = [
      ' BASHO KEYMAPS',
      ' ───────────────────────────────────────────',
      ' Ctrl + S        Save current file',
      ' Ctrl + P        Open slash command bar (/)',
      ' Ctrl + H / F1   Toggle help menu (this screen)',
      ' Ctrl + Q / C    Quit word processor',
      ' Arrow Keys      Navigate document',
      ' Home / End      Go to start / end of line',
      ' PageUp/Down     Scroll screen up / down',
      ' ',
      ' AVAILABLE SLASH COMMANDS',
      ' ───────────────────────────────────────────',
      ' /save           Write document to disk',
      ' /quit           Depart the temple (Exit)',
      ' /zen            Toggle Zen mode (pure writing canvas)',
      ' /haiku          Contemplate a random haiku',
      ' /help           Open this help screen',
      ' /syllables      Ponder syllable counter status'
    ];
    this.drawBox('Temple Guide & Commands', helpLines, cols, rows);
  }

  drawHaikuOverlay(cols, rows) {
    if (!this.currentHaiku) {
      this.currentHaiku = getRandomHaiku();
    }
    const haiku = this.currentHaiku;
    
    // Break translation into lines
    const transLines = haiku.translation.split('\n');
    
    const contentLines = [
      ` "${haiku.original}"`,
      ` (${haiku.romaji})`,
      ' ',
      ...transLines.map(l => `   ${l}`),
      ' ',
      ` Source: ${haiku.source}`
    ];
    
    this.drawBox('Haiku Contemplation', contentLines, cols, rows);
  }

  handleKeypress(str, key) {
    if (this.isSplash) {
      this.isSplash = false;
      this.splashHaiku = null;
      Terminal.clear();
      this.render();
      return;
    }

    // If we have an overlay, let any escape/enter/ctrl+c close it
    if (this.activeOverlay && this.activeOverlay !== 'quit_confirm') {
      if (key.name === 'escape' || key.name === 'return' || (key.ctrl && key.name === 'c')) {
        this.activeOverlay = null;
        this.currentHaiku = null; // Clear so next launch gets a fresh one
        this.render();
      }
      return;
    }

    if (this.activeOverlay === 'quit_confirm') {
      if (key.name === 'y' || key.name === 'yes') {
        this.activeOverlay = null;
        this.saveFile().then((saved) => {
          if (saved) {
            this.exit();
          } else {
            this.render();
          }
        });
      } else if (key.name === 'n' || key.name === 'no') {
        this.activeOverlay = null;
        this.exit();
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        this.activeOverlay = null;
        this.render();
      }
      return;
    }

    if (this.isCommandMode) {
      this.handleCommandKeypress(str, key);
      return;
    }

    // Normal typing & shortcuts
    if (key.ctrl) {
      switch (key.name) {
        case 's':
          this.saveFile();
          break;
        case 'q':
        case 'c':
          this.quitWorkflow();
          break;
        case 'h':
        case 'g':
          this.activeOverlay = 'help';
          this.render();
          break;
        case 'p':
          this.isCommandMode = true;
          this.commandBuffer = '';
          this.render();
          break;
      }
      return;
    }

    // Special functional keys
    switch (key.name) {
      case 'f1':
        this.activeOverlay = 'help';
        this.render();
        return;
      case 'escape':
        // Escape opens the command mode seamlessly (like vim mode changes)
        this.isCommandMode = true;
        this.commandBuffer = '';
        this.render();
        return;
      case 'up':
        if (this.cursorY > 0) {
          this.cursorY--;
          this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
        }
        break;
      case 'down':
        if (this.cursorY < this.lines.length - 1) {
          this.cursorY++;
          this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
        }
        break;
      case 'left':
        if (this.cursorX > 0) {
          this.cursorX--;
        } else if (this.cursorY > 0) {
          this.cursorY--;
          this.cursorX = this.lines[this.cursorY].length;
        }
        break;
      case 'right':
        if (this.cursorX < this.lines[this.cursorY].length) {
          this.cursorX++;
        } else if (this.cursorY < this.lines.length - 1) {
          this.cursorY++;
          this.cursorX = 0;
        }
        break;
      case 'home':
        this.cursorX = 0;
        break;
      case 'end':
        this.cursorX = this.lines[this.cursorY].length;
        break;
      case 'pageup':
        this.cursorY = Math.max(0, this.cursorY - (Terminal.size.rows - 5));
        this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
        break;
      case 'pagedown':
        this.cursorY = Math.min(this.lines.length - 1, this.cursorY + (Terminal.size.rows - 5));
        this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
        break;
      case 'enter':
      case 'return':
        this.insertNewline();
        break;
      case 'backspace':
        this.handleBackspace();
        break;
      case 'delete':
        this.handleDelete();
        break;
      case 'tab':
        this.insertText('  '); // Elegant soft tab (2 spaces)
        break;
      default:
        // Regular characters
        if (str && str.length === 1 && !key.meta) {
          this.insertText(str);
        }
        break;
    }

    this.render();
  }

  // Handle command-line keys
  handleCommandKeypress(str, key) {
    if (key.name === 'escape' || (key.ctrl && key.name === 'p')) {
      this.isCommandMode = false;
      this.render();
      return;
    }

    if (key.name === 'return' || key.name === 'enter') {
      this.isCommandMode = false;
      this.executeCommand(this.commandBuffer.trim());
      this.commandBuffer = '';
      return;
    }

    if (key.name === 'backspace') {
      if (this.commandBuffer.length > 0) {
        this.commandBuffer = this.commandBuffer.slice(0, -1);
      } else {
        this.isCommandMode = false;
      }
      this.render();
      return;
    }

    // Add character to command buffer
    if (str && str.length === 1 && !key.ctrl && !key.meta) {
      this.commandBuffer += str;
      this.render();
    }
  }

  // Execute typed slash commands
  executeCommand(command) {
    // Strip leading slash if typed (e.g. "/save" -> "save")
    const cleanCmd = command.startsWith('/') ? command.slice(1) : command;
    const parts = cleanCmd.split(/\s+/);
    const mainCmd = parts[0].toLowerCase();
    
    switch (mainCmd) {
      case 'w':
      case 'save':
        if (parts[1]) {
          this.filepath = parts[1];
        }
        this.saveFile();
        break;
      case 'q':
      case 'quit':
        this.quitWorkflow();
        break;
      case 'zen':
        this.zenMode = !this.zenMode;
        if (this.settings) {
          this.settings.zenMode = this.zenMode;
        }
        this.setStatusMessage(this.zenMode ? 'Zen Mode: distraction faded' : 'Zen Mode: status returned');
        break;
      case 'haiku':
        this.activeOverlay = 'haiku';
        this.render();
        break;
      case 'h':
      case 'help':
        this.activeOverlay = 'help';
        this.render();
        break;
      case 'syllables':
        this.setStatusMessage('Syllables: A seed for a future spring.');
        break;
      case '':
        this.render();
        break;
      default:
        this.setStatusMessage(`Command unknown: /${mainCmd}. Try /help.`);
        break;
    }
  }

  // Text insertion/deletions
  insertText(text) {
    const line = this.lines[this.cursorY];
    this.lines[this.cursorY] = line.slice(0, this.cursorX) + text + line.slice(this.cursorX);
    this.cursorX += text.length;
    this.isDirty = true;
  }

  insertNewline() {
    const line = this.lines[this.cursorY];
    const left = line.slice(0, this.cursorX);
    const right = line.slice(this.cursorX);
    
    this.lines[this.cursorY] = left;
    this.lines.splice(this.cursorY + 1, 0, right);
    
    this.cursorY++;
    this.cursorX = 0;
    this.isDirty = true;
  }

  handleBackspace() {
    if (this.cursorX > 0) {
      const line = this.lines[this.cursorY];
      this.lines[this.cursorY] = line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
      this.cursorX--;
      this.isDirty = true;
    } else if (this.cursorY > 0) {
      const prevLine = this.lines[this.cursorY - 1];
      const curLine = this.lines[this.cursorY];
      this.cursorX = prevLine.length;
      this.lines[this.cursorY - 1] = prevLine + curLine;
      this.lines.splice(this.cursorY, 1);
      this.cursorY--;
      this.isDirty = true;
    }
  }

  handleDelete() {
    const line = this.lines[this.cursorY];
    if (this.cursorX < line.length) {
      this.lines[this.cursorY] = line.slice(0, this.cursorX) + line.slice(this.cursorX + 1);
      this.isDirty = true;
    } else if (this.cursorY < this.lines.length - 1) {
      const nextLine = this.lines[this.cursorY + 1];
      this.lines[this.cursorY] = line + nextLine;
      this.lines.splice(this.cursorY + 1, 1);
      this.isDirty = true;
    }
  }

  // File loading and saving
  async saveFile() {
    if (!this.filepath) {
      this.setStatusMessage('Cannot save unnamed parchment. Specify path on startup.');
      return false;
    }
    
    try {
      const content = this.lines.join('\n');
      fs.writeFileSync(this.filepath, content, 'utf8');
      this.isDirty = false;
      this.setStatusMessage('Saved to temple archives.');
      this.render();
      return true;
    } catch (err) {
      this.setStatusMessage(`Failed to save: ${err.message}`);
      this.render();
      return false;
    }
  }

  quitWorkflow() {
    if (this.isDirty) {
      this.activeOverlay = 'quit_confirm';
      this.render();
    } else {
      this.exit();
    }
  }

  exit() {
    Terminal.clear();
    Terminal.exitRawMode();
    
    // Print a calm departing message on actual terminal exit
    console.log('\n  "An ancient pond...');
    console.log('   The frog leaps in.');
    console.log('   Go in peace."\n');
    process.exit(0);
  }
}
