// ==UserScript==
// @name         YouTube Playback Speed Duration Adjuster
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Shows adjusted duration and finish time based on playback speed
// @author       You
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  let currentSpeed = 1.0;
  let observer = null;
  let isUpdating = false;
  let speedCheckInterval = null;
  let videoEventListenersAdded = false;
  let currentVideo = null;
  let retryCount = 0;
  const MAX_RETRIES = 10;

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  function getAdjustedDuration(originalDuration, speed) {
    return originalDuration / speed;
  }

  function getFinishTime(remainingSeconds) {
    const now = new Date();
    // Round remaining seconds to nearest minute
    const roundedMinutes = Math.round(remainingSeconds / 60);
    const finishTime = new Date(now.getTime() + roundedMinutes * 60 * 1000);

    let hours = finishTime.getHours();
    const minutes = finishTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  function updateDurationDisplay() {
    // Prevent recursion
    if (isUpdating) {
      return;
    }

    isUpdating = true;

    try {
      const video = document.querySelector('video');
      if (!video || !video.duration) {
        return;
      }

      const duration = video.duration;
      const adjustedDuration = getAdjustedDuration(duration, currentSpeed);

      // Disconnect observer to prevent triggering during updates
      if (observer) {
        observer.disconnect();
      }

      // Update duration in player controls
      const durationDisplay = document.querySelector('.ytp-time-duration');
      if (durationDisplay) {
        const originalTime = formatTime(duration);
        const adjustedTime = formatTime(adjustedDuration);

        // Calculate remaining time (from current position to end)
        const currentTime = video.currentTime || 0;
        const remainingDuration = duration - currentTime;
        const adjustedRemainingDuration = getAdjustedDuration(
          remainingDuration,
          currentSpeed,
        );

        // Get finish time
        const finishTime = getFinishTime(adjustedRemainingDuration);

        // Build the display text with finish time
        const baseText = currentSpeed !== 1.0 ? adjustedTime : originalTime;
        const targetText = `${baseText} (${finishTime})`;
        const targetTitle =
          currentSpeed !== 1.0
            ? `Adjusted for ${currentSpeed}x speed (Original: ${originalTime})`
            : '';

        if (durationDisplay.textContent !== targetText) {
          durationDisplay.textContent = targetText;
          durationDisplay.title = targetTitle;
        }
      }

      // Update progress bar hover preview times
      const progressBar = document.querySelector('.ytp-progress-bar');
      if (progressBar) {
        progressBar.setAttribute('data-speed-adjusted', currentSpeed);
      }

      // Reconnect observer after a small delay to avoid immediate re-trigger
      setTimeout(() => {
        reconnectObserver();
      }, 50);
    } finally {
      isUpdating = false;
    }
  }

  function reconnectObserver() {
    if (!observer) return;

    const playerContainer = document.querySelector('.html5-video-player');
    if (playerContainer) {
      observer.observe(playerContainer, {
        childList: true,
        subtree: true,
      });
    }
  }

  function cleanup() {
    // Clear intervals
    if (speedCheckInterval) {
      clearInterval(speedCheckInterval);
      speedCheckInterval = null;
    }

    // Disconnect observer
    if (observer) {
      observer.disconnect();
    }

    // Reset state
    videoEventListenersAdded = false;
    currentVideo = null;
    retryCount = 0;
  }

  function monitorSpeedChanges() {
    const video = document.querySelector('video');
    if (!video) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(monitorSpeedChanges, 500);
      }
      return;
    }

    // If we already set up listeners for this video element, don't do it again
    if (currentVideo === video && videoEventListenersAdded) {
      return;
    }

    // Clean up any existing listeners/intervals
    cleanup();

    currentVideo = video;
    retryCount = 0;

    // Initial update
    currentSpeed = video.playbackRate;
    updateDurationDisplay();

    // Monitor for speed changes (fallback)
    speedCheckInterval = setInterval(() => {
      if (video.playbackRate !== currentSpeed) {
        currentSpeed = video.playbackRate;
        updateDurationDisplay();
      }
    }, 100);

    // Listen for ratechange event
    const handleRateChange = () => {
      currentSpeed = video.playbackRate;
      updateDurationDisplay();
    };

    // Update when video metadata loads
    const handleMetadataLoad = () => {
      currentSpeed = video.playbackRate;
      updateDurationDisplay();
    };

    // Handle play/pause events to update finish time
    const handlePlayPause = () => {
      updateDurationDisplay();
    };

    // Handle seeking to update finish time when user scrubs
    const handleSeeked = () => {
      updateDurationDisplay();
    };

    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('loadedmetadata', handleMetadataLoad);
    video.addEventListener('play', handlePlayPause);
    video.addEventListener('pause', handlePlayPause);
    video.addEventListener('seeked', handleSeeked);
    videoEventListenersAdded = true;

    // Observe DOM changes for duration display element (in case YouTube updates it)
    observer = new MutationObserver((mutations) => {
      // Only trigger if there are actual childList changes to the duration element
      const hasDurationChanges = mutations.some((m) => {
        return (
          m.target.classList &&
          (m.target.classList.contains('ytp-time-duration') ||
            m.target.closest('.ytp-time-duration'))
        );
      });

      if (hasDurationChanges) {
        updateDurationDisplay();
      }
    });

    const playerContainer = document.querySelector('.html5-video-player');
    if (playerContainer) {
      observer.observe(playerContainer, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Wait for YouTube to load and start monitoring
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorSpeedChanges);
  } else {
    monitorSpeedChanges();
  }

  // Handle YouTube's single-page app navigation using yt-navigate-finish event
  // This is much more efficient than watching the entire body for mutations
  document.addEventListener('yt-navigate-finish', () => {
    if (location.href.includes('/watch')) {
      setTimeout(monitorSpeedChanges, 500);
    }
  });
})();
