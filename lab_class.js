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
    
    // Initialize textlines if not present
    if (!this.textbox.textlines) {
      this.textbox.textlines = [];
    }
  }

  /**
   * Get the current number of rows with data
   */
  getCurrentRowCount() {
    return this.textbox.textlines.length;
  }

  /**
   * Insert data at specified row
   */
  insertData(rowIndex, value) {
    if (rowIndex < 0 || rowIndex >= this.maxRows) {
      throw new Error(`Row index ${rowIndex} out of bounds (0-${this.maxRows - 1})`);
    }

    // Extend textlines array if necessary
    while (this.textbox.textlines.length <= rowIndex) {
      this.textbox.textlines.push('');
    }

    this.textbox.textlines[rowIndex] = value.toString();
    this.updateTextboxDisplay();
    return true;
  }

  /**
   * Append data to the next available row
   */
  appendData(value) {
    const nextRowIndex = this.textbox.textlines.length;
    if (nextRowIndex >= this.maxRows) {
      throw new Error(`Maximum rows (${this.maxRows}) reached`);
    }
    
    this.textbox.textlines.push(value.toString());
    this.updateTextboxDisplay();
    return nextRowIndex;
  }

  /**
   * Get data at specified row
   */
  getData(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.textbox.textlines.length) {
      return '';
    }
    return this.textbox.textlines[rowIndex] || '';
  }

  /**
   * Clear data at specified row
   */
  clearData(rowIndex) {
    if (rowIndex >= 0 && rowIndex < this.textbox.textlines.length) {
      this.textbox.textlines[rowIndex] = '';
      this.updateTextboxDisplay();
    }
  }

  /**
   * Update the fabric textbox display based on textlines
   */
  updateTextboxDisplay() {
    const displayText = this.textbox.textlines.join('\n');
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
      textlines: [...this.textbox.textlines],
      // Store reference to textbox (you might use object ID or custom identifier)
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
    this.textbox.textlines = [...(data.textlines || [])];
    this.updateTextboxDisplay();
  }
}

/**
 * LabTemplate class - manages tables and their columns, referencing existing fabric objects
 */
class LabTemplate {
  constructor(canvas) {
    this.tables = new Map();
    this.columns = new Map();
    this.templateId = '';
    this.templateName = 'Lab Template';
    this.version = '1.0';

    if (!canvas) {
      throw new Error("LabTemplate requires a canvas instance");
    }

    this._loadFromCanvas(canvas);
  }

