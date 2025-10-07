// ==UserScript==
// @name         Slack Browser UX Enhancements
// @description  Keeps Slack in the browser and prevents workspace links opening new tabs
// @version      1.0.0
// @author       @tdrayson
// @namespace    https://github.com/tdrayson/userscripts
// @match        https://*.slack.com/*
// @match        https://*.slack.com/ssb/redirect*
// @match        https://*.slack.com/archives/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=slack.com
// @run-at       document-end
// @grant        none
// ==/UserScript==

/**
 * Userscript entrypoint.
 * Ensures Slack remains in the browser and prevents workspace links from
 * opening in new tabs. Sets up observers and initial actions.
 * @returns {void}
 */
(function () {
  'use strict';

  // Variations of Slack's "open in browser" copy we may encounter
  const textVariations = [
    'use slack in your browser',
    'open in browser',
    'continue in browser',
    'stay in browser',
    'open this link in your browser',
  ];

  let browserLinkClicked = false;

  /**
   * Forces workspace action links to open in the same tab by converting
   * target attributes from `_blank` to `_self` on matching links.
   * @returns {void}
   */
  function disableNewTabOpening() {
    const links = document.querySelectorAll('a.ss-c-workspace-detail__action');
    if (links.length === 0) return;
    links.forEach((link) => {
      if (link.target === '_blank') {
        link.target = '_self';
      }
    });
  }

  /**
   * Finds and clicks a link whose text suggests continuing to use Slack in the
   * browser, avoiding the native app redirection. Executes only once per page.
   * @returns {void}
   */
  function clickBrowserLink() {
    if (browserLinkClicked) return;
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const text = (link.textContent || '').toLowerCase().trim();
      if (!text) continue;
      if (textVariations.some((variant) => text.includes(variant))) {
        link.click();
        browserLinkClicked = true;
        break;
      }
    }
  }

  // Ensure existing DOM is handled on load for workspace links
  window.addEventListener('load', disableNewTabOpening);

  // Observe DOM changes once and run both behaviors on mutations
  const observer = new MutationObserver(() => {
    disableNewTabOpening();
    clickBrowserLink();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Attempt immediate click in case the link is already present
  clickBrowserLink();
})();
