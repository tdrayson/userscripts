// ==UserScript==
// @name         Youtube: True Duration and Time
// @description  Changes the video time based on playback speed.
// @version      1.0
// @author       tdrayson
// @namespace    https://github.com/tdrayson/userscripts
// @match        https://www.youtube.com/watch*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

/**
 * Userscript entrypoint.
 * Displays true duration/current time adjusted for playback speed on YouTube.
 * @returns {void}
 */
(function () {
  'use strict';

  var htmlVideoPlayer = document.querySelector('.html5-main-video');
  var ytdVideoPlayer = document.querySelector('ytd-player');
  var durationField = document.querySelector('.ytp-time-duration');
  var currentField = document.querySelector('.ytp-time-current');

  // Creating a custom current time field
  var customCurrentField = document.createElement('span');
  customCurrentField.id = 'userscript-time';
  customCurrentField.textContent = '0:00';
  currentField.parentNode.insertBefore(
    customCurrentField,
    currentField.nextSibling,
  );
  currentField.style.display = 'none';

  /**
   * Recompute and display video duration adjusted by current playback rate.
   * @returns {void}
   */
  function recomputePlaybackSpeed() {
    var videoDuration = htmlVideoPlayer.duration;
    var videoSpeed = htmlVideoPlayer.playbackRate;
    var finalSpeed = videoDuration / videoSpeed;
    var readableTime =
      finalSpeed < 3600
        ? new Date(finalSpeed * 1000).toISOString().substring(14, 19)
        : new Date(finalSpeed * 1000).toISOString().substr(11, 8);
    durationField.textContent =
      readableTime[0] !== '0' ? readableTime : readableTime.slice(1);
  }

  /**
   * Recompute and display current playback time adjusted by playback rate.
   * @returns {void}
   */
  function recomputeCurrentTime() {
    var videoCurtime = htmlVideoPlayer.currentTime;
    var videoSpeed = htmlVideoPlayer.playbackRate;
    var finalCurtime = videoCurtime / videoSpeed;
    var readableTime =
      finalCurtime < 3600
        ? new Date(finalCurtime * 1000).toISOString().substring(14, 19)
        : new Date(finalCurtime * 1000).toISOString().substr(11, 8);
    customCurrentField.textContent =
      readableTime[0] !== '0' ? readableTime : readableTime.slice(1);
  }

  htmlVideoPlayer.onratechange = recomputePlaybackSpeed;
  htmlVideoPlayer.addEventListener('canplay', recomputePlaybackSpeed);
  htmlVideoPlayer.addEventListener('timeupdate', recomputeCurrentTime);
})();