  /**
   * Internal method to load from a full canvas object that contains lab_objects
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
      // 1. Create the table
      this.createTable(tableId, {
        name: tableData.name,
        maxRows: tableData.max_rows || 50
      });

      // 2. Add each column
      Object.entries(tableData.columns).forEach(([columnType, columnData]) => {
        const textboxId = columnData.textbox_id;
        const textbox = textboxes.find(tb => tb.id === textboxId);

        if (!textbox) {
          console.warn(`Textbox with id ${textboxId} not found on canvas`);
          return;
        }

        const column = this.addColumnToTable(tableId, columnType, textbox, {
          maxRows: tableData.max_rows
        });

        // Load the initial data
        column.loadData({
          columnName: `${tableId}_${columnType}`,
          columnType: columnType,
          tableId: tableId,
          maxRows: tableData.max_rows,
          textlines: columnData.data || []
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

    const table = {
      id: tableId,
      name: options.name || tableId,
      columns: {
        name: null,
        value: null,
        reference: null
      },
      maxRows: options.maxRows || 50
    };

    this.tables.set(tableId, table);
    return table;
  }

  /**
   * Add a column to a table by referencing an existing fabric textbox
   */
  addColumnToTable(tableId, columnType, fabricTextbox, columnOptions = {}) {
    if (!this.tables.has(tableId)) {
      throw new Error(`Table ${tableId} does not exist`);
    }

    if (!['name', 'value', 'reference'].includes(columnType)) {
      throw new Error(`Invalid column type: ${columnType}`);
    }

    const table = this.tables.get(tableId);
    
    if (table.columns[columnType]) {
      throw new Error(`Column type ${columnType} already exists in table ${tableId}`);
    }

    const columnId = `${tableId}_${columnType}`;
    const column = new LabColumn(fabricTextbox, {
      ...columnOptions,
      columnName: columnId,
      columnType: columnType,
      tableId: tableId
    });

    table.columns[columnType] = columnId;
    this.columns.set(columnId, column);

    return column;
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
   * Get table by ID
   */
  getTable(tableId) {
    return this.tables.get(tableId);
  }

  /**
   * Get column by ID
   */
  getColumn(columnId) {
    return this.columns.get(columnId);
  }

  /**
   * Get all columns for a table
   */
  getTableColumns(tableId) {
    const table = this.getTable(tableId);
    if (!table) return {};

    const result = {};
    Object.entries(table.columns).forEach(([type, columnId]) => {
      if (columnId) {
        result[type] = this.getColumn(columnId);
      }
    });
    return result;
  }

  /**
   * Get the total row count for a table (max across all columns)
   */
  getTableRowCount(tableId) {
    const columns = this.getTableColumns(tableId);
    let maxRows = 0;

    Object.values(columns).forEach(column => {
      if (column) {
        maxRows = Math.max(maxRows, column.getCurrentRowCount());
      }
    });

    return maxRows;
  }

  /**
   * Get the first empty row for a table
   */
  getTableEmptyRow(tableId) {
    const columns = this.getTableColumns(tableId);
    let minEmptyRow = 0;

    Object.values(columns).forEach(column => {
      if (column) {
        minEmptyRow = Math.max(minEmptyRow, column.getCurrentRowCount());
      }
    });

    return minEmptyRow;
  }

  /**
   * Insert a complete row of data into a table
   */
  insertTableRow(tableId, rowData, rowIndex = null) {
    const table = this.getTable(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} does not exist`);
    }

    const targetRow = rowIndex !== null ? rowIndex : this.getTableEmptyRow(tableId);
    const columns = this.getTableColumns(tableId);

    // Insert data into each column
    Object.entries(rowData).forEach(([columnType, value]) => {
      const column = columns[columnType];
      if (column && value !== undefined) {
        column.insertData(targetRow, value);
      }
    });

    return targetRow;
  }

  /**
   * Get a complete row of data from a table
   */
  getTableRow(tableId, rowIndex) {
    const columns = this.getTableColumns(tableId);
    const rowData = {};

    Object.entries(columns).forEach(([type, column]) => {
      if (column) {
        rowData[type] = column.getData(rowIndex);
      }
    });

    return rowData;
  }

  /**
   * Find which textboxes in a canvas could be lab columns
   * Useful for converting existing templates to lab templates
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
   * Export the lab template data (separate from fabric.js template)
   */
  exportLabData() {
    const tablesData = {};
    
    this.tables.forEach((table, tableId) => {
      const columns = {};
      Object.entries(table.columns).forEach(([type, columnId]) => {
        if (columnId && this.columns.has(columnId)) {
          columns[type] = this.columns.get(columnId).exportData();
        }
      });

      tablesData[tableId] = {
        ...table,
        columnsData: columns
      };
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
   * You'll need to match textboxes by ID or position
   */
  loadLabData(exportedData, canvas) {
    this.templateId = exportedData.templateId;
    this.templateName = exportedData.templateName;
    this.version = exportedData.version;

    // Get all textboxes from canvas for matching
    const textboxes = canvas.getObjects('textbox');

    // Recreate tables and columns
    Object.entries(exportedData.tables).forEach(([tableId, tableData]) => {
      this.createTable(tableId, {
        name: tableData.name,
        maxRows: tableData.maxRows
      });

      Object.entries(tableData.columnsData || {}).forEach(([columnType, columnData]) => {
        // Find the matching textbox (you might need to adjust this matching logic)
        const matchingTextbox = textboxes.find(tb => tb.id === columnData.textboxId);
        
        if (matchingTextbox) {
          const column = this.addColumnToTable(tableId, columnType, matchingTextbox, {
            maxRows: columnData.maxRows
          });

          column.loadData(columnData);
        }
      });
    });
  }
}