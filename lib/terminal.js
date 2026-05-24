import readline from 'readline';

// ANSI escape sequences
export const ANSI = {
  CLEAR_SCREEN: '\x1b[2J',
  CURSOR_HOME: '\x1b[H',
  CURSOR_HIDE: '\x1b[?25l',
  CURSOR_SHOW: '\x1b[?25h',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  REVERSE: '\x1b[7m',
  
  // Colors
  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',
  
  // Custom theme colors (using 256 color escape sequences)
  FG_ZEN_GRAY: '\x1b[38;5;244m',
  FG_ZEN_GREEN: '\x1b[38;5;108m',
  BG_ZEN_STATUS: '\x1b[48;5;235m\x1b[38;5;248m' // Dark gray bg, light gray text
};

export class Terminal {
  static get size() {
    return {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24
    };
  }

  static enterRawMode() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    readline.emitKeypressEvents(process.stdin);
    
    // Hide cursor while doing full screen rendering to avoid flicker,
    // but show it when we locate the user's editing point.
    this.write(ANSI.CURSOR_HIDE);
  }

  static exitRawMode() {
    this.write(ANSI.CURSOR_SHOW);
    this.write(ANSI.RESET);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }

  static write(string) {
    process.stdout.write(string);
  }

  static clear() {
    this.write(ANSI.CLEAR_SCREEN + ANSI.CURSOR_HOME);
  }

  static clearLine(row) {
    this.moveCursor(1, row);
    this.write('\x1b[2K');
  }

  static moveCursor(col, row) {
    // col and row are 1-based index
    this.write(`\x1b[${row};${col}H`);
  }

  static onResize(callback) {
    process.stdout.on('resize', () => {
      callback(this.size);
    });
  }

  static showCursor() {
    this.write(ANSI.CURSOR_SHOW);
  }

  static hideCursor() {
    this.write(ANSI.CURSOR_HIDE);
  }
}
