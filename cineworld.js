// ==UserScript==
// @name         Cineworld Film Filter Panel
// @description  Filter Cineworld films by date and showtime
// @version      1.0.0
// @author       @tdrayson
// @namespace    https://github.com/tdrayson/userscripts
// @match        https://www.cineworld.co.uk/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cineworld.co.uk
// @grant        none
// ==/UserScript==

/**
 * Userscript entrypoint.
 * Mounts `CineworldFilterPanel` and wires observers/route listeners.
 * @returns {void}
 */
(function () {
  'use strict';

  // Default configuration; can be overridden by window.CINEWORLD_FILTER_CONFIG
  const DEFAULT_CONFIG = {
    minTime: '18:00', // e.g. '18:00'
    hideEarlyTimes: true,
    todayOnly: true,
  };

  /**
   * CineworldFilterPanel - Filter films showing today and by minimum showtime
   */
  class CineworldFilterPanel {
    constructor() {
      this.host = document.createElement('div');
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.icons = this.getIcons();
      // Merge runtime config if provided on page
      this.config = Object.assign(
        {},
        DEFAULT_CONFIG,
        typeof window !== 'undefined'
          ? window.CINEWORLD_FILTER_CONFIG || {}
          : {},
      );
      this.hideTodayOnly = this.config.todayOnly;
      this.hideEarlyTimes = this.config.hideEarlyTimes;
      this.minTime = this.config.minTime;
    }

    /**
     * Check if the page has the film list section
     */
    hasFilmList() {
      return document.querySelector('.qb-list-by-list') !== null;
    }

    /**
     * Initialize the panel
     */
    init() {
      if (!this.hasFilmList()) return;

      this.render();
      document.documentElement.appendChild(this.host);
      this.ensureGlobalStyles();
      this.syncUIWithState();
      this.bindEvents();
      this.applyFilters();
      this.setupUrlWatcher();
      this.observeFilmList();
    }

    /**
     * Render the filter panel
     */
    render() {
      const css = `
                  @keyframes panelIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                  :host { all: initial; }
                  .panel {
                      position: fixed;
                      top: 173.5px;
                      right: 24px;
                      width: 320px;
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
                      justify-content: center;
                      width: 32px;
                      height: 32px;
                      border-radius: 10px;
                      border: 1px solid #d0d7de;
                      background: #ffffff;
                      cursor: pointer;
                      padding: 0;
                  }
                  .btn:hover { background: #f5f7fa; }
                  .icon { width: 18px; height: 18px; display: block; }
                  .body { padding: 14px; }
                  .filterGroup { margin-bottom: 16px; }
                  .filterGroup:last-child { margin-bottom: 0; }
                  .filterLabel {
                      display: block;
                      font-size: 13px;
                      font-weight: 600;
                      margin-bottom: 8px;
                      color: #0b0f14;
                  }
                  .checkboxWrapper {
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      padding: 8px;
                      border-radius: 8px;
                      cursor: pointer;
                      user-select: none;
                  }
                  .checkboxWrapper:hover { background: #f5f7fa; }
                  .checkbox {
                      width: 18px;
                      height: 18px;
                      border: 2px solid #d0d7de;
                      border-radius: 4px;
                      cursor: pointer;
                      flex-shrink: 0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                  }
                  .checkbox.checked {
                      background: #2d5bff;
                      border-color: #2d5bff;
                  }
                  .checkboxLabel {
                      font-size: 14px;
                      color: #0b0f14;
                      cursor: pointer;
                  }
                  .timeInput {
                      height: 40px;
                      padding: 0 12px;
                      border: 1px solid #d0d7de;
                      border-radius: 8px;
                      font-size: 14px;
                      font-family: inherit;
                      color: #0b0f14;
                  }
                  .timeInput:focus {
                      outline: none;
                      border-color: #2d5bff;
                  }
                  .stats {
                      margin-top: 16px;
                      padding-top: 16px;
                      border-top: 1px solid #eef1f4;
                      font-size: 12px;
                      color: #667085;
                      text-align: center;
                  }
              `;

      const html = `
                  <style>${css}</style>
                  <div class="panel" role="dialog" aria-label="Film Filters">
                      <div class="header">
                          <div class="titleWrap">
                              <div class="badge">🎬</div>
                              <h3 class="title">Film Filters</h3>
                          </div>
                          <button class="btn js-close" aria-label="Close">${this.icons.close}</button>
                      </div>
                      <div class="body">
                          <div class="filterGroup">
                              <label class="filterLabel">Show Films</label>
                              <div class="checkboxWrapper js-toggle-today">
                                  <div class="checkbox js-checkbox-today">
                                      ${this.icons.check}
                                  </div>
                                  <span class="checkboxLabel">Today only</span>
                              </div>
                          </div>
                          <div class="filterGroup">
                              <label class="filterLabel" for="minTime">Minimum Time</label>
                              <input type="time" id="minTime" class="timeInput js-time-input" placeholder="e.g., 18:00">
                              <div class="checkboxWrapper js-toggle-hide-early" style="margin-top: 8px;">
                                  <div class="checkbox js-checkbox-hide-early">
                                      ${this.icons.check}
                                  </div>
                                  <span class="checkboxLabel">Hide times before minimum</span>
                              </div>
                          </div>
                          <div class="stats">
                              <span class="js-stats">Showing all films</span>
                          </div>
                      </div>
                  </div>
              `;

      this.shadow.innerHTML = html;
    }

    /**
     * Sync UI controls with current internal state
     */
    syncUIWithState() {
      const s = this.shadow;
      const timeInput = s.querySelector('.js-time-input');
      if (timeInput && this.minTime) {
        timeInput.value = this.minTime;
      }
      const todayCheckbox = s.querySelector('.js-checkbox-today');
      if (todayCheckbox) {
        todayCheckbox.classList.toggle('checked', !!this.hideTodayOnly);
      }
      const hideEarlyCheckbox = s.querySelector('.js-checkbox-hide-early');
      if (hideEarlyCheckbox) {
        hideEarlyCheckbox.classList.toggle('checked', !!this.hideEarlyTimes);
      }
    }

    /**
     * Inject global CSS for shared classes affecting page DOM
     */
    ensureGlobalStyles() {
      if (document.getElementById('cineworld-filter-global-styles')) return;
      const style = document.createElement('style');
      style.id = 'cineworld-filter-global-styles';
      style.textContent = `
          .qb-last-type-row { border-bottom: 1px solid transparent !important; margin-bottom: 0 !important; }
        `;
      document.head.appendChild(style);
    }

    /**
     * Observe DOM updates to the film list and re-apply filters
     */
    observeFilmList() {
      if (this.domObserver) return;
      const debouncedApply = this.debounce(() => this.applyFilters(), 120);
      this.domObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'childList') {
            debouncedApply();
            break;
          }
        }
      });
      this.domObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    /**
     * Setup URL change watcher to handle SPA navigation
     */
    setupUrlWatcher() {
      if (typeof window === 'undefined') return;
      // Avoid double-patching across multiple instances
      if (!window.__cineworldPatchedHistory) {
        const patch = (method) => {
          const orig = history[method];
          history[method] = function () {
            const result = orig.apply(this, arguments);
            window.dispatchEvent(new Event('cineworld:locationchange'));
            return result;
          };
        };
        patch('pushState');
        patch('replaceState');
        window.addEventListener('popstate', () => {
          window.dispatchEvent(new Event('cineworld:locationchange'));
        });
        window.addEventListener('hashchange', () => {
          window.dispatchEvent(new Event('cineworld:locationchange'));
        });
        window.__cineworldPatchedHistory = true;
      }

      this.lastRouteKey = this.getRouteKey();
      const onChange = this.debounce(() => this.handleLocationChange(), 120);
      window.addEventListener('cineworld:locationchange', onChange);
    }

    /**
     * Handle URL changes and re-apply filters when date/cinema changes
     */
    handleLocationChange() {
      const currentKey = this.getRouteKey();
      if (currentKey !== this.lastRouteKey) {
        this.lastRouteKey = currentKey;
        // Give the page a moment to swap content, then apply
        setTimeout(() => this.applyFilters(), 50);
      }
    }

    /**
     * Build a key from relevant URL parts to detect changes
     */
    getRouteKey() {
      const url = new URL(window.location.href);
      const at = url.searchParams.get('at') || '';
      const inCinema = url.searchParams.get('in-cinema') || '';
      return `${url.pathname}?at=${at}&in-cinema=${inCinema}`;
    }

    /**
     * Simple debounce helper
     */
    debounce(fn, wait) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
      const s = this.shadow;

      // Close button
      const closeBtn = s.querySelector('.js-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.host.remove());
      }

      // Today only checkbox
      const todayWrapper = s.querySelector('.js-toggle-today');
      const todayCheckbox = s.querySelector('.js-checkbox-today');
      if (todayWrapper && todayCheckbox) {
        todayWrapper.addEventListener('click', () => {
          this.hideTodayOnly = !this.hideTodayOnly;
          todayCheckbox.classList.toggle('checked', this.hideTodayOnly);
          this.applyFilters();
        });
      }

      // Time input
      const timeInput = s.querySelector('.js-time-input');
      if (timeInput) {
        timeInput.addEventListener('change', (e) => {
          this.minTime = e.target.value;
          this.applyFilters();
        });
      }

      // Hide early times checkbox
      const hideEarlyWrapper = s.querySelector('.js-toggle-hide-early');
      const hideEarlyCheckbox = s.querySelector('.js-checkbox-hide-early');
      if (hideEarlyWrapper && hideEarlyCheckbox) {
        hideEarlyWrapper.addEventListener('click', () => {
          this.hideEarlyTimes = !this.hideEarlyTimes;
          hideEarlyCheckbox.classList.toggle('checked', this.hideEarlyTimes);
          this.applyFilters();
        });
      }
    }

    /**
     * Apply filters to the film list
     */
    applyFilters() {
      const filmRows = document.querySelectorAll('.movie-row');
      let hiddenCount = 0;
      let totalCount = filmRows.length;

      filmRows.forEach((row) => {
        let shouldHide = false;

        // Check if film has only pre-order buttons (no immediate showtimes)
        const events = row.querySelector('.events');
        const hasPreOrderOnly =
          events &&
          events.querySelector('h4') &&
          events.querySelector('h4').textContent.includes('PRE-ORDER');
        const hasImmediateShowtimes =
          events &&
          events.querySelector('.btn-primary') &&
          !events.querySelector('h4');

        // Hide individual times earlier than the minimum when enabled
        if (events) {
          const timeButtons = events.querySelectorAll(
            '.btn-primary[aria-label]',
          );
          timeButtons.forEach((btn) => {
            const timeStr = btn.getAttribute('aria-label');
            if (this.hideEarlyTimes && this.minTime) {
              const isAfter =
                timeStr && this.isTimeAfter(timeStr, this.minTime);
              btn.style.display = isAfter ? '' : 'none';
            } else {
              btn.style.display = '';
            }
          });

          // Hide type rows that have no visible showtimes
          const typeRows = events.querySelectorAll('.type-row');
          typeRows.forEach((typeRow) => {
            if (this.hideEarlyTimes && this.minTime) {
              const visibleButtons = typeRow.querySelector(
                '.btn-primary[aria-label]:not([style*="display: none"])',
              );
              // If no visible showtime buttons remain, hide the entire row
              typeRow.style.display = visibleButtons ? '' : 'none';
            } else {
              // When not hiding early times, ensure all rows are visible
              typeRow.style.display = '';
            }
          });

          // Mark the last visible type-row with a special class
          const visibleTypeRows = Array.from(typeRows).filter(
            (row) => row.style.display !== 'none',
          );
          // Clear previous markers
          typeRows.forEach((row) => {
            row.classList.remove('qb-last-type-row');
          });
          const lastVisible = visibleTypeRows[visibleTypeRows.length - 1];
          if (lastVisible) {
            lastVisible.classList.add('qb-last-type-row');
          }
        }

        // Filter: Today only
        if (this.hideTodayOnly && hasPreOrderOnly && !hasImmediateShowtimes) {
          shouldHide = true;
        }

        // Filter: Minimum time
        if (!shouldHide && this.minTime && hasImmediateShowtimes) {
          const timeButtons = events.querySelectorAll(
            '.btn-primary[aria-label]',
          );
          const hasValidTime = Array.from(timeButtons).some((btn) => {
            const timeStr = btn.getAttribute('aria-label');
            return timeStr && this.isTimeAfter(timeStr, this.minTime);
          });

          if (!hasValidTime) {
            shouldHide = true;
          }
        }

        // Apply visibility
        row.style.display = shouldHide ? 'none' : '';
        if (shouldHide) hiddenCount++;
      });

      // Update stats
      this.updateStats(totalCount, hiddenCount);
    }

    /**
     * Check if a time string is after the minimum time
     */
    isTimeAfter(timeStr, minTime) {
      // Extract HH:MM from aria-label (e.g., "11:30")
      const match = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (!match) return false;

      const [, hours, minutes] = match;
      const filmTime = `${hours.padStart(2, '0')}:${minutes}`;

      return filmTime >= minTime;
    }

    /**
     * Update the statistics display
     */
    updateStats(total, hidden) {
      const stats = this.shadow.querySelector('.js-stats');
      if (!stats) return;

      const showing = total - hidden;
      if (hidden === 0) {
        stats.textContent = `Showing all ${total} films`;
      } else {
        stats.textContent = `Showing ${showing} of ${total} films`;
      }
    }

    /**
     * Get SVG icons
     */
    getIcons() {
      const close = `
                  <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                      <g fill="none">
                          <path d="M19 5L5 19M5 5L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                      </g>
                  </svg>
              `;

      const check = `
                  <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12.8333L9.375 17L19 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
              `;

      return { close, check };
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new CineworldFilterPanel().init();
    });
  } else {
    new CineworldFilterPanel().init();
  }
})();
