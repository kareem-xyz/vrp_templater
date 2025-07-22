let labTemplate;
function loadLab(){
    labTemplate = new LabTemplate(canvas);
    loadAvailableLabs("templates_json/Available_Labs.json");
}

let availableLabs = {}; // Populated from JSON

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
 * 
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
  container.innerHTML = '';

  for (const labTitle in availableLabs) {
    const lab = availableLabs[labTitle];
    const row = document.createElement('div');
    row.innerHTML = `
      <label>
        <input type="checkbox" onchange="AddLab('${lab.id}', this.checked)">
        ${lab.title}
      </label>
    `;
    container.appendChild(row);
  }
}

/**
 * Add lab rows to LabTemplate when toggled on
 * @param {string} labId - Lab ID (not title)
 * @param {boolean} enabled - True if toggled on
 */
function AddLab(labId, enabled) {
  if (!enabled) return;

  // Find lab by ID
  const lab = Object.values(availableLabs).find(l => l.id === labId);
  if (!lab || !lab.rows) {
    console.error(`Lab with id ${labId} not found or malformed`);
    return;
  }

  const { names = [], ref_vals = [] } = lab.rows;
  const rowCount = Math.max(names.length, ref_vals.length);

  try {
    const tableId = 't1';
    const table = labTemplate.getTable(tableId);
    const maxRows = table.maxRows;
    const currentRowCount = labTemplate.getTableRowCount(tableId);

    if (currentRowCount + rowCount > maxRows) {
      console.warn(`Not enough room to add all rows from ${lab.title}`);
      return;
    }

    for (let i = 0; i < rowCount; i++) {
      const rowData = {
        name: names[i] || '',
        reference: ref_vals[i] || '',
        value: ''
      };
      labTemplate.insertTableRow(tableId, rowData);
    }
  } catch (e) {
    console.error('Error while adding lab:', e);
  }
}
