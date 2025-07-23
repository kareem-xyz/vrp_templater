/**
 * Column class - references an existing fabric.Textbox with lab-specific functionality
 */
class LabColumn {
  constructor(fabricTextbox, options = {}) {
    // Reference to the existing fabric.js textbox
    this.textbox = fabricTextbox;
    
    // Lab-specific properties
    this.columnName = options.columnName || '';
    this.columnType = options.columnType || 'name'; // 'name', 'value', 'reference'
    this.tableId = options.tableId || '';
    this.maxRows = options.maxRows || 50;
    
    // Initialize textLines if not present
    if (!this.textbox.textLines) {
      this.textbox.textLines = [];
    }
  }

  /**
   * Get the current number of rows with data
   */
  getCurrentRowCount() {
    return this.textbox.textLines.length;
  }

  /**
   * Insert data at specified row
   */
  insertData(rowIndex, value) {
    if (rowIndex < 0 || rowIndex >= this.maxRows) {
      throw new Error(`Row index ${rowIndex} out of bounds (0-${this.maxRows - 1})`);
    }

    // Extend textLines array if necessary
    while (this.textbox.textLines.length <= rowIndex) {
      this.textbox.textLines.push('');
    }

    this.textbox.textLines[rowIndex] = value.toString();
    this.updateTextboxDisplay();
    return true;
  }

  /**
   * Append data to the next available row
   */
  appendData(value) {
    const nextRowIndex = this.textbox.textLines.length;
    if (nextRowIndex >= this.maxRows) {
      throw new Error(`Maximum rows (${this.maxRows}) reached`);
    }
    
    this.textbox.textLines.push(value.toString());
    this.updateTextboxDisplay();
    return nextRowIndex;
  }

  /**
   * Get data at specified row
   */
  getData(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.textbox.textLines.length) {
      return '';
    }
    return this.textbox.textLines[rowIndex] || '';
  }

  /**
   * Clear data at specified row
   */
  clearData(rowIndex) {
    if (rowIndex >= 0 && rowIndex < this.textbox.textLines.length) {
      this.textbox.textLines.splice(rowIndex, 1);
      this.updateTextboxDisplay();
    }
  }

  /**
   * Clear data at multiple rows
   */
  clearDataRange(startRow, endRow) {
    // Has to remove title row, and empty end row.
    this.textbox.textLines.splice(startRow, endRow - startRow);
    this.updateTextboxDisplay();

  }

  /**
   * Update the fabric textbox display based on textLines
   */
  updateTextboxDisplay() {
    const displayText = this.textbox.textLines.join('\n');
    this.textbox.set('text', displayText);
    if (this.textbox.canvas) {
      this.textbox.canvas.renderAll();
    }
  }

  /**
   * Export column data for persistence
   */
  exportData() {
    return {
      columnName: this.columnName,
      columnType: this.columnType,
      tableId: this.tableId,
      maxRows: this.maxRows,
      textLines: [...this.textbox.textLines],
      textboxId: this.textbox.id || null
    };
  }

  /**
   * Load data into column
   */
  loadData(data) {
    this.columnName = data.columnName || this.columnName;
    this.columnType = data.columnType || this.columnType;
    this.tableId = data.tableId || this.tableId;
    this.maxRows = data.maxRows || this.maxRows;
    this.textbox.textLines = [...(data.textLines || [])];
    this.updateTextboxDisplay();
  }
}

/**
 * LabTable class - manages a single table and its columns
 */
class LabTable {
  constructor(tableId, options = {}) {
    this.id = tableId;
    this.name = options.name || tableId;
    this.maxRows = options.maxRows || 50;
    this.columns = {
      name: null,
      value: null,
      reference: null
    };
    this.columnInstances = new Map();
    
    // Track which labs occupy which rows
    this.labOccupancy = new Map(); // labId -> { startRow, endRow, rowIndices[] }
  }

