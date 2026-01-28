// ==UserScript==
// @name         Spark Email to Markdown
// @description  Extract Spark email threads to markdown for AI chat pasting
// @version      1.0.0
// @author       @tdrayson
// @namespace    https://github.com/tdrayson/userscripts
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sparkmailapp.com
// @match        https://app.sparkmailapp.com/web-share/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /**
   * SparkEmailExtractor renders a panel to extract and copy email threads as markdown.
   */
  class SparkEmailExtractor {
    constructor() {
      this.host = document.createElement('div');
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.icons = this.getIcons();
      this.copyFeedbackMs = 1500;
      this.emails = [];
      this.markdown = '';
      this.includePrompt = true;
      this.promptText = `---

  ## Instructions

  Please review the email thread above and draft a reply.

  ### Writing Guidelines

  - Use clear, direct language and avoid complex terminology
  - Aim for a Flesch reading score of 80 or higher
  - Use the active voice
  - Avoid adverbs
  - Avoid buzzwords and instead use plain English
  - Use jargon where relevant
  - Avoid being salesy or overly enthusiastic and instead express calm confidence
  - Maintain a friendly, but not informal tone
  - Use British English
  - Never use em dashes`;
    }

    /**
     * Entry point. Scans the page, renders the panel, and wires events.
     */
    init() {
      this.emails = this.extractEmails();
      if (!this.emails.length) return;
      this.markdown = this.toMarkdown(this.emails);
      this.render();
      document.documentElement.appendChild(this.host);
      this.bindEvents();
    }

    /**
     * Get the full output including prompt if enabled.
     * @returns {string}
     */
    getOutput() {
      if (this.includePrompt) {
        return this.markdown + '\n\n' + this.promptText;
      }
      return this.markdown;
    }

    /**
     * Extract all emails from the Spark thread page.
     * @returns {Array<{from: {name: string, email: string}, to: Array, cc: Array, date: string, subject: string, body: string}>}
     */
    extractEmails() {
      const emails = [];
      const subject =
        document
          .querySelector('.thread-header .subject')
          ?.textContent?.trim() || 'No Subject';

      // Get all top-level messages (not in history sections)
      const messages = document.querySelectorAll('.thread > article.message');

      messages.forEach((msg) => {
        const email = this.parseMessage(msg, subject);
        if (email) emails.push(email);
      });

      return emails;
    }

    /**
     * Parse a single message element.
     * @param {Element} msg
     * @param {string} subject
     * @returns {Object|null}
     */
    parseMessage(msg, subject) {
      // From
      const fromUser = msg.querySelector('.message-header .user.from-user');
      const fromName =
        fromUser?.querySelector('.name-full')?.textContent?.trim() || 'Unknown';
      const fromEmail =
        fromUser?.querySelector('.email')?.textContent?.trim() || '';

      // Date
      const timeEl = msg.querySelector('.message-header time.time-full');
      const date =
        timeEl?.textContent?.trim() || timeEl?.getAttribute('data-ts') || '';

      // Recipients
      const to = this.parseRecipients(msg, 'To');
      const cc = this.parseRecipients(msg, 'Cc');

      // Body - get the message-content but exclude the history section
      const contentEl = msg.querySelector('.message-content');
      if (!contentEl) return null;

      // Clone to avoid modifying the DOM
      const contentClone = contentEl.cloneNode(true);

      // Remove history sections from the clone
      contentClone
        .querySelectorAll('.message-history')
        .forEach((h) => h.remove());

      // Convert HTML to plain text with some formatting
      const body = this.htmlToText(contentClone);

      return {
        from: { name: fromName, email: fromEmail },
        to,
        cc,
        date,
        subject,
        body: body.trim(),
      };
    }

    /**
     * Parse recipients from a message.
     * @param {Element} msg
     * @param {string} type - 'To' or 'Cc'
     * @returns {Array<{name: string, email: string}>}
     */
    parseRecipients(msg, type) {
      const recipients = [];
      const groups = msg.querySelectorAll('.message-recipients .user-group');

      groups.forEach((group) => {
        const typeEl = group.querySelector('.type');
        if (typeEl?.textContent?.trim() === type) {
          group.querySelectorAll('.user').forEach((user) => {
            const name =
              user.querySelector('.name-full')?.textContent?.trim() || '';
            const email =
              user.querySelector('.email')?.textContent?.trim() || '';
            if (name || email) {
              recipients.push({ name, email });
            }
          });
        }
      });

      return recipients;
    }

    /**
     * Convert HTML content to plain text.
     * @param {Element} el
     * @returns {string}
     */
    htmlToText(el) {
      // Replace <br> with newlines
      el.querySelectorAll('br').forEach((br) => {
        br.replaceWith('\n');
      });

      // Replace block elements with double newlines
      el.querySelectorAll('p, div').forEach((block) => {
        block.prepend(document.createTextNode('\n'));
        block.append(document.createTextNode('\n'));
      });

      // Get text and clean up
      let text = el.textContent || '';

      // Normalise whitespace but preserve intentional line breaks
      text = text
        .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs
        .replace(/\n /g, '\n') // Remove space after newline
        .replace(/ \n/g, '\n') // Remove space before newline
        .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
        .trim();

      return text;
    }

    /**
     * Convert extracted emails to markdown format.
     * @param {Array} emails
     * @returns {string}
     */
    toMarkdown(emails) {
      if (!emails.length) return '';

      const subject = emails[0]?.subject || 'Email Thread';
      let md = `# ${subject}\n\n`;
      md += `*${emails.length} message${emails.length > 1 ? 's' : ''} in thread*\n\n`;
      md += '---\n\n';

      emails.forEach((email, index) => {
        md += `## Message ${index + 1}\n\n`;

        // Metadata
        const fromStr = email.from.email
          ? `**${email.from.name}** <${email.from.email}>`
          : `**${email.from.name}**`;
        md += `**From:** ${fromStr}\n`;

        if (email.to.length) {
          const toStr = email.to
            .map((r) => (r.email ? `${r.name} <${r.email}>` : r.name))
            .join(', ');
          md += `**To:** ${toStr}\n`;
        }

        if (email.cc.length) {
          const ccStr = email.cc
            .map((r) => (r.email ? `${r.name} <${r.email}>` : r.name))
            .join(', ');
          md += `**Cc:** ${ccStr}\n`;
        }

        if (email.date) {
          md += `**Date:** ${email.date}\n`;
        }

        md += '\n';

        // Body
        if (email.body) {
          md += email.body + '\n';
        }

        md += '\n---\n\n';
      });

      return md.trim();
    }

    /**
     * Update the preview content.
     */
    updatePreview() {
      const preview = this.shadow.querySelector('.preview');
      if (preview) {
        preview.textContent = this.getOutput();
      }

      // Update stats
      const output = this.getOutput();
      const charCount = output.length;
      const wordCount = output.split(/\s+/).filter(Boolean).length;

      const charStat = this.shadow.querySelector('.js-char-count');
      const wordStat = this.shadow.querySelector('.js-word-count');
      if (charStat) charStat.textContent = charCount.toLocaleString();
      if (wordStat) wordStat.textContent = wordCount.toLocaleString();
    }

    /**
     * Create the panel HTML and CSS.
     */
    render() {
      const subject = this.emails[0]?.subject || 'Email Thread';
      const messageCount = this.emails.length;
      const output = this.getOutput();
      const charCount = output.length;
      const wordCount = output.split(/\s+/).filter(Boolean).length;

      const css = `
          @keyframes panelIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          :host { all: initial; }
          .panel {
            position: fixed;
            top: 24px;
            right: 24px;
            width: 520px;
            max-height: 80vh;
            background: #ffffff;
            color: #0b0f14;
            border: 1px solid #e6e8eb;
            border-radius: 16px;
            box-shadow: 0 16px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12);
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
            z-index: 2147483647;
            animation: panelIn 160ms ease-out both;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            border-bottom: 1px solid #eef1f4;
            background: #fbfcfd;
            flex-shrink: 0;
          }
          .titleWrap { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
          .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: #eef3ff;
            color: #2d5bff;
            font-weight: 600;
            font-size: 14px;
            flex: 0 0 auto;
          }
          .title {
            font-size: 16px;
            font-weight: 700;
            margin: 0;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            height: 34px;
            padding: 0 14px;
            border-radius: 10px;
            border: 1px solid #d0d7de;
            background: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            line-height: 1;
            transition: all 120ms ease;
          }
          .btn:hover { background: #f5f7fa; }
          .btn.primary {
            background: #2d5bff;
            border-color: #2d5bff;
            color: #ffffff;
          }
          .btn.primary:hover { background: #1a4bef; }
          .btn.success {
            background: #22c55e;
            border-color: #22c55e;
            color: #ffffff;
          }
          .btn.icon { width: 34px; height: 34px; display: flex; padding: 0; justify-content: center; }
          .icon { width: 18px; height: 18px; display: block; }
          .body {
            padding: 14px 16px;
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .stats {
            display: flex;
            gap: 16px;
            padding: 10px 14px;
            background: #f9fafb;
            border-radius: 10px;
            flex-shrink: 0;
          }
          .stat {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .statLabel {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #667085;
            font-weight: 600;
          }
          .statValue {
            font-size: 15px;
            font-weight: 700;
            color: #0b0f14;
          }
          .toggleWrap {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: #f9fafb;
            border-radius: 10px;
            flex-shrink: 0;
          }
          .toggle {
            position: relative;
            width: 44px;
            height: 24px;
            flex-shrink: 0;
          }
          .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .toggleSlider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #d0d7de;
            transition: 0.2s;
            border-radius: 24px;
          }
          .toggleSlider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.2s;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          .toggle input:checked + .toggleSlider {
            background-color: #2d5bff;
          }
          .toggle input:checked + .toggleSlider:before {
            transform: translateX(20px);
          }
          .toggleLabel {
            font-size: 13px;
            font-weight: 500;
            color: #374151;
            cursor: pointer;
          }
          .previewWrap {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
          }
          .previewHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            flex-shrink: 0;
          }
          .previewTitle {
            font-size: 13px;
            font-weight: 600;
            color: #667085;
          }
          .preview {
            flex: 1;
            min-height: 0;
            max-height: 200px;
            padding: 12px;
            background: #f9fafb;
            border: 1px solid #eef1f4;
            border-radius: 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            line-height: 1.5;
            color: #374151;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .actions {
            display: flex;
            gap: 10px;
            padding-top: 4px;
            flex-shrink: 0;
          }
          .actions .btn { flex: 1; justify-content: center; }
          .toast {
            position: absolute;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background: #0b0f14;
            color: #ffffff;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            animation: fadeIn 120ms ease-out;
            display: none;
          }
          .toast.show { display: block; }
        `;

      const html = `
          <style>${css}</style>
          <div class="panel" role="dialog" aria-label="Email to Markdown">
            <div class="header">
              <div class="titleWrap">
                <div class="badge">${this.icons.email}</div>
                <h3 class="title">Email to Markdown</h3>
              </div>
              <button class="btn icon js-close" aria-label="Close">${this.icons.close}</button>
            </div>
            <div class="body">
              <div class="stats">
                <div class="stat">
                  <span class="statLabel">Messages</span>
                  <span class="statValue">${messageCount}</span>
                </div>
                <div class="stat">
                  <span class="statLabel">Words</span>
                  <span class="statValue js-word-count">${wordCount.toLocaleString()}</span>
                </div>
                <div class="stat">
                  <span class="statLabel">Characters</span>
                  <span class="statValue js-char-count">${charCount.toLocaleString()}</span>
                </div>
              </div>
              <div class="toggleWrap">
                <label class="toggle">
                  <input type="checkbox" class="js-prompt-toggle" ${this.includePrompt ? 'checked' : ''}>
                  <span class="toggleSlider"></span>
                </label>
                <label class="toggleLabel js-prompt-label">Include writing guidelines prompt</label>
              </div>
              <div class="previewWrap">
                <div class="previewHeader">
                  <span class="previewTitle">Preview</span>
                </div>
                <div class="preview">${this.escapeHtml(this.getOutput())}</div>
              </div>
              <div class="actions">
                <button class="btn primary js-copy">${this.icons.copy} Copy Markdown</button>
              </div>
            </div>
            <div class="toast js-toast">Copied to clipboard!</div>
          </div>
        `;

      this.shadow.innerHTML = html;
    }

    /**
     * Wire up click handlers.
     */
    bindEvents() {
      const s = this.shadow;

      const close = s.querySelector('.js-close');
      if (close) close.addEventListener('click', () => this.host.remove());

      const copyBtn = s.querySelector('.js-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          this.copyToClipboard(this.getOutput());
          this.showCopyFeedback(copyBtn);
        });
      }

      const promptToggle = s.querySelector('.js-prompt-toggle');
      const promptLabel = s.querySelector('.js-prompt-label');

      if (promptToggle) {
        promptToggle.addEventListener('change', (e) => {
          this.includePrompt = e.target.checked;
          this.updatePreview();
        });
      }

      if (promptLabel) {
        promptLabel.addEventListener('click', () => {
          if (promptToggle) {
            promptToggle.checked = !promptToggle.checked;
            this.includePrompt = promptToggle.checked;
            this.updatePreview();
          }
        });
      }
    }

    /**
     * Show copy feedback on button and toast.
     * @param {HTMLElement} btn
     */
    showCopyFeedback(btn) {
      const originalHTML = btn.innerHTML;
      btn.classList.add('success');
      btn.innerHTML = `${this.icons.tick} Copied!`;

      const toast = this.shadow.querySelector('.js-toast');
      if (toast) toast.classList.add('show');

      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = originalHTML;
        if (toast) toast.classList.remove('show');
      }, this.copyFeedbackMs);
    }

    /**
     * Copy text to clipboard.
     * @param {string} text
     */
    copyToClipboard(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
    }

    /**
     * Return inline SVGs.
     */
    getIcons() {
      const copy = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><g fill="none"><path d="M9 15C9 12.1716 9 10.7574 9.87868 9.87868C10.7574 9 12.1716 9 15 9L16 9C18.8284 9 20.2426 9 21.1213 9.87868C22 10.7574 22 12.1716 22 15V16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H15C12.1716 22 10.7574 22 9.87868 21.1213C9 20.2426 9 18.8284 9 16L9 15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.9999 9C16.9975 6.04291 16.9528 4.51121 16.092 3.46243C15.9258 3.25989 15.7401 3.07418 15.5376 2.90796C14.4312 2 12.7875 2 9.5 2C6.21252 2 4.56878 2 3.46243 2.90796C3.25989 3.07417 3.07418 3.25989 2.90796 3.46243C2 4.56878 2 6.21252 2 9.5C2 12.7875 2 14.4312 2.90796 15.5376C3.07417 15.7401 3.25989 15.9258 3.46243 16.092C4.51121 16.9528 6.04291 16.9975 9 16.9999" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>`;

      const tick = `<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M5 12.8333L9.375 17L19 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

      const email = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><g fill="none"><path d="M2 6L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L22 6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path><path d="M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path></g></svg>`;

      const close = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><g fill="none"><path d="M19 5L5 19M5 5L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>`;

      return { copy, tick, email, close };
    }

    /**
     * HTML escape.
     * @param {string} s
     * @returns {string}
     */
    escapeHtml(s) {
      return s.replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c],
      );
    }
  }

  // Wait for content to load then initialise
  const tryInit = () => {
    if (document.querySelector('.thread')) {
      new SparkEmailExtractor().init();
    } else {
      setTimeout(tryInit, 500);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
