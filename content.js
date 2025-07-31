(function () {
  "use strict";

  const DEFAULT_SPEEDS = [1, 1.5, 2, 2.5, 3, 3.25, 3.5, 4, 6, 8];
  const HIDE_DELAY = 3000;

  class SpeedControls extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: "open" });

      const styleLink = document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = chrome.runtime.getURL("styles.css");

      const container = document.createElement("div");
      container.className = "speed-button-wrapper";

      shadow.appendChild(styleLink);
      shadow.appendChild(container);

      this._container = container;
      this._speeds = DEFAULT_SPEEDS;
      this._videoSelector = "video";
    }

    connectedCallback() {
      this.renderButtons();
    }

    set speeds(value) {
      this._speeds = value;
      if (this.isConnected) {
        this.renderButtons();
      }
    }

    set videoSelector(value) {
      this._videoSelector = value;
      if (this.isConnected) {
        this.renderButtons();
      }
    }

    renderButtons() {
      this._container.innerHTML = "";

      for (const speed of this._speeds) {
        const btn = document.createElement("button");
        btn.className = "speed-button";
        btn.textContent = `${speed}x`;
        btn.onclick = () => {
          const video =
            document.querySelector(this._videoSelector) ||
            document.querySelector("video");
          if (video) {
            video.playbackRate = speed;
          }
        };
        this._container.appendChild(btn);
      }
    }
  }

  class DOMObserver {
    static waitForElement(selector, callback) {
      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          callback(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      const existingEl = document.querySelector(selector);
      if (existingEl) {
        observer.disconnect();
        callback(existingEl);
      }

      return observer;
    }
  }

  class StorageManager {
    static async getStoredSpeeds() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["speeds"], (result) => {
          let storedSpeeds = result.speeds;
          if (
            !storedSpeeds ||
            !Array.isArray(storedSpeeds) ||
            storedSpeeds.length === 0
          ) {
            storedSpeeds = DEFAULT_SPEEDS;
          }
          resolve(storedSpeeds);
        });
      });
    }
  }

  class PlatformDetector {
    constructor() {
      this.platforms = window.PLATFORMS;
    }

    detectPlatform() {
      for (const platform of this.platforms) {
        const { containerSelector } = platform;
        const videoElem = document.querySelector(containerSelector);

        if (videoElem) {
          return platform;
        }
      }

      return null;
    }
  }

  class DOMHelper {
    static insertAfter(referenceNode, newNode) {
      referenceNode.appendChild(newNode); 
    }
  }

  class SpeedControlsManager {
    constructor() {
      this.platformDetector = new PlatformDetector();
      this.onMouseOver = null;
      this.onMouseOut = null;
      this.onMouseMove = null;
      this.controls = null;
      this.mutationObserver = null;
      this.hideTimer = null;
    }

    async initialize() {
      try {
        window.customElements.define("speed-controls", SpeedControls);

        const speeds = await StorageManager.getStoredSpeeds();
        const platform = this.platformDetector.detectPlatform();

        if (platform) {
          console.info(`Platform detected ${platform?.name}`);
          this.attachSpeedControls(platform, speeds);
        } else {
          console.log("No supported platform detected");
        }
      } catch (error) {
        console.error("Failed to initialize speed controls:", error);
      }
    }

    attachSpeedControls(platform, speeds) {
      const { containerSelector, videoSelector, name } = platform;
      
      DOMObserver.waitForElement(containerSelector, (controls) => {
        const speedControls = document.createElement("speed-controls");
        speedControls.speeds = speeds;
        speedControls.videoSelector = videoSelector;

        DOMHelper.insertAfter(controls, speedControls);

        let isOverVideo = false;
        const updateVisibility = () => {
          speedControls.style.opacity = isOverVideo ? "1" : "0";
        };

        const resetHideTimer = () => {
          if (this.hideTimer) {
            clearTimeout(this.hideTimer);
          }
          this.hideTimer = setTimeout(() => {
            if (isOverVideo) {
              isOverVideo = false;
              updateVisibility();
            }
          }, HIDE_DELAY);
        };

        this.onMouseOver = () => {
          isOverVideo = true;
          updateVisibility();
          resetHideTimer();
        };
        
        this.onMouseOut = () => {
          isOverVideo = false;
          updateVisibility();
          if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
          }
        };

        this.onMouseMove = () => {
          if (isOverVideo) {
            resetHideTimer();
          } else {
            isOverVideo = true;
            updateVisibility();
            resetHideTimer();
          }
        };

        controls.addEventListener("mouseover", this.onMouseOver);
        controls.addEventListener("mouseout", this.onMouseOut);
        controls.addEventListener("mousemove", this.onMouseMove);

        this.controls = controls;

        this.mutationObserver = new MutationObserver(() => {
          if (!document.contains(controls)) {
            this.removeListeners();
          }
        });
        this.mutationObserver.observe(document, { childList: true, subtree: true });
      });
    }
    removeListeners() {
      if (this.controls && this.onMouseOver && this.onMouseOut && this.onMouseMove) {
        this.controls.removeEventListener("mouseover", this.onMouseOver);
        this.controls.removeEventListener("mouseout", this.onMouseOut);
        this.controls.removeEventListener("mousemove", this.onMouseMove);
        this.onMouseOver = null;
        this.onMouseOut = null;
        this.onMouseMove = null;
        console.log("Listeners removed");
      }
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
    }
  }

  const app = new SpeedControlsManager();
  app.initialize();
})();