  /**
   * Add a column to this table
   */
  addColumn(columnType, fabricTextbox, columnOptions = {}) {
    if (!['name', 'value', 'reference'].includes(columnType)) {
      throw new Error(`Invalid column type: ${columnType}`);
    }

    if (this.columns[columnType]) {
      throw new Error(`Column type ${columnType} already exists in table ${this.id}`);
    }

    const columnId = `${this.id}_${columnType}`;
    const column = new LabColumn(fabricTextbox, {
      ...columnOptions,
      columnName: columnId,
      columnType: columnType,
      tableId: this.id,
      maxRows: this.maxRows
    });

    this.columns[columnType] = columnId;
    this.columnInstances.set(columnId, column);

    return column;
  }

  /**
   * Get column by type
   */
  getColumn(columnType) {
    const columnId = this.columns[columnType];
    return columnId ? this.columnInstances.get(columnId) : null;
  }

  /**
   * Get all columns
   */
  getAllColumns() {
    const result = {};
    Object.entries(this.columns).forEach(([type, columnId]) => {
      if (columnId) {
        result[type] = this.columnInstances.get(columnId);
      }
    });
    return result;
  }

  /**
   * Get the current row count (max across all columns)
   */
  getCurrentRowCount() {
    let maxRows = 0;
    this.columnInstances.forEach(column => {
      maxRows = Math.max(maxRows, column.getCurrentRowCount());
    });
    return maxRows;
  }

  /**
   * Get the first empty row
   */
  getFirstEmptyRow() {
    return this.getCurrentRowCount();
  }

  /**
   * Check if table has enough space for additional rows
   */
  hasSpaceFor(rowCount) {
    return this.getCurrentRowCount() + rowCount <= this.maxRows;
  }

  /**
   * Check if table is full
   */
  isFull() {
    return this.getCurrentRowCount() >= this.maxRows;
  }

  /**
   * Get available space in table
   */
  getAvailableSpace() {
    return this.maxRows - this.getCurrentRowCount();
  }

  /**
   * Insert a row of data and track lab occupancy
   */
  insertRow(rowData, rowIndex = null, labId = null) {
    const targetRow = rowIndex !== null ? rowIndex : this.getFirstEmptyRow();
    
    if (targetRow >= this.maxRows) {
      throw new Error(`Cannot insert row at index ${targetRow}, table is full`);
    }

    const columns = this.getAllColumns();

    // Insert data into each column
    Object.entries(rowData).forEach(([columnType, value]) => {
      const column = columns[columnType];
      if (column && value !== undefined) {
        column.insertData(targetRow, value);
      }
    });

    // Track lab occupancy if labId provided
    if (labId) {
      this.trackLabRow(labId, targetRow);
    }

    return targetRow;
  }

  /**
   * Insert multiple rows for a lab
   */
  insertLabRows(labId, rowsData) {
    if (!this.hasSpaceFor(rowsData.length)) {
      throw new Error(`Not enough space for ${rowsData.length} rows`);
    }

    const insertedRows = [];
    const startRow = this.getFirstEmptyRow();

    for (let i = 0; i < rowsData.length; i++) {
      const rowIndex = this.insertRow(rowsData[i], null, labId);
      insertedRows.push(rowIndex);
    }

    // Update lab occupancy with complete range
    this.labOccupancy.set(labId, {
      startRow: startRow,
      endRow: startRow + rowsData.length - 1,
      rowIndices: insertedRows
    });

    return insertedRows;
  }

  /**
   * Track which row a lab occupies
   */
  trackLabRow(labId, rowIndex) {
    if (!this.labOccupancy.has(labId)) {
      this.labOccupancy.set(labId, {
        startRow: rowIndex,
        endRow: rowIndex,
        rowIndices: [rowIndex]
      });
    } else {
      const occupancy = this.labOccupancy.get(labId);
      occupancy.rowIndices.push(rowIndex);
      occupancy.startRow = Math.min(occupancy.startRow, rowIndex);
      occupancy.endRow = Math.max(occupancy.endRow, rowIndex);
    }
  }

