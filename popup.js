document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_SPEEDS = [1, 1.5, 2, 2.5, 3, 3.25, 3.5, 4, 6, 8];
  const speedsContainer = document.getElementById('speeds-container');
  const newSpeedInput = document.getElementById('new-speed');
  const speedError = document.getElementById('speed-error');
  const shortcutError = document.getElementById('shortcut-error');
  const saveButton = document.getElementById('save-button');
  const saveLabel = document.getElementById('save-label');
  const saveStatus = document.getElementById('save-status');
  const keyButtons = {
    decreaseKey: document.getElementById('set-decrease-key'),
    increaseKey: document.getElementById('set-increase-key')
  };
  const keyLabels = {
    decreaseKey: document.getElementById('decrease-key'),
    increaseKey: document.getElementById('increase-key')
  };

  let speeds = [...DEFAULT_SPEEDS];
  let shortcuts = { decreaseKey: 'F7', increaseKey: 'F9' };
  let savedSettings = '';
  let capturingKey = null;
  let storageReady = false;
  let saving = false;

  const getSettings = () => ({ speeds: [...speeds], ...shortcuts });
  const isDirty = () => JSON.stringify(getSettings()) !== savedSettings;

  function setStatus(message, state = '') {
    saveStatus.textContent = message;
    saveStatus.dataset.state = state;
  }

  function updateSaveState() {
    const dirty = isDirty();
    saveButton.disabled = !storageReady || saving || !dirty || Boolean(capturingKey);
    saveLabel.textContent = saving ? 'Saving…' : 'Save changes';
    if (storageReady && !saving) {
      setStatus(dirty ? 'You have unsaved changes' : 'All changes saved', dirty ? 'dirty' : '');
    }
  }

  function showSpeedError(message) {
    speedError.textContent = message;
    speedError.hidden = !message;
    newSpeedInput.setAttribute('aria-invalid', String(Boolean(message)));
  }

  function renderSpeeds() {
    speedsContainer.replaceChildren();
    document.getElementById('speed-count').textContent = `${speeds.length} ${speeds.length === 1 ? 'preset' : 'presets'}`;
    speeds.forEach(speed => {
      const chip = document.createElement('li');
      chip.className = 'speed-chip';
      const label = document.createElement('span');
      label.textContent = speed;
      label.title = `${speed}×`;
      const unit = document.createElement('span');
      unit.className = 'speed-unit';
      unit.textContent = '×';
      label.append(unit);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'remove-speed';
      removeButton.setAttribute('aria-label', `Remove ${speed}× speed`);
      removeButton.disabled = speeds.length === 1;
      removeButton.title = speeds.length === 1 ? 'Keep at least one playback speed' : `Remove ${speed}×`;
      removeButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 5 6 6M11 5l-6 6"/></svg>';
      removeButton.addEventListener('click', () => {
        const index = speeds.indexOf(speed);
        speeds = speeds.filter(value => value !== speed);
        showSpeedError('');
        renderSpeeds();
        updateSaveState();
        const remainingButtons = speedsContainer.querySelectorAll('button');
        const nextButton = remainingButtons[Math.min(index, remainingButtons.length - 1)];
        (nextButton.disabled ? newSpeedInput : nextButton).focus();
      });
      chip.append(label, removeButton);
      speedsContainer.append(chip);
    });
  }

  function renderKeys() {
    Object.keys(keyButtons).forEach(type => {
      const capturing = capturingKey === type;
      keyButtons[type].setAttribute('aria-pressed', String(capturing));
      keyLabels[type].textContent = capturing ? 'Press a key…' : shortcuts[type] === ' ' ? 'Space' : shortcuts[type];
    });
  }

  function stopCapture() {
    capturingKey = null;
    renderKeys();
    updateSaveState();
  }

  document.getElementById('add-speed-form').addEventListener('submit', event => {
    event.preventDefault();
    const speed = Number(newSpeedInput.value);
    if (!Number.isFinite(speed) || speed < 0.1 || speed > 16) {
      showSpeedError('Enter a speed between 0.1× and 16×.');
      newSpeedInput.focus();
      return;
    }
    if (speeds.includes(speed)) {
      showSpeedError(`${speed}× is already in your presets.`);
      newSpeedInput.focus();
      return;
    }
    speeds.push(speed);
    speeds.sort((a, b) => a - b);
    newSpeedInput.value = '';
    showSpeedError('');
    renderSpeeds();
    updateSaveState();
    newSpeedInput.focus();
  });
  newSpeedInput.addEventListener('input', () => showSpeedError(''));

  Object.entries(keyButtons).forEach(([type, button]) => {
    let suppressActivationKeyup = false;
    button.addEventListener('click', () => {
      capturingKey = capturingKey === type ? null : type;
      shortcutError.hidden = true;
      renderKeys();
      updateSaveState();
    });
    button.addEventListener('blur', () => {
      if (capturingKey === type) stopCapture();
    });
    button.addEventListener('keydown', event => {
      if (capturingKey !== type) return;
      if (event.key === 'Tab') {
        stopCapture();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      suppressActivationKeyup = event.key === ' ' || event.key === 'Enter';
      if (event.key === 'Escape') {
        shortcutError.hidden = true;
        stopCapture();
        return;
      }
      if (event.repeat || event.isComposing || ['Dead', 'Unidentified'].includes(event.key)) return;
      const otherType = type === 'decreaseKey' ? 'increaseKey' : 'decreaseKey';
      if (event.key === shortcuts[otherType]) {
        shortcutError.textContent = 'That key is already in use. Choose a different key.';
        shortcutError.hidden = false;
        return;
      }
      shortcuts[type] = event.key;
      shortcutError.hidden = true;
      stopCapture();
    });
    // Prevent Space/Enter from triggering another click after being recorded.
    button.addEventListener('keyup', event => {
      if (suppressActivationKeyup && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        suppressActivationKeyup = false;
      }
    });
  });

  document.getElementById('reset-button').addEventListener('click', () => {
    speeds = [...DEFAULT_SPEEDS];
    shortcuts = { decreaseKey: 'F7', increaseKey: 'F9' };
    newSpeedInput.value = '';
    showSpeedError('');
    shortcutError.hidden = true;
    renderSpeeds();
    stopCapture();
    if (storageReady && isDirty()) setStatus('Defaults restored. Save to apply.', 'dirty');
  });

  saveButton.addEventListener('click', () => {
    if (!storageReady || saving || !isDirty()) return;
    const settings = getSettings();
    saving = true;
    updateSaveState();
    setStatus('Saving your settings…');
    chrome.storage.sync.set(settings, () => {
      saving = false;
      if (chrome.runtime.lastError) {
        updateSaveState();
        setStatus('Couldn’t save your settings. Please try again.', 'error');
        return;
      }
      savedSettings = JSON.stringify(settings);
      updateSaveState();
      if (!isDirty()) setStatus('Settings saved. Refresh your video to apply.', 'saved');
    });
  });

  renderSpeeds();
  renderKeys();
  // A plain browser preview can render the UI without extension permissions.
  if (!globalThis.chrome?.storage?.sync) {
    setStatus('Preview mode · Open the extension to save settings');
    return;
  }
  chrome.storage.sync.get(['speeds', 'decreaseKey', 'increaseKey'], result => {
    if (chrome.runtime.lastError) {
      setStatus('Couldn’t load settings. Reopen the extension to try again.', 'error');
      return;
    }
    if (Array.isArray(result.speeds)) {
      const validSpeeds = result.speeds.filter(speed => Number.isFinite(speed) && speed >= 0.1 && speed <= 16);
      if (validSpeeds.length) speeds = [...new Set(validSpeeds)].sort((a, b) => a - b);
    }
    Object.keys(shortcuts).forEach(type => {
      if (typeof result[type] === 'string' && result[type]) shortcuts[type] = result[type];
    });
    savedSettings = JSON.stringify(getSettings());
    storageReady = true;
    renderSpeeds();
    renderKeys();
    updateSaveState();
  });
});
