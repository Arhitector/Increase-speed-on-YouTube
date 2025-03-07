document.addEventListener('DOMContentLoaded', function() {
  const speedsContainer = document.getElementById('speeds-container');
  const newSpeedInput = document.getElementById('new-speed');
  const addButton = document.getElementById('add-button');
  const saveButton = document.getElementById('save-button');
  const resetButton = document.getElementById('reset-button');
  
  let speeds = [];

  chrome.storage.sync.get(['speeds'], function(result) {
    if (result.speeds && Array.isArray(result.speeds)) {
      speeds = result.speeds;
    } else {
      speeds = [1, 1.5, 2, 2.5, 3, 3.25, 3.5, 4, 6, 8];
    }
    renderSpeeds();
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
  
  saveButton.addEventListener('click', function() {
    chrome.storage.sync.set({ speeds: speeds }, function() {
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
    renderSpeeds();
  });
});