  /**
   * Remove a lab's data from the table
   */
  removeLab(labId) {
    if (!this.labOccupancy.has(labId)) {
      console.warn(`Lab ${labId} not found in table ${this.id}`);
      return false;
    }

    const occupancy = this.labOccupancy.get(labId);
    const columns = this.getAllColumns();

    // Clear data from all columns for the lab's rows
    const indices = occupancy.rowIndices;
    if (!indices || indices.length === 0) return;

    const min = Math.min(...indices);
    const max = Math.max(...indices);

    Object.values(columns).forEach(column => {
      if (column) {
        column.clearDataRange(min, max);
      }
    });

    // Remove lab from occupancy tracking
    this.labOccupancy.delete(labId);
    
    return true;
  }

  /**
   * Get row data
   */
  getRow(rowIndex) {
    const columns = this.getAllColumns();
    const rowData = {};

    Object.entries(columns).forEach(([type, column]) => {
      if (column) {
        rowData[type] = column.getData(rowIndex);
      }
    });

    return rowData;
  }

  /**
   * Check if a lab is in this table
   */
  hasLab(labId) {
    return this.labOccupancy.has(labId);
  }

  /**
   * Get lab occupancy info
   */
  getLabOccupancy(labId) {
    return this.labOccupancy.get(labId);
  }

  /**
   * Export table data
   */
  exportData() {
    const columnsData = {};
    this.columnInstances.forEach((column, columnId) => {
      columnsData[column.columnType] = column.exportData();
    });

    return {
      id: this.id,
      name: this.name,
      maxRows: this.maxRows,
      columns: this.columns,
      columnsData: columnsData,
      labOccupancy: Object.fromEntries(this.labOccupancy)
    };
  }

  /**
   * Load table data
   */
  loadData(data, textboxes) {
    this.name = data.name || this.name;
    this.maxRows = data.maxRows || this.maxRows;
    
    // Restore lab occupancy
    if (data.labOccupancy) {
      this.labOccupancy = new Map(Object.entries(data.labOccupancy));
    }

    // Recreate columns
    Object.entries(data.columnsData || {}).forEach(([columnType, columnData]) => {
      const matchingTextbox = textboxes.find(tb => tb.id === columnData.textboxId);
      
      if (matchingTextbox) {
        const column = this.addColumn(columnType, matchingTextbox, {
          maxRows: columnData.maxRows
        });
        column.loadData(columnData);
      }
    });
  }
}

/**
 * LabTemplate class - manages multiple tables
 */
class LabTemplate {
  constructor(canvas) {
    this.tables = new Map();
    this.templateId = '';
    this.templateName = 'Lab Template';
    this.version = '1.0';

    if (!canvas) {
      throw new Error("LabTemplate requires a canvas instance");
    }

    this._loadFromCanvas(canvas);
  }

  /**
   * Load from canvas with lab_objects
   */
  _loadFromCanvas(canvas) {
    const labObjects = canvas.lab_objects;

    if (!labObjects || !labObjects.tables) {
      console.warn("No lab_objects found in canvas.");
      return;
    }

    this.version = labObjects.version || this.version;
    const textboxes = canvas.getObjects('textbox');

    Object.entries(labObjects.tables).forEach(([tableId, tableData]) => {
      const table = this.createTable(tableId, {
        name: tableData.name,
        maxRows: tableData.max_rows || 22
      });

      Object.entries(tableData.columns).forEach(([columnType, columnData]) => {
        const textboxId = columnData.textbox_id;
        const textbox = textboxes.find(tb => tb.id === textboxId);

        if (!textbox) {
          console.warn(`Textbox with id ${textboxId} not found on canvas`);
          return;
        }

        const column = table.addColumn(columnType, textbox, {
          maxRows: tableData.max_rows
        });

        column.loadData({
          columnName: `${tableId}_${columnType}`,
          columnType: columnType,
          tableId: tableId,
          maxRows: tableData.max_rows,
          textLines: columnData.data || []
        });
      });
    });
  }

