// ==UserScript==
// @name         Discover Africa Image Updater
// @description  Update and highlight image and background-image URLs from dev to live environments, including relative URLs, excluding wp-admin pages.
// @version      1.0
// @author       Taylor Drayson
// @namespace    https://github.com/tdrayson/userscripts
// @match        https://da.loc/*
// @match        https://dsa.loc/*
// @match        http://localhost:*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discoverafrica.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (window.location.pathname.includes('/wp-admin')) {
    return;
  }

  function updateAndHighlightImages() {
    const currentHost = window.location.host;

    const domainMappings = {
      'da.loc': 'https://www.discoverafrica.com',
      'dsa.loc': 'https://www.drivesouthafrica.com',
      'localhost:10085': 'https://staging.4x4hire.co.za/',
    };

    if (!domainMappings[currentHost]) {
      return;
    }

    const liveDomain = domainMappings[currentHost];

    const toLiveUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      const trimmed = url.trim();
      const httpsHost = `https://${currentHost}`;
      const httpHost = `http://${currentHost}`;
      if (trimmed.startsWith(httpsHost)) {
        return trimmed.replace(httpsHost, liveDomain);
      }
      if (trimmed.startsWith(httpHost)) {
        return trimmed.replace(httpHost, liveDomain);
      }
      if (trimmed.startsWith('//' + currentHost)) {
        return trimmed.replace('//' + currentHost, liveDomain);
      }
      if (trimmed.startsWith('/')) {
        return liveDomain + trimmed;
      }
      return trimmed;
    };

    const images = document.querySelectorAll('img');

    images.forEach((img) => {
      const imgSrc = img.getAttribute('src');
      if (imgSrc) {
        const newSrc = toLiveUrl(imgSrc);
        if (newSrc !== imgSrc) {
          img.src = newSrc;
          img.title = 'Image updated to Live Site';
        }
      }

      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const parts = srcset.split(',');
        const updated = parts.map((part) => {
          const p = part.trim();
          if (!p) return p;
          const lastSpace = p.lastIndexOf(' ');
          if (lastSpace > -1) {
            const url = p.slice(0, lastSpace);
            const descriptor = p.slice(lastSpace + 1);
            const newUrl = toLiveUrl(url);
            return newUrl + (descriptor ? ' ' + descriptor : '');
          } else {
            const newUrl = toLiveUrl(p);
            return newUrl;
          }
        });
        const newSrcset = updated.join(', ');
        if (newSrcset !== srcset) {
          img.setAttribute('srcset', newSrcset);
          img.title = 'Image srcset updated to Live Site';
        }
      }
    });

    const elements = document.querySelectorAll('*');

    elements.forEach((el) => {
      const bgImage = window.getComputedStyle(el).backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const match = bgImage.match(/url\((['"]?)(.*?)\1\)/);
        if (match && match[2]) {
          const bgUrl = match[2];
          const newBgUrl = toLiveUrl(bgUrl);
          if (newBgUrl !== bgUrl) {
            el.style.backgroundImage = `url("${newBgUrl}")`;
            el.title = 'Background image updated to Live Site';
          }
        }
      }
    });
  }

  window.addEventListener('DOMContentLoaded', updateAndHighlightImages);

  const observer = new MutationObserver(() => {
    updateAndHighlightImages();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
