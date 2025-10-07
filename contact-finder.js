// ==UserScript==
// @name         Contact Finder Panel
// @description  Find emails and phone numbers. Polished panel with copy, email, and call actions.
// @version      1.0.0
// @author       @tdrayson
// @namespace    https://github.com/tdrayson/userscripts
// @match        *://*/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /**
   * ContactFinderPanel renders a polished, isolated UI that lists emails and phone numbers found on the page.
   * It supports deduplication, normalisation, copy-to-clipboard with visual feedback, and quick actions.
   */
  class ContactFinderPanel {
    /**
     * Initialise class properties.
     */
    constructor() {
      this.host = document.createElement('div');
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.icons = this.getIcons();
      this.copyFeedbackMs = 1000;
    }

    /**
     * Entry point. Scans the page, renders the panel, and wires events.
     */
    init() {
      const { emails, phones } = this.scanPage();
      if (!emails.length && !phones.length) return;
      this.render({ emails, phones });
      document.documentElement.appendChild(this.host);
      this.bindEvents();
    }

    /**
     * Scan the page for emails and phone numbers from text and from existing anchors.
     * @returns {{emails: string[], phones: string[]}}
     */
    scanPage() {
      const text = document.body ? document.body.innerText : '';
      const anchors = Array.from(document.querySelectorAll('a[href]'));

      const emailRegex = /[a-zA-Z0-9._%+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex =
        /\b(?:\+?\d{1,3}[ \t.]*)?(?:\(?\d{2,5}\)?[ \t.]*){2,5}\d{2,6}\b/g;

      const emailText = text.match(emailRegex) || [];
      const emailLinks = anchors
        .filter((a) =>
          a.getAttribute('href').toLowerCase().startsWith('mailto:'),
        )
        .map((a) => {
          const raw = a.getAttribute('href').slice(7);
          const addr = decodeURIComponent(raw.split('?')[0] || raw).trim();
          return addr;
        });

      const phoneText = (text.match(phoneRegex) || []).map((s) =>
        s.replace(/\s+/g, ' ').trim(),
      );
      const phoneLinks = anchors
        .filter((a) => a.getAttribute('href').toLowerCase().startsWith('tel:'))
        .map((a) => decodeURIComponent(a.getAttribute('href').slice(4)).trim());

      const emails = this.dedupeEmails([...emailText, ...emailLinks]);
      const phones = this.dedupePhonesAndFormat([...phoneText, ...phoneLinks]);

      return { emails, phones };
    }

    /**
     * Create the full panel HTML and CSS inside the shadow root using a single template literal.
     * @param {{emails: string[], phones: string[]}} data
     */
    render(data) {
      const { emails, phones } = data;
      const total = emails.length + phones.length;

      const css = `
        @keyframes panelIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
        :host { all: initial; }
        .panel {
          position: fixed;
          top: 24px;
          right: 24px;
          width: 460px;
          max-height: 72vh;
          background: #ffffff;
          color: #0b0f14;
          border: 1px solid #e6e8eb;
          border-radius: 16px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12);
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden;
          z-index: 2147483647;
          animation: panelIn 160ms ease-out both;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid #eef1f4;
          background: #fbfcfd;
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
          height: 32px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
        }
        .btn:hover { background: #f5f7fa; }
        .btn.icon { width: 32px; height: 32px; display: flex; padding: 0; justify-content: center; }
        .icon { width: 18px; height: 18px; display: block; }
        .body { padding: 10px 14px 14px 14px; max-height: calc(72vh - 56px); overflow: auto; }
        .section { margin-top: 10px; border: 1px solid #eef1f4; border-radius: 12px; overflow: hidden; }
        .sectionHeader { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f9fafb; border-bottom: 1px solid #eef1f4; }
        .sectionTitle { margin: 0; font-size: 14px; font-weight: 700; }
        .count { font-size: 12px; color: #667085; }
        .list { list-style: none; margin: 0; padding: 6px 8px; }
        .row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; padding: 8px 6px; border-bottom: 1px dashed #eef1f4; }
        .row:last-child { border-bottom: 0; }
        .item { font-size: 13px; color: #0b0f14; word-break: break-word; }
        .controls { display: inline-flex; gap: 6px; }
        .ctlBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 120ms ease, border-color 120ms ease;
        }
        .ctlBtn:hover { background: #f5f7fa; }
        .ctlBtn.copied { background: #22c55e; border-color: #22c55e; }
        .ctlBtn.copied svg path { stroke: #0b0f14; }
      `;

      const emailSection = emails.length
        ? `
        <section class="section">
          <div class="sectionHeader">
            <h4 class="sectionTitle">Emails</h4>
            <div class="count">${emails.length}</div>
          </div>
          <ul class="list">
            ${emails
              .map(
                (e) => `
              <li class="row">
                <div class="item">${this.escapeHtml(e)}</div>
                <div class="controls">
                  <button class="ctlBtn js-copy" data-value="${this.escapeAttr(
                    e,
                  )}" title="Copy">${this.icons.copy}</button>
                  <button class="ctlBtn js-email" data-value="${this.escapeAttr(
                    e,
                  )}" title="Email">${this.icons.email}</button>
                </div>
              </li>
            `,
              )
              .join('')}
          </ul>
        </section>
      `
        : '';

      const phoneSection = phones.length
        ? `
  <section class="section">
    <div class="sectionHeader">
      <h4 class="sectionTitle">Phone numbers</h4>
      <div class="count">${phones.length}</div>
    </div>
    <ul class="list">
      ${phones
        .map(
          (p) => `
        <li class="row">
          <div class="item">${this.escapeHtml(p.display)}</div>
          <div class="controls">
            <button class="ctlBtn js-copy" data-value="${this.escapeAttr(
              p.value,
            )}" title="Copy">${this.icons.copy}</button>
            <button class="ctlBtn js-phone" data-value="${this.escapeAttr(
              p.value,
            )}" title="Call">${this.icons.phone}</button>
          </div>
        </li>
      `,
        )
        .join('')}
    </ul>
  </section>
`
        : '';

      const html = `
        <style>${css}</style>
        <div class="panel" role="dialog" aria-label="Contact data found">
          <div class="header">
            <div class="titleWrap">
              <div class="badge">${total}</div>
              <h3 class="title">Contact data found</h3>
            </div>
            <button class="btn icon js-close" aria-label="Close">${this.icons.close}</button>
          </div>
          <div class="body">
            ${emailSection}
            ${phoneSection}
          </div>
        </div>
      `;

      this.shadow.innerHTML = html;
    }

    /**
     * Wire up click handlers for Close, Copy, Email, and Phone buttons.
     */
    bindEvents() {
      const s = this.shadow;

      const close = s.querySelector('.js-close');
      if (close) close.addEventListener('click', () => this.host.remove());

      s.querySelectorAll('.js-copy').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const val = e.currentTarget.getAttribute('data-value') || '';
          this.copyToClipboard(val);
          this.flipToTick(e.currentTarget);
        });
      });

      s.querySelectorAll('.js-email').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const val = e.currentTarget.getAttribute('data-value') || '';
          window.location.href = `mailto:${val}`;
        });
      });

      s.querySelectorAll('.js-phone').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const val = e.currentTarget.getAttribute('data-value') || '';
          window.location.href = `tel:${val}`;
        });
      });
    }

    /**
     * Replace the button icon with a tick and a green background, then restore it after a timeout.
     * @param {HTMLElement} buttonEl
     */
    flipToTick(buttonEl) {
      const original = buttonEl.innerHTML;
      buttonEl.classList.add('copied');
      buttonEl.innerHTML = this.icons.tick;
      setTimeout(() => {
        buttonEl.classList.remove('copied');
        buttonEl.innerHTML = original;
      }, this.copyFeedbackMs);
    }

    /**
     * Copy a string to the clipboard with graceful fallback.
     * @param {string} text
     */
    copyToClipboard(text) {
      const write = () => navigator.clipboard.writeText(text);
      if (navigator.clipboard && navigator.permissions) {
        navigator.permissions.query({ name: 'clipboard-write' }).finally(write);
      } else if (navigator.clipboard) {
        write();
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
    }

    /**
     * Deduplicate email list, case-insensitive.
     * Always return emails in lowercase.
     * @param {string[]} arr
     * @returns {string[]}
     */
    dedupeEmails(arr) {
      const seen = new Set();
      const out = [];
      for (const v of arr) {
        if (!v) continue;
        const lower = v.trim().toLowerCase();
        if (!lower) continue;
        if (seen.has(lower)) continue;
        seen.add(lower);
        out.push(lower);
      }
      return out;
    }

    /**
     * Deduplicate phone numbers treating +44, 0-leading, and bare UK forms as the same.
     * Prefer a version that includes a leading "+" if any variant has it.
     * Return objects: { display, value } where value is compact for tel:, display is spaced.
     * @param {string[]} arr
     * @returns {{display:string, value:string}[]}
     */
    dedupePhonesAndFormat(arr) {
      const digitsOnly = (s) => s.replace(/\D/g, '');

      // Map various UK representations to a single canonical national key (leading 0)
      const toUkNationalKey = (d) => {
        if (!d) return '';
        if (d.startsWith('44')) return '0' + d.slice(2); // +44XXXXXXXXXX -> 0XXXXXXXXXX
        if (d.startsWith('0')) return d; // already national
        if (d.startsWith('7') && d.length === 10) return '0' + d; // mobile without 0
        if (d.startsWith('800') && d.length === 10) return '0' + d; // 800 without 0
        return d; // fallback
      };

      const preferPlus = (a, b) => {
        const aPlus = /^\s*(\+|00)/.test(a);
        const bPlus = /^\s*(\+|00)/.test(b);
        if (aPlus && !bPlus) return a;
        if (!aPlus && bPlus) return b;
        return a.length <= b.length ? a : b;
      };

      const seen = new Map(); // key -> chosen raw string
      for (let raw of arr) {
        if (!raw) continue;
        raw = raw.replace(/\s+/g, ' ').trim();
        if (raw.startsWith('00')) raw = '+' + raw.slice(2);

        const d = digitsOnly(raw);
        if (d.length < 10 || d.length > 16) continue;

        const key = toUkNationalKey(d);
        const existing = seen.get(key);
        if (!existing) {
          seen.set(key, raw);
        } else {
          seen.set(key, preferPlus(existing, raw));
        }
      }

      const out = [];
      for (const [key, chosen] of seen.entries()) {
        const hasPlus = /^\+/.test(chosen);
        const d = digitsOnly(chosen);
        // Build compact tel value: prefer +44 form when chosen had plus, else national 0-leading key
        const value = hasPlus && d.startsWith('44') ? '+' + d : key;
        const display = this.formatPhoneDisplay(value);
        out.push({ display, value });
      }
      return out;
    }

    /**
     * Format a compact value for display.
     * Examples:
     *   "+448007720022" -> "+44 800 772 0022"
     *   "08007720022"   -> "0800 772 0022"
     *   "+447920365317" -> "+44 792 036 5317"
     *   "07920365317"   -> "0792 036 5317"
     * General rule:
     *   If +44... show "+44 " then group remaining 10 digits as 3+3+4, keeping "800" together.
     *   If national 0-leading and starts with "0800", show "0800 xxx xxxx".
     *   Otherwise avoid a lone leading "0" by making the first group 4 digits, then 3+4.
     * @param {string} compact
     * @returns {string}
     */
    formatPhoneDisplay(compact) {
      let s = compact.trim();
      const hasPlus = s.startsWith('+');
      const d = s.replace(/\D/g, '');

      if (!d) return s;

      // +44 national format
      if (hasPlus && d.startsWith('44') && d.length >= 12) {
        const nat = d.slice(2); // 10 digits
        const first3 = nat.slice(0, 3);
        const mid3 = nat.slice(3, 6);
        const last4 = nat.slice(6);
        return `+44 ${first3} ${mid3} ${last4}`;
      }

      // National 0-leading
      if (!hasPlus && d.startsWith('0') && d.length >= 11) {
        const nat = d; // already national
        // Special-case freephone 0800
        if (nat.startsWith('0800') && nat.length >= 11) {
          const a = nat.slice(0, 4);
          const b = nat.slice(4, 7);
          const c = nat.slice(7, 11);
          return `${a} ${b} ${c}`;
        }
        // Generic UK-friendly: avoid a lone "0" group by taking first 4, then 3, then 4
        const a = nat.slice(0, 4);
        const b = nat.slice(4, 7);
        const c = nat.slice(7);
        if (c.length) return `${a} ${b} ${c}`;
        return `${a} ${b}`.trim();
      }

      // Fallback: group as 3+3+4 on the last 10 digits, prefix "+" if present
      const last10 = d.slice(-10);
      const pre = d.slice(0, -10);
      const g1 = last10.slice(0, 3);
      const g2 = last10.slice(3, 6);
      const g3 = last10.slice(6);
      const lead = hasPlus ? '+' : pre ? pre : '';
      return `${lead}${lead ? ' ' : ''}${g1} ${g2} ${g3}`.trim();
    }

    /**
     * Return inline SVGs used in the UI.
     * @returns {{copy:string, tick:string, phone:string, email:string, close:string}}
     */
    getIcons() {
      const copy = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none">
            <path d="M9 15C9 12.1716 9 10.7574 9.87868 9.87868C10.7574 9 12.1716 9 15 9L16 9C18.8284 9 20.2426 9 21.1213 9.87868C22 10.7574 22 12.1716 22 15V16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H15C12.1716 22 10.7574 22 9.87868 21.1213C9 20.2426 9 18.8284 9 16L9 15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.9999 9C16.9975 6.04291 16.9528 4.51121 16.092 3.46243C15.9258 3.25989 15.7401 3.07418 15.5376 2.90796C14.4312 2 12.7875 2 9.5 2C6.21252 2 4.56878 2 3.46243 2.90796C3.25989 3.07417 3.07418 3.25989 2.90796 3.46243C2 4.56878 2 6.21252 2 9.5C2 12.7875 2 14.4312 2.90796 15.5376C3.07417 15.7401 3.25989 15.9258 3.46243 16.092C4.51121 16.9528 6.04291 16.9975 9 16.9999" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </g>
        </svg>
      `;
      const tick = `
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path opacity="1" d="M5 12.8333L9.375 17L19 7" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      const phone = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none">
            <path d="M9.1585 5.71223L8.75584 4.80625C8.49256 4.21388 8.36092 3.91768 8.16405 3.69101C7.91732 3.40694 7.59571 3.19794 7.23592 3.08785C6.94883 3 6.6247 3 5.97645 3C5.02815 3 4.554 3 4.15597 3.18229C3.68711 3.39702 3.26368 3.86328 3.09497 4.3506C2.95175 4.76429 2.99278 5.18943 3.07482 6.0397C3.94815 15.0902 8.91006 20.0521 17.9605 20.9254C18.8108 21.0075 19.236 21.0485 19.6496 20.9053C20.137 20.7366 20.6032 20.3131 20.818 19.8443C21.0002 19.4462 21.0002 18.9721 21.0002 18.0238C21.0002 17.3755 21.0002 17.0514 20.9124 16.7643C20.8023 16.4045 20.5933 16.0829 20.3092 15.8362C20.0826 15.6393 19.7864 15.5077 19.194 15.2444L18.288 14.8417C17.6465 14.5566 17.3257 14.4141 16.9998 14.3831C16.6878 14.3534 16.3733 14.3972 16.0813 14.5109C15.7762 14.6297 15.5066 14.8544 14.9672 15.3038C14.4304 15.7512 14.162 15.9749 13.834 16.0947C13.5432 16.2009 13.1588 16.2403 12.8526 16.1951C12.5071 16.1442 12.2426 16.0029 11.7135 15.7201C10.0675 14.8405 9.15977 13.9328 8.28011 12.2867C7.99738 11.7577 7.85602 11.4931 7.80511 11.1477C7.75998 10.8414 7.79932 10.457 7.90554 10.1663C8.02536 9.83828 8.24905 9.56986 8.69643 9.033C9.14586 8.49368 9.37058 8.22402 9.48939 7.91891C9.60309 7.62694 9.64686 7.3124 9.61719 7.00048C9.58618 6.67452 9.44362 6.35376 9.1585 5.71223Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
          </g>
        </svg>
      `;
      const email = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none">
            <path d="M2 6L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L22 6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
            <path d="M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
          </g>
        </svg>
      `;
      const close = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none">
            <path d="M19 5L5 19M5 5L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </g>
        </svg>
      `;
      return { copy, tick, phone, email, close };
    }

    /**
     * HTML escape for text content.
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
          }[c]),
      );
    }

    /**
     * HTML attribute escape.
     * @param {string} s
     * @returns {string}
     */
    escapeAttr(s) {
      return this.escapeHtml(s).replace(/"/g, '&quot;');
    }
  }

  new ContactFinderPanel().init();
})();
