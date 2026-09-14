document.addEventListener('DOMContentLoaded', function() {
  const speedsContainer = document.getElementById('speeds-container');
  const newSpeedInput = document.getElementById('new-speed');
  const addButton = document.getElementById('add-button');
  const saveButton = document.getElementById('save-button');
  const resetButton = document.getElementById('reset-button');
  const decreaseKeyInput = document.getElementById('decrease-key');
  const increaseKeyInput = document.getElementById('increase-key');
  const setDecreaseKeyButton = document.getElementById('set-decrease-key');
  const setIncreaseKeyButton = document.getElementById('set-increase-key');
  
  let speeds = [];
  let decreaseKey = 'F7';
  let increaseKey = 'F9';

  chrome.storage.sync.get(['speeds', 'decreaseKey', 'increaseKey'], function(result) {
    console.log('[Popup] Loaded settings:', result);
    
    if (result.speeds && Array.isArray(result.speeds)) {
      speeds = result.speeds;
    } else {
      speeds = [1, 1.5, 2, 2.5, 3, 3.25, 3.5, 4, 6, 8];
    }
    if (result.decreaseKey) {
      decreaseKey = result.decreaseKey;
    }
    if (result.increaseKey) {
      increaseKey = result.increaseKey;
    }
    
    console.log('[Popup] Initialized with:', { speeds, decreaseKey, increaseKey });
    
    renderSpeeds();
    updateKeyInputs();
  });
  
  function renderSpeeds() {
    speedsContainer.innerHTML = '';
    
    speeds.sort((a, b) => a - b).forEach(speed => {
      const chipEl = document.createElement('div');
      chipEl.className = 'speed-chip';
      chipEl.innerHTML = `
        ${speed}x
        <span class="remove-speed" data-speed="${speed}">×</span>
      `;
      speedsContainer.appendChild(chipEl);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-speed').forEach(button => {
      button.addEventListener('click', function() {
        const speedToRemove = parseFloat(this.getAttribute('data-speed'));
        speeds = speeds.filter(s => s !== speedToRemove);
        renderSpeeds();
      });
    });
  }
  
  addButton.addEventListener('click', function() {
    const newSpeed = parseFloat(newSpeedInput.value);
    if (!isNaN(newSpeed) && newSpeed > 0) {
      if (!speeds.includes(newSpeed)) {
        speeds.push(newSpeed);
        renderSpeeds();
      }
      newSpeedInput.value = '';
    }
  });
  
  function updateKeyInputs() {
    decreaseKeyInput.value = decreaseKey;
    increaseKeyInput.value = increaseKey;
  }

  function setupKeyCapture(inputElement, buttonElement, keyType) {
    let isCapturing = false;

    buttonElement.addEventListener('click', function() {
      if (!isCapturing) {
        isCapturing = true;
        buttonElement.textContent = 'Press a key...';
        inputElement.value = 'Press a key...';
        inputElement.focus();
      }
    });

    inputElement.addEventListener('keydown', function(e) {
      if (isCapturing) {
        e.preventDefault();
        const key = e.key;
        
        console.log(`[Popup] Key captured: "${key}" for ${keyType}`);
        
        if (keyType === 'decrease') {
          decreaseKey = key;
        } else {
          increaseKey = key;
        }
        
        console.log(`[Popup] Updated keys: decrease="${decreaseKey}", increase="${increaseKey}"`);
        
        updateKeyInputs();
        isCapturing = false;
        buttonElement.textContent = 'Set Key';
        inputElement.blur();
      }
    });
  }

  setupKeyCapture(decreaseKeyInput, setDecreaseKeyButton, 'decrease');
  setupKeyCapture(increaseKeyInput, setIncreaseKeyButton, 'increase');

  saveButton.addEventListener('click', function() {
    const dataToSave = { 
      speeds: speeds,
      decreaseKey: decreaseKey,
      increaseKey: increaseKey
    };
    
    console.log('[Popup] Saving settings:', dataToSave);
    
    chrome.storage.sync.set(dataToSave, function() {
      console.log('[Popup] Settings saved successfully');
      
      const status = document.createElement('div');
      status.textContent = 'Settings saved!';
      status.style.color = 'green';
      status.style.marginTop = '10px';
      document.body.appendChild(status);
      setTimeout(() => status.remove(), 2000);
    });
  });
  
  resetButton.addEventListener('click', function() {
    speeds = [1, 1.5, 2, 2.5, 3, 3.25, 3.5, 4, 6, 8];
    decreaseKey = 'F7';
    increaseKey = 'F9';
    renderSpeeds();
    updateKeyInputs();
  });
});