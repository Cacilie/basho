# Basho ── Minimalist Zen CLI Word Processor

> *“An ancient pond...*
> *The frog leaps in.*
> *Go in peace.”*

Basho is a minimalist, distraction-free command-line word processor built with Node.js. It features a zero-dependency architecture reflecting Zen opinions of simplicity, quietness, and high performance.

---

## Features
- **Distraction-Free Canvas**: Vertical page border margins (A4 aspect look) on large screens.
- **Dynamic Margins**: Auto-collapses borders in narrow terminals to maximize workspace.
- **Zen Mode**: Hides the status line completely for an empty screen editing experience.
- **Zen Welcomes**: Displays random public domain haikus by Matsuo Basho on start.
- **Self-Contained Configuration**: Customizable settings stored inside the project.

---

## Installation

Install globally from npm:

```bash
npm install -g @cacilie/basho
```

---

## Usage

Start writing in the terminal:

```bash
# Start a fresh document (shows the Zen splash welcome screen first)
basho

# Open or create a specific document
basho my_poem.txt
```

---

## Keyboard Shortcuts

Press **`Ctrl+H`** or **`F1`** inside the editor to toggle the help overlay.

| Key | Description |
|---|---|
| **`Arrows`** | Navigate document |
| **`Home` / `End`** | Go to start / end of a line |
| **`PageUp` / `PageDown`** | Scroll screen up / down |
| **`Tab`** | Insert soft tab (2 spaces) |
| **`Ctrl + S`** | Save current file |
| **`Ctrl + P`** or **`Esc`** | Command Mode. Opens command bar at the bottom (`/`) |
| **`Ctrl + H`** or **`F1`** | Toggle Help Overlay |
| **`Ctrl + Q`** or **`Ctrl + C`** | Exit editor (shows unsaved changes prompt if modified) |

---

## Slash Commands

Press **`Ctrl+P`** or **`Escape`** to open the command prompt:

- **`/save [filename]`** (or **`/w`**): Saves document to disk.
- **`/quit`** (or **`/q`**): Exits the editor.
- **`/help`**: Opens the help map.

---

## Customization

Your preferences are saved in the project's config file at:
`lib/settings/settings.json`

Supported properties:
- `margin` (number, default `12`): Side margin column spacing on wide terminals.
- `zenMode` (boolean, default `false`): Toggles Zen mode by default.
- `theme` (string, default `"green"`): Border theme color (`green` \| `cyan` \| `yellow` \| `blue` \| `magenta` \| `white` \| `gray`).
- `showHaikuOnStartup` (boolean, default `true`).
