// ==UserScript==
// @name         Slack Browser UX Enhancements
// @description  Keeps Slack in the browser and prevents workspace links opening new tabs
// @version      1.0.1
// @author       @tdrayson
// @namespace    https://github.com/tdrayson/userscripts
// @match        https://*.slack.com/*
// @match        https://*.slack.com/ssb/redirect*
// @match        https://*.slack.com/archives/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=slack.com
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const textVariations = [
    'use slack in your browser',
    'open in browser',
    'continue in browser',
    'stay in browser',
    'open this link in your browser',
  ];

  let browserLinkClicked = false;

  function disableNewTabOpening() {
    const links = document.querySelectorAll(
      'a.ss-c-workspace-detail__action, a.workspace-list-item',
    );

    if (links.length === 0) return;

    links.forEach((link) => {
      if (link.target === '_blank') {
        link.target = '_self';
      }
    });
  }

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

  window.addEventListener('load', disableNewTabOpening);

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

  clickBrowserLink();
})();
