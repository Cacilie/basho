import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_SETTINGS = {
  margin: 35,
  zenMode: false,
  theme: 'green',
  showHaikuOnStartup: true
};

export class UserSettings {
  constructor() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.configPath = path.resolve(__dirname, 'settings.json');
    this.settings = { ...DEFAULT_SETTINGS };
    
    this.loadSettings();
  }

  loadSettings() {
    try {
      if (!fs.existsSync(this.configPath)) {
        fs.writeFileSync(this.configPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
      } else {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      // Fail silently if file is write-protected
    }
  }

  // Getters
  get margin() {
    return this.settings.margin;
  }

  get zenMode() {
    return this.settings.zenMode;
  }

  get theme() {
    return this.settings.theme;
  }

  get showHaikuOnStartup() {
    return this.settings.showHaikuOnStartup;
  }

  // Setters (with auto-saving to disk)
  set margin(value) {
    this.settings.margin = Math.max(0, Number(value));
    this.saveSettings();
  }

  set zenMode(value) {
    this.settings.zenMode = Boolean(value);
    this.saveSettings();
  }

  set theme(value) {
    this.settings.theme = String(value);
    this.saveSettings();
  }

  set showHaikuOnStartup(value) {
    this.settings.showHaikuOnStartup = Boolean(value);
    this.saveSettings();
  }
}
