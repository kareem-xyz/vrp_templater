function addText(type = 'text') {
  if (!originalBgImg) {
    alert('Please upload an image first');
    return;
  }
  
  // Calculate position relative to image bounds
  const bgImg = canvas.backgroundImage;
  const startX = bgImg.left + 20;
  const startY = bgImg.top + 20;
  
  const textContent = type === 'textarea' ? `Textarea ${fieldCount}` : `Field ${fieldCount}`;
  
  // Get default styles and merge with specific overrides
  const defaultStyle = (typeof default_settings !== 'undefined' && 
                       default_settings.style) ? default_settings.style : {};
  
  const textConfig = {
    scaleX: currentImageScale,
    scaleY: currentImageScale,
    left: startX,
    top: startY,
    fontSize: defaultStyle.fontSize || 100,
    fill: defaultStyle.fill || 'black',
    fontFamily: defaultStyle.fontFamily || 'Arial',
    fontWeight: defaultStyle.fontWeight || 'normal',
    fontStyle: defaultStyle.fontStyle || 'normal',
    textAlign: defaultStyle.textAlign || 'left',
    originX: 'left',
    originY: 'top',
    hasControls: true,
    hasBorders: true,
    label: textContent
  };
  
  let textObject;
  if (type === 'textarea') {
    textConfig.width = defaultStyle.width || 400; // enable automatic line wrapping
    textObject = new fabric.Textbox(textContent, textConfig);
  } else {
    textObject = new fabric.Text(textContent, textConfig);
  }
  
  // Store original data for scaling
  textObject.originalData = {
    left: startX,
    top: startY,
    fontSize: textConfig.fontSize
  };
  
  canvas.add(textObject);
  canvas.setActiveObject(textObject);
  canvas.renderAll();
  
  // Create and append UI for this new text object
  const uiElement = makeTextUI(textObject, fieldCount);
  appendTextUI('fieldsPanel', uiElement);
}

function makeTextUI(obj, index=null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mb-1 p-1 border rounded';

  // Header with field label and style buttons
  const headerRow = document.createElement('div');
  headerRow.className = 'd-flex align-items-center justify-content-between mb-1';

  const fieldLabel = document.createElement('strong');
  if (!index) {index = fieldCount};
  fieldLabel.innerText = obj.label || `Field ${index}`;
  fieldLabel.className = 'text';
  headerRow.appendChild(fieldLabel);

  let formattingRow = document.createElement('div');
  formattingRow.className = "d-flex align-items-center gap-1";

  const styleButtons = createStyleButtons(obj);
  formattingRow.appendChild(styleButtons);

  // Delete button
  const deleteBtn = document.createElement('a');
  deleteBtn.innerText = 'X';
  deleteBtn.className = 'btn btn-sm btn-danger';
  deleteBtn.onclick = () => {
    if (confirm('Are you sure you want to delete this field?')) {
      canvas.remove(obj);
      wrapper.remove(); // Remove the UI element
    }
  };
  formattingRow.appendChild(deleteBtn);
  
  headerRow.append(formattingRow);
  wrapper.appendChild(headerRow);

  let nameInput;
  if (obj.type === 'textbox') {
    nameInput = document.createElement('textarea');
    nameInput.className = 'form-control mb-1';
    nameInput.rows = 3;
  } else {
    nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-control mb-1';
  }

  nameInput.id = `obj-${index}`;
  nameInput.value = obj.text || '';
  nameInput.placeholder = obj.text ||'Enter field text...';
  nameInput.oninput = () => {
    // obj.set('text', nameInput.value);
    const { cleanText, styles } = parseMarkdownToStyledText(nameInput.value, obj.fontSize);
    obj.text = cleanText;
    obj.styles = styles;

    obj.label = nameInput.value || `Field ${index}`;
    canvas.renderAll();
  };

  wrapper.appendChild(nameInput);
  fieldCount = fieldCount + 1;
  return wrapper;
}

function appendTextUI(containerId, htmlElement) {
  const panel = document.getElementById(containerId);
  panel.appendChild(htmlElement);
}

