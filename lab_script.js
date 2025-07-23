let labTemplate;

function loadLab() {
    labTemplate = new LabTemplate(canvas);
    loadAvailableLabs("templates_json/Available_Labs.json");
}

let availableLabs = {}; // Populated from JSON
let activeLabs = new Set(); // Track which labs are currently active

/**
 * Load lab definitions from JSON file and populate toggle UI
 * Expected format:
 * {
 *   "Lab Title": {
 *     id: "Lab1",
 *     title: "Lab1",
 *     rows: {
 *       names: [...],
 *       ref_vals: [...]
 *     }
 *   },
 *   ...
 * }
 */
async function loadAvailableLabs(jsonPath) {
  try {
    const response = await fetch(jsonPath);
    const data = await response.json();

    availableLabs = data; // Load directly

    renderLabListUI();
  } catch (error) {
    console.error('Failed to load labs:', error);
  }
}

/**
 * Render toggle list of labs into #lab-list-container
 */
function renderLabListUI() {
  const container = document.getElementById('lab-list-container');
  if (!container) {
    console.warn('lab-list-container element not found');
    return;
  }
  
  container.innerHTML = '';

  for (const labTitle in availableLabs) {
    const lab = availableLabs[labTitle];
    const isActive = activeLabs.has(lab.id);
    
    const row = document.createElement('div');
    row.innerHTML = `
      <label>
        <input type="checkbox" ${isActive ? 'checked' : ''} 
               onchange="AddLab('${lab.id}', this.checked)">
        ${lab.title}
      </label>
    `;
    container.appendChild(row);
  }
}

/**
 * Modified AddLab function to work with new classes and handle unchecking
 * @param {string} labId - Lab ID (not title)
 * @param {boolean} enabled - True if toggled on, false if toggled off
 */
function AddLab(labId, enabled) {
  if (enabled) {
    addLabData(labId);
  } else {
    removeLabData(labId);
  }
}

/**
 * Add lab rows to LabTemplate when toggled on
 * @param {string} labId - Lab ID (not title)
 */
function addLabData(labId) {
  if (activeLabs.has(labId)) {
    console.warn(`Lab ${labId} is already active`);
    return;
  }

  // Find lab by ID
  const lab = Object.values(availableLabs).find(l => l.id === labId);
  if (!lab || !lab.rows) {
    console.error(`Lab with id ${labId} not found or malformed`);
    showLabMessage(`Lab ${labId} not found or malformed`, 'error');
    updateCheckboxState(labId, false);
    return;
  }

  const { names = [], ref_vals = [] } = lab.rows;
  const rowCount = Math.max(names.length, ref_vals.length);

  if (rowCount === 0) {
    console.warn(`Lab ${labId} has no data to add`);
    showLabMessage(`${lab.title} has no data to add`, 'warning');
    updateCheckboxState(labId, false);
    return;
  }

  // Prepare row data
  const rowsData = [];
  for (let i = 0; i < rowCount; i++) {
    rowsData.push({
      name: names[i] || '',
      reference: ref_vals[i] || '',
      value: ''
    });
  }

  try {
    // Check if we have any tables with space
    const availableTable = labTemplate.findTableWithSpace(1);
    if (!availableTable) {
      throw new Error('No tables have available space');
    }

    // Use the new addLabData method which handles multiple tables
    const tablesUsed = labTemplate.addLabData(labId, rowsData);
    
    // Mark lab as active
    activeLabs.add(labId);
    
    console.log(`Successfully added lab ${labId} to tables: ${tablesUsed.join(', ')}`);
    
    // Show success message
    const tableText = tablesUsed.length === 1 ? 'table' : 'tables';
    showLabMessage(`Added ${lab.title} (${rowCount} tests) to ${tablesUsed.length} ${tableText}`, 'success');
    
  } catch (error) {
    console.error('Error while adding lab:', error);
    showLabMessage(`Failed to add ${lab.title}: ${error.message}`, 'error');
    
    // Uncheck the checkbox since we failed
    updateCheckboxState(labId, false);
  }
}

/**
 * Remove lab data when toggled off
 * @param {string} labId - Lab ID to remove
 */
function removeLabData(labId) {
  if (!activeLabs.has(labId)) {
    console.warn(`Lab ${labId} is not currently active`);
    return;
  }

  const lab = Object.values(availableLabs).find(l => l.id === labId);
  if (!lab) {
    console.error(`Lab with id ${labId} not found`);
    return;
  }

  try {
    // Get info about which tables contain this lab before removing
    const tablesWithLab = labTemplate.getTablesWithLab(labId);
    
    if (tablesWithLab.length === 0) {
      console.warn(`Lab ${labId} was not found in any tables`);
      showLabMessage(`${lab.title} was not found in any tables`, 'warning');
      activeLabs.delete(labId);
      return;
    }

    // Remove the lab from all tables
    const removed = labTemplate.removeLab(labId);
    
    if (removed) {
      // Mark lab as inactive
      activeLabs.delete(labId);
      
      console.log(`Successfully removed lab ${labId} from ${tablesWithLab.length} table(s)`);
      
      // Show success message
      const tableText = tablesWithLab.length === 1 ? 'table' : 'tables';
      showLabMessage(`Removed ${lab.title} from ${tablesWithLab.length} ${tableText}`, 'success');
    } else {
      console.warn(`Failed to remove lab ${labId}`);
      showLabMessage(`Failed to remove ${lab.title}`, 'error');
      
      // Check the checkbox back since we failed to remove
      updateCheckboxState(labId, true);
    }
    
  } catch (error) {
    console.error('Error while removing lab:', error);
    showLabMessage(`Failed to remove ${lab.title}: ${error.message}`, 'error');
    
    // Check the checkbox back since we failed to remove
    updateCheckboxState(labId, true);
  }
}

