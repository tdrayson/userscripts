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

### YouTube Playback Speed Duration Adjuster (`youtube-speed-adjusted-duration.user.js`)

- **Description**: Shows adjusted duration and finish time based on playback speed. Displays the effective duration when playing at speeds other than 1x, and calculates when the video will finish.
- **Matches**:
  - `https://www.youtube.com/*`
  - `https://m.youtube.com/*`
- **Features**:
  - Duration display adjusted for playback speed
  - Finish time calculation showing when video will end
  - Handles YouTube's SPA navigation

---

### Spark Email to Markdown (`spark.js`)

- **Description**: Extract Spark email threads to markdown format for AI chat pasting. Includes optional writing guidelines prompt.
- **Matches**:
  - `https://app.sparkmailapp.com/web-share/*`
- **Features**:
  - Extracts full email threads with metadata (from, to, cc, date, subject)
  - Converts HTML email content to clean markdown
  - Optional toggle to include writing guidelines prompt
  - Copy to clipboard with visual feedback
  - Preview panel with character/word counts

---

### Zoom Browser Redirect (`zoom.js`)

- **Description**: Automatically redirects Zoom meeting links to the browser-based join page, avoiding the desktop app.
- **Matches**:
  - `https://*.zoom.us/j/*`
- **Notes**: Preserves meeting ID and password parameters during redirect.

---

### Development

- Scripts are plain JavaScript with clear structure and docblocks where relevant.
- Each script is self-contained and avoids leaking styles by using shadow DOM where appropriate.

### Attribution

- Some scripts in this repo are forks or adaptations of existing userscripts and utilities from the community. Where applicable, original authors and sources are credited in the script headers. Further improvements focus on UX polish, resilience, and maintainability.

### License

MIT