function createStyleButtons(obj) {
  const container = document.createElement('div');
  container.className = 'd-flex align-items-center gap-1';

  // Show/Hide formatting toggle button
  const toggleBtn = document.createElement('a');
  toggleBtn.innerHTML = '+';
  toggleBtn.className = 'btn btn-outline-primary btn-sm';
  toggleBtn.title = 'Show/Hide Formatting';
  
  // Style buttons container (initially hidden)
  const styleContainer = document.createElement('div');
  styleContainer.className = 'd-none';
  styleContainer.style.display = 'none';

  // Toggle functionality
  let isVisible = false;
  toggleBtn.onclick = () => {
    isVisible = !isVisible;
    if (isVisible) {
      styleContainer.className = 'd-flex align-items-center gap-1 flex-wrap';
      styleContainer.style.display = 'flex';
      toggleBtn.className = 'btn btn-primary btn-sm';
    } else {
      styleContainer.className = 'd-none';
      styleContainer.style.display = 'none';
      toggleBtn.className = 'btn btn-outline-primary btn-sm';
    }
  };

  // Style buttons group
  const group = document.createElement('div');
  group.className = 'btn-group btn-group-sm me-2';

  // Bold
  const boldBtn = document.createElement('a');
  boldBtn.innerHTML = '<strong>B</strong>';
  boldBtn.className = `btn btn-outline-secondary ${obj.fontWeight === 'bold' ? 'active' : ''}`;
  boldBtn.title = 'Toggle Bold';
  boldBtn.onclick = () => {
    obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
    canvas.renderAll();
    boldBtn.className = `btn btn-outline-secondary ${obj.fontWeight === 'bold' ? 'active' : ''}`;
  };
  group.appendChild(boldBtn);

  // Italic
  const italicBtn = document.createElement('a');
  italicBtn.innerHTML = '<em>I</em>';
  italicBtn.className = `btn btn-outline-secondary ${obj.fontStyle === 'italic' ? 'active' : ''}`;
  italicBtn.title = 'Toggle Italic';
  italicBtn.onclick = () => {
    obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
    canvas.renderAll();
    italicBtn.className = `btn btn-outline-secondary ${obj.fontStyle === 'italic' ? 'active' : ''}`;
  };
  group.appendChild(italicBtn);

  // Underline
  const underlineBtn = document.createElement('a');
  underlineBtn.innerHTML = '<u>U</u>';
  underlineBtn.className = `btn btn-outline-secondary ${obj.underline ? 'active' : ''}`;
  underlineBtn.title = 'Toggle Underline';
  underlineBtn.onclick = () => {
    obj.set('underline', !obj.underline);
    canvas.renderAll();
    underlineBtn.className = `btn btn-outline-secondary ${obj.underline ? 'active' : ''}`;
  };
  group.appendChild(underlineBtn);

  // Center-align
  const alignBtn = document.createElement('a');
  alignBtn.innerText = 'C';
  alignBtn.className = `btn btn-outline-secondary ${obj.textAlign === 'center' ? 'active' : ''}`;
  alignBtn.title = 'Toggle Center Align';
  alignBtn.onclick = () => {
    const newAlign = obj.textAlign === 'center' ? 'left' : 'center';
    obj.set('textAlign', newAlign);
    obj.set({
      originX: newAlign === 'center' ? 'center' : 'left'
    });
    canvas.renderAll();
    alignBtn.className = `btn btn-outline-secondary ${obj.textAlign === 'center' ? 'active' : ''}`;
  };
  group.appendChild(alignBtn);

  // Font family dropdown
  const fontDropdown = document.createElement('div');
  fontDropdown.className = 'dropdown me-2';

  const fontBtn = document.createElement('a');
  fontBtn.className = 'btn btn-outline-secondary btn-sm dropdown-toggle';
  fontBtn.setAttribute('data-bs-toggle', 'dropdown');
  fontBtn.setAttribute('aria-expanded', 'false');
  fontBtn.innerHTML = obj.fontFamily || 'Arial';
  fontBtn.title = 'Change Font Family';

  const fontMenu = document.createElement('ul');
  fontMenu.className = 'dropdown-menu';

  // Browser-friendly fonts
  const fonts = [
                'Arial',
                'Arial Black',
                'Comic Sans MS',
                'Courier New',
                'Georgia',
                'Helvetica',
                'Impact',
                'Times New Roman',
                'Trebuchet MS',
                'Verdana'
                ];

  fonts.forEach(font => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'dropdown-item';
    link.href = '#';
    link.style.fontFamily = font;
    link.innerText = font;
    link.onclick = (e) => {
      e.preventDefault();
      obj.set('fontFamily', font);
      canvas.renderAll();
      fontBtn.innerHTML = font;
    };
    li.appendChild(link);
    fontMenu.appendChild(li);
  });

  fontDropdown.appendChild(fontBtn);
  fontDropdown.appendChild(fontMenu);

  // Font size control
  const sizeContainer = document.createElement('div');
  sizeContainer.className = 'd-flex align-items-center gap-1 me-2';
  
  const sizeLabel = document.createElement('small');
  sizeLabel.innerText = 'Size:';
  sizeLabel.className = 'text-muted';
  
  const sizeInput = document.createElement('input');
  sizeInput.type = 'range';
  sizeInput.className = 'form-range';
  sizeInput.style.width = '100px';
  sizeInput.min = '1';
  sizeInput.max = '600';
  sizeInput.value = Math.round(obj.fontSize / currentImageScale);
  sizeInput.title = 'Font Size';
  sizeInput.oninput = () => {
    const newSize = parseInt(sizeInput.value) * currentImageScale;
    obj.set('fontSize', newSize);
    if (obj.originalData) {
      obj.originalData.fontSize = newSize;
    }
    canvas.renderAll();
    sizeValue.innerText = sizeInput.value;
  };
  
  const sizeValue = document.createElement('small');
  sizeValue.className = 'text-muted';
  sizeValue.innerText = sizeInput.value;
  sizeValue.style.minWidth = '25px';
  
  sizeContainer.appendChild(sizeLabel);
  sizeContainer.appendChild(sizeInput);
  sizeContainer.appendChild(sizeValue);

  // Color picker
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'form-control form-control-color';
  colorInput.style.width = '40px';
  colorInput.style.height = '32px';
  colorInput.value = obj.fill || '#000000';
  colorInput.title = 'Text Color';
  colorInput.onchange = () => {
    obj.set('fill', colorInput.value);
    canvas.renderAll();
  };

  // Add all elements to style container
  styleContainer.appendChild(group);
  styleContainer.appendChild(fontDropdown);
  styleContainer.appendChild(sizeContainer);
  styleContainer.appendChild(colorInput);

  // Add toggle button and style container to main container
  container.appendChild(toggleBtn);
  container.appendChild(styleContainer);

  return container;
}
