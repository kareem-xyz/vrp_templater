let labTemplate;

function loadLab() {
    labTemplate = new LabTemplate(canvas);
    loadAvailableLabs("templates_json/Available_Labs.json");
}

let availableLabs = {}; // Populated from JSON
let activeLabs = new Set(); // Track which labs are currently active
let labInputElements = new Map(); // Track input elements for each lab

/**
 * Load lab definitions from JSON file and populate toggle UI
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
 * Render toggle list of labs into #lab-list-container with interactive controls
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
    const isExpanded = false; // Only show expanded if active
    
    const labDiv = document.createElement('div');
    labDiv.className = 'lab-item mb-3';
    labDiv.innerHTML = `
      <div class="lab-header">
        <div class="d-flex align-items-center justify-content-between">
          <label class="d-flex align-items-center">
            <input type="checkbox" class="me-2" ${isActive ? 'checked' : ''} 
                   onchange="AddLab('${lab.id}', this.checked)">
            <strong>${lab.title}</strong>
          </label>
          ${isActive ? `
            <button class="btn btn-sm btn-outline-secondary" 
                    onclick="toggleLabControls('${lab.id}')"
                    id="toggle-btn-${lab.id}"
                    title="Toggle lab controls">
              <i class="fas fa-chevron-${isExpanded ? 'up' : 'down'}"></i>
              ${isExpanded ? 'Hide' : 'Show'}
            </button>
          ` : ''}
        </div>
      </div>
      <div id="lab-controls-${lab.id}" class="lab-controls mt-2" 
           style="display: ${isActive && isExpanded ? 'block' : 'none'};">
        ${isActive ? renderLabControls(lab) : ''}
      </div>
    `;
    container.appendChild(labDiv);
  }
}

/**
 * Render interactive controls for a specific lab
 */
function renderLabControls(lab) {
  if (!lab.rows || (!lab.rows.names && !lab.rows.ref_vals)) {
    return '<p class="text-muted small">No data available</p>';
  }

  const names = lab.rows.names || [];
  const refVals = lab.rows.ref_vals || [];
  const normalVals = lab.rows.val || [];
  const rowCount = Math.max(names.length, refVals.length);
  const hasNormalValues = normalVals.length > 0;

  let controlsHTML = `
    <div class="lab-controls-container border rounded p-2 bg-light">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <small class="text-muted">${lab.title} Data (${rowCount} tests)</small>
        ${hasNormalValues ? `
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="normal-switch-${lab.id}" 
                   onchange="applyNormalValues('${lab.id}', this.checked)">
            <label class="form-check-label small" for="normal-switch-${lab.id}">
              Normal Values
            </label>
          </div>
        ` : ''}
      </div>
  `;

  // Add controls for each row
  for (let i = 0; i < rowCount; i++) {
    const name = names[i] || '';
    const refVal = refVals[i] || '';
    const normalVal = normalVals[i] || '';
    
    controlsHTML += `
      <div class="row mb-2 align-items-center" data-row-index="${i}">
        <div class="col-4">
          <input type="text" class="form-control form-control-sm" 
                 placeholder="Test name" 
                 value="${escapeHtml(name)}"
                 onchange="updateLabData('${lab.id}', ${i}, 'name', this.value)">
        </div>
        <div class="col-4">
          <input type="text" class="form-control form-control-sm" 
                 placeholder="Reference" 
                 value="${escapeHtml(refVal)}"
                 onchange="updateLabData('${lab.id}', ${i}, 'reference', this.value)">
        </div>
        <div class="col-4">
          <input type="text" class="form-control form-control-sm lab-value-input" 
                 placeholder="Value" 
                 value=""
                 data-normal-value="${escapeHtml(normalVal)}"
                 onchange="updateLabData('${lab.id}', ${i}, 'value', this.value)">
        </div>
      </div>
    `;
  }

  controlsHTML += `
      <div class="mt-2">
        <button class="btn btn-sm btn-outline-secondary" onclick="refreshLabDisplay('${lab.id}')">
          Refresh Display
        </button>
      </div>
    </div>
  `;

  return controlsHTML;
}

/**
 * Toggle lab controls visibility
 */
