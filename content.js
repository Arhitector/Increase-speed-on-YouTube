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
      this._currentSpeed = 1;
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

    setSpeed(speed) {
      console.log(`[SpeedControls] Setting speed to: ${speed}`);
      const video =
        document.querySelector(this._videoSelector) ||
        document.querySelector("video");
      if (video) {
        console.log(`[SpeedControls] Video found, current rate: ${video.playbackRate}`);
        video.playbackRate = speed;
        this._currentSpeed = speed;
        this.updateActiveButton();
        console.log(`[SpeedControls] Speed set successfully to: ${speed}`);
      } else {
        console.error("[SpeedControls] Video element not found");
      }
    }

    updateActiveButton() {
      const buttons = this._container.querySelectorAll(".speed-button");
      buttons.forEach((btn) => {
        const btnSpeed = parseFloat(btn.textContent);
        if (Math.abs(btnSpeed - this._currentSpeed) < 0.01) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    getCurrentSpeedIndex() {
      const sortedSpeeds = [...this._speeds].sort((a, b) => a - b);
      let closestIndex = 0;
      let minDiff = Math.abs(sortedSpeeds[0] - this._currentSpeed);
      
      for (let i = 1; i < sortedSpeeds.length; i++) {
        const diff = Math.abs(sortedSpeeds[i] - this._currentSpeed);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
      
      return closestIndex;
    }

    increaseSpeed() {
      const sortedSpeeds = [...this._speeds].sort((a, b) => a - b);
      const currentIndex = this.getCurrentSpeedIndex();
      const nextIndex = Math.min(currentIndex + 1, sortedSpeeds.length - 1);
      console.log(`[SpeedControls] Increase speed: current=${this._currentSpeed}, currentIndex=${currentIndex}, nextIndex=${nextIndex}, nextSpeed=${sortedSpeeds[nextIndex]}`);
      this.setSpeed(sortedSpeeds[nextIndex]);
    }

    decreaseSpeed() {
      const sortedSpeeds = [...this._speeds].sort((a, b) => a - b);
      const currentIndex = this.getCurrentSpeedIndex();
      const prevIndex = Math.max(currentIndex - 1, 0);
      console.log(`[SpeedControls] Decrease speed: current=${this._currentSpeed}, currentIndex=${currentIndex}, prevIndex=${prevIndex}, prevSpeed=${sortedSpeeds[prevIndex]}`);
      this.setSpeed(sortedSpeeds[prevIndex]);
    }

    renderButtons() {
      this._container.innerHTML = "";

      for (const speed of this._speeds) {
        const btn = document.createElement("button");
        btn.className = "speed-button";
        btn.textContent = `${speed}x`;
        btn.onclick = () => {
          this.setSpeed(speed);
        };
        this._container.appendChild(btn);
      }
      
      this.updateActiveButton();
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

    static async getKeyboardShortcuts() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["decreaseKey", "increaseKey"], (result) => {
          const shortcuts = {
            decreaseKey: result.decreaseKey || "F7",
            increaseKey: result.increaseKey || "F9"
          };
          console.log("[StorageManager] Loaded keyboard shortcuts:", shortcuts);
          resolve(shortcuts);
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
      this.onKeyDown = null;
      this.controls = null;
      this.speedControls = null;
      this.mutationObserver = null;
      this.hideTimer = null;
      this.decreaseKey = "F7";
      this.increaseKey = "F9";
    }

    async initialize() {
      try {
        console.log("[SpeedControlsManager] Initializing...");
        window.customElements.define("speed-controls", SpeedControls);

        const speeds = await StorageManager.getStoredSpeeds();
        console.log("[SpeedControlsManager] Loaded speeds:", speeds);
        
        const shortcuts = await StorageManager.getKeyboardShortcuts();
        this.decreaseKey = shortcuts.decreaseKey;
        this.increaseKey = shortcuts.increaseKey;
        console.log("[SpeedControlsManager] Keyboard shortcuts set:", {
          decreaseKey: this.decreaseKey,
          increaseKey: this.increaseKey
        });

        const platform = this.platformDetector.detectPlatform();

        if (platform) {
          console.info(`[SpeedControlsManager] Platform detected: ${platform?.name}`);
          this.attachSpeedControls(platform, speeds);
          this.setupKeyboardShortcuts();
        } else {
          console.log("[SpeedControlsManager] No supported platform detected");
        }
      } catch (error) {
        console.error("[SpeedControlsManager] Failed to initialize speed controls:", error);
      }
    }

    setupKeyboardShortcuts() {
      console.log("[SpeedControlsManager] Setting up keyboard shortcuts");
      console.log(`[SpeedControlsManager] Decrease key: "${this.decreaseKey}", Increase key: "${this.increaseKey}"`);
      
      this.onKeyDown = (e) => {
        console.log(`[SpeedControlsManager] Key pressed: "${e.key}", code: "${e.code}"`);
        
        if (this.speedControls) {
          if (e.key === this.decreaseKey) {
            console.log("[SpeedControlsManager] Decrease key matched! Calling decreaseSpeed()");
            e.preventDefault();
            this.speedControls.decreaseSpeed();
          } else if (e.key === this.increaseKey) {
            console.log("[SpeedControlsManager] Increase key matched! Calling increaseSpeed()");
            e.preventDefault();
            this.speedControls.increaseSpeed();
          } else {
            console.log(`[SpeedControlsManager] No match. Expected decrease: "${this.decreaseKey}" or increase: "${this.increaseKey}"`);
          }
        } else {
          console.error("[SpeedControlsManager] speedControls is null!");
        }
      };

      document.addEventListener("keydown", this.onKeyDown);
      console.log("[SpeedControlsManager] Keyboard event listener added");
    }

    attachSpeedControls(platform, speeds) {
      const { containerSelector, videoSelector, name } = platform;
      console.log(`[SpeedControlsManager] Attaching speed controls for platform: ${name}`);
      console.log(`[SpeedControlsManager] Container selector: ${containerSelector}, Video selector: ${videoSelector}`);
      
      DOMObserver.waitForElement(containerSelector, (controls) => {
        console.log("[SpeedControlsManager] Container element found, creating speed controls");
        
        const speedControls = document.createElement("speed-controls");
        speedControls.speeds = speeds;
        speedControls.videoSelector = videoSelector;

        DOMHelper.insertAfter(controls, speedControls);

        this.speedControls = speedControls;
        console.log("[SpeedControlsManager] Speed controls element created and assigned");

        const video = document.querySelector(videoSelector) || document.querySelector("video");
        if (video) {
          console.log(`[SpeedControlsManager] Video found, current playbackRate: ${video.playbackRate}`);
          speedControls._currentSpeed = video.playbackRate;
          speedControls.updateActiveButton();

          video.addEventListener("ratechange", () => {
            console.log(`[SpeedControlsManager] Video rate changed to: ${video.playbackRate}`);
            speedControls._currentSpeed = video.playbackRate;
            speedControls.updateActiveButton();
          });
        } else {
          console.warn("[SpeedControlsManager] Video element not found");
        }

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
      if (this.onKeyDown) {
        document.removeEventListener("keydown", this.onKeyDown);
        this.onKeyDown = null;
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
