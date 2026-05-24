#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Terminal } from '../lib/terminal.js';
import { Editor } from '../lib/editor.js';
import { UserSettings } from '../lib/settings/settings.js';

function main() {
  const fileArg = process.argv[2];
  let filepath = null;
  let initialText = '';

  if (fileArg) {
    filepath = path.resolve(fileArg);
    try {
      if (fs.existsSync(filepath)) {
        initialText = fs.readFileSync(filepath, 'utf8');
      }
    } catch (err) {
      console.error(`Unable to enter file archives at: ${fileArg}`);
      console.error(err.message);
      process.exit(1);
    }
  }

  // Load settings
  const settings = new UserSettings();

  // Instantiate editor
  const editor = new Editor(filepath, initialText, settings);

  // Setup terminal state
  Terminal.enterRawMode();
  Terminal.clear();

  // Draw initial state
  editor.render();

  // Resize hook
  Terminal.onResize(editor.onResize);

  // Key press hook
  process.stdin.on('keypress', (str, key) => {
    const normKey = key || {};
    editor.handleKeypress(str, normKey);
  });

  // Handle termination signals
  process.on('SIGINT', () => {
    editor.quitWorkflow();
  });
  
  process.on('SIGTERM', () => {
    editor.quitWorkflow();
  });
}

main();