function toggleLabControls(labId) {
  const controlsDiv = document.getElementById(`lab-controls-${labId}`);
  const toggleBtn = document.getElementById(`toggle-btn-${labId}`);
  
  if (!controlsDiv || !toggleBtn) return;
  
  const isVisible = controlsDiv.style.display === 'block';
  controlsDiv.style.display = isVisible ? 'none' : 'block';
  
  // Update button text and icon
  const icon = toggleBtn.querySelector('i');
  if (icon) {
    icon.className = `fas fa-chevron-${isVisible ? 'down' : 'up'}`;
  }
  toggleBtn.innerHTML = `
    <i class="fas fa-chevron-${isVisible ? 'down' : 'up'}"></i>
    ${isVisible ? 'Show' : 'Hide'}
  `;
}

/**
 * Apply normal values to all value fields for a lab
 */
function applyNormalValues(labId, useNormal) {
  const controlsDiv = document.getElementById(`lab-controls-${labId}`);
  if (!controlsDiv) return;
  
  const valueInputs = controlsDiv.querySelectorAll('.lab-value-input');
  
  valueInputs.forEach((input, index) => {
    if (useNormal) {
      const normalValue = input.getAttribute('data-normal-value') || '';
      input.value = normalValue;
      // Trigger the onchange event to update the lab data
      updateLabData(labId, index, 'value', normalValue);
    } else {
      input.value = '';
      // Trigger the onchange event to clear the lab data
      updateLabData(labId, index, 'value', '');
    }
  });
  
  showLabMessage(`${useNormal ? 'Applied' : 'Cleared'} normal values for lab ${labId}`, 'info');
}
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update lab data when input field changes
 */

// Debug version of updateLabData to identify the mapping issue
function updateLabData(labId, rowIndex, fieldType, newValue) {
  if (!activeLabs.has(labId)) {
    console.warn(`Lab ${labId} is not active`);
    return;
  }

  try {
    // Find tables containing this lab
    const tablesWithLab = labTemplate.getTablesWithLab(labId);
    
    if (tablesWithLab.length === 0) {
      console.warn(`Lab ${labId} not found in any tables`);
      return;
    }

    console.log(`Updating ${labId} UI row ${rowIndex} field ${fieldType} to "${newValue}"`);

    let previousTableIndex = 0;
    let wrapped = 1; // takes care of title and continous tables.
    let inserted = false;
    tablesWithLab.forEach(({ table, occupancy }) => {
      console.log(`Table ${table.id} occupancy:`, occupancy);
      
      // The lab data structure is: [title_row, data_row_0, data_row_1, ..., empty_spacer]
      // UI rowIndex 0 = data_row_0 (which is occupancy.startRow + 1)
      // UI rowIndex 1 = data_row_1 (which is occupancy.startRow + 2)

      targetRowIndex = occupancy.startRow + wrapped + rowIndex - previousTableIndex;
      
      console.log(`Lab Data row ${rowIndex} maps to table row ${targetRowIndex}`);
      
      // Make sure we're within the data rows (not title or spacer)
      if (!inserted && targetRowIndex >= occupancy.startRow && targetRowIndex <= occupancy.endRow) {
        const column = table.getColumn(fieldType);
        if (column) {
          column.insertData(targetRowIndex, newValue);
          console.log(`✓ Successfully updated ${labId} table ${table.id} row ${targetRowIndex} ${fieldType}`);
        } else {
          console.error(`✗ Column ${fieldType} not found in table ${table.id}`);
        }
        inserted = true;
      } 
      else if (targetRowIndex > 21) {
        previousTableIndex = occupancy.endRow - occupancy.startRow;
        wrapped = 0;
      }
      else {
        console.warn(`✗ Target row ${targetRowIndex} outside data range (${occupancy.startRow + 1} to ${occupancy.endRow - 1})`);
      }
    });

  } catch (error) {
    console.error(`Error updating lab data:`, error);
    showLabMessage(`Failed to update ${labId}: ${error.message}`, 'error');
  }
}

/**
 * Refresh the display for a specific lab
 */
function refreshLabDisplay(labId) {
  const tablesWithLab = labTemplate.getTablesWithLab(labId);
  tablesWithLab.forEach(({ table }) => {
    const columns = table.getAllColumns();
    Object.values(columns).forEach(column => {
      if (column) {
        column.updateTextboxDisplay();
      }
    });
  });
  showLabMessage(`Refreshed display for lab ${labId}`, 'info');
}

/**
 * Consolidate labs - move labs from higher numbered tables to fill gaps in lower numbered tables
 */