  /**
   * Create a new table
   */
  createTable(tableId, options = {}) {
    if (this.tables.has(tableId)) {
      throw new Error(`Table ${tableId} already exists`);
    }

    const table = new LabTable(tableId, options);
    this.tables.set(tableId, table);
    return table;
  }

  /**
   * Get table by ID
   */
  getTable(tableId) {
    return this.tables.get(tableId);
  }

  /**
   * Get all tables
   */
  getAllTables() {
    return Array.from(this.tables.values());
  }

  /**
   * Find the best table to add rows to (with enough space)
   */
  findTableWithSpace(rowCount) {
    for (const table of this.tables.values()) {
      if (table.hasSpaceFor(rowCount)) {
        return table;
      }
    }
    return null;
  }

  /**
   * Add lab data across multiple tables if needed
   */
  addLabData(labId, rowsData) {
    let remainingRows = [...rowsData];
    const tablesUsed = [];

    while (remainingRows.length > 0) {
      const table = this.findTableWithSpace(1); // Find table with at least 1 space
      
      if (!table) {
        throw new Error(`No available space for remaining ${remainingRows.length} rows`);
      }

      const availableSpace = table.getAvailableSpace();
      const rowsToInsert = remainingRows.splice(0, availableSpace);
      
      try {
        table.insertLabRows(labId, rowsToInsert);
        tablesUsed.push(table.id);
      } catch (error) {
        console.error(`Error inserting rows into table ${table.id}:`, error);
        throw error;
      }
    }

    return tablesUsed;
  }

  /**
   * Remove lab data from all tables
   */
  removeLab(labId) {
    let removed = false;
    
    this.tables.forEach(table => {
      if (table.removeLab(labId)) {
        removed = true;
      }
    });

    return removed;
  }

  /**
   * Check if a lab exists in any table
   */
  hasLab(labId) {
    for (const table of this.tables.values()) {
      if (table.hasLab(labId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get which tables contain a specific lab
   */
  getTablesWithLab(labId) {
    const tablesWithLab = [];
    
    this.tables.forEach((table, tableId) => {
      if (table.hasLab(labId)) {
        tablesWithLab.push({
          tableId: tableId,
          table: table,
          occupancy: table.getLabOccupancy(labId)
        });
      }
    });

    return tablesWithLab;
  }

  /**
   * Get default header text for column types
   */
  getDefaultHeader(columnType) {
    const headers = {
      name: 'Test Name',
      value: 'Result',
      reference: 'Reference Range'
    };
    return headers[columnType] || columnType.toUpperCase();
  }

  /**
   * Find potential columns in canvas
   */
  static findPotentialColumns(canvas) {
    const textboxes = canvas.getObjects('textbox');
    return textboxes.map(textbox => ({
      textbox: textbox,
      id: textbox.id || null,
      text: textbox.text,
      position: { left: textbox.left, top: textbox.top }
    }));
  }

  /**
   * Export lab template data
   */
  exportLabData() {
    const tablesData = {};
    
    this.tables.forEach((table, tableId) => {
      tablesData[tableId] = table.exportData();
    });

    return {
      templateId: this.templateId,
      templateName: this.templateName,
      version: this.version,
      tables: tablesData
    };
  }

  /**
   * Load lab template from exported data
   */
  loadLabData(exportedData, canvas) {
    this.templateId = exportedData.templateId;
    this.templateName = exportedData.templateName;
    this.version = exportedData.version;

    const textboxes = canvas.getObjects('textbox');

    Object.entries(exportedData.tables).forEach(([tableId, tableData]) => {
      const table = this.createTable(tableId, {
        name: tableData.name,
        maxRows: tableData.maxRows
      });

      table.loadData(tableData, textboxes);
    });
  }
}