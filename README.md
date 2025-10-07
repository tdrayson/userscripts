## Userscripts by @tdrayson

Curated userscripts to enhance everyday web experiences. Built with attention to UX, isolation, and performance. Install with Tampermonkey (Chrome/Edge/Brave) or Greasemonkey/Violentmonkey.

### Install

- Install a userscript manager (recommended: Tampermonkey).
- Click a script filename below to view it, then use the userscript manager’s “Create a new script” and paste the contents, or host and install via raw URL.

Tip: Each script declares `@match` so it only runs on the intended sites.

---

### Slack Browser UX Enhancements (`slack.js`)

- **Description**: Keeps Slack in the browser (auto-clicks “open in browser” links) and prevents workspace links from opening in new tabs.
- **Matches**:
  - `https://*.slack.com/*`
  - `https://*.slack.com/ssb/redirect*`
  - `https://*.slack.com/archives/*`
- **Notes**: Lightweight mutation observer ensures behavior remains consistent as Slack navigates between views.

---

### Cineworld Film Filter Panel (`cineworld.js`)

- **Description**: Adds a polished floating panel to filter films (today-only toggle, minimum showtime, hide early showtimes). Handles SPA navigation and dynamic DOM updates.
- **Matches**:
  - `https://www.cineworld.co.uk/*`
- **Features**:
  - Today-only filter and minimum time with per-showtime hiding
  - Debounced re-application on DOM changes
  - URL change watcher for SPA routes

---

### Contact Finder Panel (`contact-finder.js`)

- **Description**: Scans pages for emails and phone numbers, deduplicates, normalises, and renders a clean panel with Copy, Email, and Call actions.
- **Matches**:
  - `*://*/*`
- **Features**:
  - Shadow DOM isolated UI
  - Clipboard copy with visual feedback
  - Email (`mailto:`) and phone (`tel:`) quick actions

---

### Discover Africa Image Updater (`discoverafrica.js`)

- **Description**: On dev/staging environments, rewrites `img[src]`, `srcset`, and CSS `background-image` URLs to live domains and highlights updates. Skips WordPress admin.
- **Matches**:
  - `https://da.loc/*`
  - `https://dsa.loc/*`
  - `http://localhost:*`
- **Notes**: Domain mappings inside the script determine the target live host.

---

### YouTube: True Duration and Time (`youtube.js`)

- **Description**: Shows true duration and current time adjusted for playback speed. Replaces the current-time display and updates as playback progresses.
- **Matches**:
  - `https://www.youtube.com/watch*`

---

### Development

- Scripts are plain JavaScript with clear structure and docblocks where relevant.
- Each script is self-contained and avoids leaking styles by using shadow DOM where appropriate.

### Attribution

- Some scripts in this repo are forks or adaptations of existing userscripts and utilities from the community. Where applicable, original authors and sources are credited in the script headers. Further improvements focus on UX polish, resilience, and maintainability.

### License

MIT