function consolidateLabs() {
  const tables = labTemplate.getAllTables().sort((a, b) => a.id.localeCompare(b.id));
  let movesMade = false;

  // Check each table pair to see if we can move labs to fill gaps
  for (let i = 0; i < tables.length - 1; i++) {
    const sourceTable = tables[i + 1]; // Higher numbered table
    const targetTable = tables[i]; // Lower numbered table
    
    if (targetTable.isFull() || sourceTable.getCurrentRowCount() === 0) {
      continue; // Skip if target is full or source is empty
    }

    // Get labs from source table, sorted by their position
    const sourceLabIds = Array.from(sourceTable.labOccupancy.keys());
    
    for (const labId of sourceLabIds) {
      const occupancy = sourceTable.getLabOccupancy(labId);
      const labRowCount = occupancy.endRow - occupancy.startRow + 1;
      
      // Check if target table has enough space for this lab
      if (targetTable.hasSpaceFor(labRowCount)) {
        try {
          // Extract lab data from source table
          const labData = [];
          for (let rowIdx = occupancy.startRow; rowIdx <= occupancy.endRow; rowIdx++) {
            labData.push(sourceTable.getRow(rowIdx));
          }
          
          // Remove from source table
          sourceTable.removeLab(labId);
          
          // Add to target table
          targetTable.insertLabRows(labId, labData);
          
          console.log(`Moved lab ${labId} from table ${sourceTable.id} to ${targetTable.id}`);
          movesMade = true;
          
          // If target table becomes full, move to next target
          if (targetTable.isFull()) {
            break;
          }
        } catch (error) {
          console.error(`Error moving lab ${labId}:`, error);
          showLabMessage(`Failed to consolidate lab ${labId}: ${error.message}`, 'error');
        }
      }
    }
  }

  if (movesMade) {
    showLabMessage('Labs consolidated successfully', 'success');
    return true;
  }
  
  return false;
}

/**
 * Modified AddLab function to work with new classes and handle unchecking
 */
function AddLab(labId, enabled) {
  if (enabled) {
    addLabData(labId);
  } else {
    removeLabData(labId);
  }
  
  // Re-render the entire UI to update toggle buttons and controls
  renderLabListUI();
}

/**
 * Add lab rows to LabTemplate when toggled on
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
  if (lab.title) {
    rowsData.push({
      name: `>> ${lab.title}`,
      reference:'',
      value: ''
    });
  }

  for (let i = 0; i < rowCount; i++) {
    rowsData.push({
      name: names[i] || '',
      reference: ref_vals[i] || '',
      value: ''
    });
  }

  // Push empty end
  rowsData.push({
    name: ' ',
    reference:' ',
    value: ' '
  });

  try {
    // First try to consolidate existing labs to make space
    consolidateLabs();
    
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
      
      // Try to consolidate remaining labs after removal
      setTimeout(() => {
        consolidateLabs();
      }, 100); // Small delay to ensure removal is complete
      
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
 * Manual consolidation trigger (for testing/admin use)
 */
function manualConsolidate() {
  const result = consolidateLabs();
  if (!result) {
    showLabMessage('No consolidation needed', 'info');
  }
  showLabSummary();
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
 * Utility functions for external use
 */
function isLabActive(labId) {
  return activeLabs.has(labId);
}

function getActiveLabs() {
  return Array.from(activeLabs);
}

function getTotalAvailableSpace() {
  return labTemplate.getAllTables().reduce((total, table) => {
    return total + table.getAvailableSpace();
  }, 0);
}

function canAddLab(labId) {
  const lab = Object.values(availableLabs).find(l => l.id === labId);
  if (!lab || !lab.rows) return false;
  
  const rowCount = Math.max(lab.rows.names?.length || 0, lab.rows.ref_vals?.length || 0);
  return getTotalAvailableSpace() >= rowCount;
}

// Add CSS for animations and lab controls styling
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

    .lab-item {
      border: 1px solid #dee2e6;
      border-radius: 0.5rem;
      padding: 0.75rem;
      background-color: #f8f9fa;
    }

    .lab-header {
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .lab-controls-container {
      background-color: white !important;
    }

    .lab-controls .form-control-sm {
      font-size: 0.8rem;
    }

    .lab-controls .row {
      margin-left: -0.25rem;
      margin-right: -0.25rem;
    }

    .lab-controls .row > div {
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }
  `;
  document.head.appendChild(style);
}