// ==UserScript==
// @name         Zoom Browser Redirect
// @namespace    zoom-browser-redirect
// @version      1.1.0
// @description  Redirect Zoom meeting links to browser join page
// @icon         https://www.google.com/s2/favicons?sz=64&domain=app.zoom.us
// @match        https://*.zoom.us/j/*
// @run-at       document-start
// ==/UserScript==

(function () {
  const currentUrl = new URL(window.location.href);

  const match = currentUrl.pathname.match(/\/j\/(\d+)/);

  if (!match) {
    return;
  }

  const meetingId = match[1];
  const password = currentUrl.searchParams.get('pwd');

  let targetUrl = `https://app.zoom.us/wc/${meetingId}/join`;

  if (password) {
    targetUrl += `?pwd=${password}`;
  }

  if (currentUrl.href !== targetUrl) {
    window.location.replace(targetUrl);
  }
})();