/**
 * Update checkbox state programmatically
 * @param {string} labId - Lab ID
 * @param {boolean} checked - Whether checkbox should be checked
 */
function updateCheckboxState(labId, checked) {
  const container = document.getElementById('lab-list-container');
  if (!container) return;
  
  const checkbox = container.querySelector(`input[onchange*="${labId}"]`);
  if (checkbox) {
    checkbox.checked = checked;
  }
}

/**
 * Show a temporary message to the user
 * @param {string} message - Message to show
 * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
 */
function showLabMessage(message, type = 'info') {
  // Create or get message container
  let messageContainer = document.getElementById('lab-message-container');
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'lab-message-container';
    messageContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 300px;
      pointer-events: none;
    `;
    document.body.appendChild(messageContainer);
  }

  // Create message element
  const messageElement = document.createElement('div');
  messageElement.style.cssText = `
    padding: 10px 15px;
    margin-bottom: 10px;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
  `;

  // Set color based on type
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };
  messageElement.style.backgroundColor = colors[type] || colors.info;
  messageElement.textContent = message;

  messageContainer.appendChild(messageElement);

  // Remove message after 5 seconds
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageContainer.removeChild(messageElement);
        }
      }, 300);
    }
  }, 5000);
}

/**
 * Get summary of current lab status
 */
function getLabSummary() {
  const summary = {
    activeLabs: Array.from(activeLabs),
    totalTables: labTemplate.getAllTables().length,
    tableStatus: []
  };

  labTemplate.getAllTables().forEach(table => {
    summary.tableStatus.push({
      tableId: table.id,
      tableName: table.name,
      currentRows: table.getCurrentRowCount(),
      maxRows: table.maxRows,
      availableSpace: table.getAvailableSpace(),
      isFull: table.isFull(),
      labsInTable: Array.from(table.labOccupancy.keys())
    });
  });

  return summary;
}

/**
 * Display lab summary in console (for debugging)
 */
function showLabSummary() {
  const summary = getLabSummary();
  console.log('=== Lab Summary ===');
  console.log(`Active Labs: ${summary.activeLabs.length > 0 ? summary.activeLabs.join(', ') : 'None'}`);
  console.log(`Total Tables: ${summary.totalTables}`);
  
  if (summary.tableStatus.length === 0) {
    console.log('No tables found');
    return;
  }
  
  summary.tableStatus.forEach(status => {
    console.log(`\nTable ${status.tableId} (${status.tableName}):`);
    console.log(`  Rows: ${status.currentRows}/${status.maxRows} used, ${status.availableSpace} available`);
    console.log(`  Status: ${status.isFull ? 'FULL' : 'Available'}`);
    console.log(`  Labs: ${status.labsInTable.length > 0 ? status.labsInTable.join(', ') : 'None'}`);
  });
}

/**
 * Clear all lab data (for testing/reset purposes)
 */
function clearAllLabs() {
  const labsToRemove = Array.from(activeLabs);
  
  if (labsToRemove.length === 0) {
    console.log('No labs to clear');
    showLabMessage('No labs to clear', 'info');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  labsToRemove.forEach(labId => {
    try {
      const removed = labTemplate.removeLab(labId);
      if (removed) {
        activeLabs.delete(labId);
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`Error removing lab ${labId}:`, error);
      errorCount++;
    }
  });
  
  // Update UI
  renderLabListUI();
  
  if (successCount > 0) {
    console.log(`Cleared ${successCount} labs`);
    showLabMessage(`Cleared ${successCount} labs`, 'success');
  }
  
  if (errorCount > 0) {
    console.warn(`Failed to clear ${errorCount} labs`);
    showLabMessage(`Failed to clear ${errorCount} labs`, 'warning');
  }
}

/**
 * Check if a specific lab is currently active
 * @param {string} labId - Lab ID to check
 * @return {boolean} - True if lab is active
 */
function isLabActive(labId) {
  return activeLabs.has(labId);
}

/**
 * Get list of active lab IDs
 * @return {string[]} - Array of active lab IDs
 */
function getActiveLabs() {
  return Array.from(activeLabs);
}

/**
 * Get total space available across all tables
 * @return {number} - Total available rows
 */
function getTotalAvailableSpace() {
  return labTemplate.getAllTables().reduce((total, table) => {
    return total + table.getAvailableSpace();
  }, 0);
}

/**
 * Check if there's enough space to add a lab
 * @param {string} labId - Lab ID to check
 * @return {boolean} - True if there's enough space
 */
function canAddLab(labId) {
  const lab = Object.values(availableLabs).find(l => l.id === labId);
  if (!lab || !lab.rows) return false;
  
  const rowCount = Math.max(lab.rows.names?.length || 0, lab.rows.ref_vals?.length || 0);
  return getTotalAvailableSpace() >= rowCount;
}

// Add CSS for animations (only if not already added)
if (!document.getElementById('lab-message-styles')) {
  const style = document.createElement('style');
  style.id = 'lab-message-styles';
  style.textContent = `
    @keyframes slideIn {
      from { 
        transform: translateX(100%); 
        opacity: 0; 
      }
      to { 
        transform: translateX(0); 
        opacity: 1; 
      }
    }
    
    @keyframes slideOut {
      from { 
        transform: translateX(0); 
        opacity: 1; 
      }
      to { 
        transform: translateX(100%); 
        opacity: 0; 
      }
    }
  `;
  document.head.appendChild(style);
}