// ==UserScript==
// @name         Increase speed on YouTube
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  add buttons for increase speed on youtube
// @author       Arhitector
// @grant        none
// @include      http*://*.youtube.com/*
// @include      http*://youtube.com/*
// @include      http*://*.youtu.be/*
// @include      http*://youtu.be/*
// ==/UserScript==

(function() {
    'use strict';
    const speeds = [1, 2, 2.5, 3, 5, 10];
    const createElement = (speed) => {
        var leftTextPos = (34 - speed.toString().replace('.','').length * 10)/2;
        var speedEl = document.createElement('button');
        speedEl.className = 'ytp-multicam-button ytp-button';
        speedEl.onclick = () => { document.getElementsByClassName("video-stream html5-main-video")[0].playbackRate = speed };
        speedEl.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><text x="${leftTextPos}" y="23" style="font-size:14px;text-decoration:underline;fill: #fff">${speed}x</text></svg>`;
        return speedEl;
    }
    const menuSettings = document.getElementsByClassName("ytp-right-controls");
    speeds.map((speed) => {
        menuSettings[0].prepend(createElement(speed));
    });
})();
