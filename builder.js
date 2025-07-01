const canvas = new fabric.Canvas('builderCanvas');
let fieldCount = 0;
let originalBgImg = null;
let originalImageData = null; // Store the base64 image data
let currentImageScale = 1;

// Initialize canvas with container constraints
function initializeCanvas() {
  const container = document.querySelector('.canvas-box');
  const containerWidth = container.clientWidth - 10; // Account for padding/border
  const containerHeight = container.clientHeight - 10;
  
  canvas.setWidth(containerWidth);
  canvas.setHeight(containerHeight);
  canvas.renderAll();
}

// Fit image within the fixed canvas bounds
function fitImageToCanvas(img) {

  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  
  // Calculate scale to fit image within canvas bounds
  const scale = Math.min(
    canvasWidth / img.width, 
    canvasHeight / img.height
  );
  
  // Store the current scale for object positioning
  const scaleRatio = scale / currentImageScale;
  currentImageScale = scale;
  
  // Center the image in the canvas
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  const left = (canvasWidth - scaledWidth) / 2;
  const top = (canvasHeight - scaledHeight) / 2;
  
  img.set({
    scaleX: scale,
    scaleY: scale,
    left: left,
    top: top,
    originX: 'left',
    originY: 'top',
    selectable: false, // Prevent background image from being selected
    evented: false // Prevent background image from receiving events
  });
  
  // Scale existing text objects proportionally
  rescaleTextObjects(scaleRatio);
  
  canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
  canvas.renderAll();
}

// Rescale all text objects when image scale changes
function rescaleTextObjects(scaleRatio) {
  if (Math.abs(scaleRatio - 1) < 0.001) return; // No significant change
  
  canvas.getObjects('text').forEach(obj => {
    // Store original data if not already stored
    if (!obj.originalData) {
      obj.originalData = {
        left: obj.left,
        top: obj.top,
        fontSize: obj.fontSize
      };
    }
    
    // Scale position and size
    obj.set({
      left: obj.left * scaleRatio,
      top: obj.top * scaleRatio,
      fontSize: obj.fontSize * scaleRatio
    });
    
    obj.setCoords();
  });
}

// Image upload handler
document.getElementById('imageUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(f) {
    // Store the base64 data
    originalImageData = f.target.result;
    
    fabric.Image.fromURL(f.target.result, function(img) {
      originalBgImg = img;
      
      // Clear existing objects when loading new image
      canvas.clear();
      fieldCount = 0;
      currentImageScale = 1;
      
      fitImageToCanvas(img);
      updateFieldPanel();
    });
  };
  reader.readAsDataURL(file);
});

// Add text field programmatically
function addField() {
  if (!originalBgImg) {
    alert('Please upload an image first');
    return;
  }
  
  fieldCount++;
  
  // Calculate position relative to image bounds
  const bgImg = canvas.backgroundImage;
  const startX = bgImg.left + 20;
  const startY = bgImg.top + 20 + (fieldCount * 30);
  
  const text = new fabric.Text(`Field ${fieldCount}`, {
    left: startX,
    top: startY,
    fontSize: 120 * currentImageScale,
    fill: 'black',
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    originX: 'left',
    originY: 'top',
    hasControls: true,
    hasBorders: true,
    label: `Field ${fieldCount}`
  });
  
  // Store original data for scaling
  text.originalData = {
    left: startX,
    top: startY,
    fontSize: 16 * currentImageScale
  };
  
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.renderAll();
  updateFieldPanel();
}

// Update sidebar panel with field controls
function updateFieldPanel() {
  const panel = document.getElementById('fieldsPanel');
  panel.innerHTML = '';
  
  const textObjects = canvas.getObjects('text');
  
  if (textObjects.length === 0) {
    panel.innerHTML = '<p class="text-muted">No fields added yet. Upload an image and click "Add Field" to start.</p>';
    return;
  }

  textObjects.forEach((obj, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-3 p-3 border rounded bg-light';

    // Header with field label and style buttons
    const headerRow = document.createElement('div');
    headerRow.className = 'd-flex align-items-center justify-content-between mb-2';

    const fieldLabel = document.createElement('strong');
    fieldLabel.innerText = `Field ${index + 1}`;
    fieldLabel.className = 'text-primary';
    headerRow.appendChild(fieldLabel);

    const styleButtons = createStyleButtons(obj);
    headerRow.appendChild(styleButtons);
    wrapper.appendChild(headerRow);

    // Text content input
    const textLabel = document.createElement('label');
    textLabel.innerText = 'Text:';
    textLabel.className = 'form-label mb-1';
    wrapper.appendChild(textLabel);
    
    const nameInput = document.createElement('input');
    nameInput.className = 'form-control mb-2';
    nameInput.value = obj.text || '';
    nameInput.placeholder = 'Enter field text...';
    nameInput.oninput = () => {
      obj.set('text', nameInput.value);
      obj.label = nameInput.value || `Field ${index + 1}`;
      canvas.renderAll();
    };
    wrapper.appendChild(nameInput);

    // Font size control
    const sizeLabel = document.createElement('label');
    sizeLabel.innerText = 'Font Size:';
    sizeLabel.className = 'form-label mb-1';
    wrapper.appendChild(sizeLabel);
    
    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.className = 'form-range mb-2';
    sizeInput.min = '10';
    sizeInput.max = '300';
    sizeInput.value = Math.round(obj.fontSize / currentImageScale); // Normalize for display
    sizeInput.oninput = () => {
      const newSize = parseInt(sizeInput.value) * currentImageScale;
      obj.set('fontSize', newSize);
      // Update original data
      if (obj.originalData) {
        obj.originalData.fontSize = newSize;
      }
      canvas.renderAll();
      sizeValue.innerText = sizeInput.value + 'px';
    };
    wrapper.appendChild(sizeInput);
    
    const sizeValue = document.createElement('small');
    sizeValue.className = 'text-muted mb-2 d-block';
    sizeValue.innerText = sizeInput.value + 'px';
    wrapper.appendChild(sizeValue);

    // Color picker
    const colorLabel = document.createElement('label');
    colorLabel.innerText = 'Text Color:';
    colorLabel.className = 'form-label mb-1';
    wrapper.appendChild(colorLabel);
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'form-control form-control-color mb-2';
    colorInput.value = obj.fill || '#000000';
    colorInput.onchange = () => {
      obj.set('fill', colorInput.value);
      canvas.renderAll();
    };
    wrapper.appendChild(colorInput);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '🗑️ Delete Field';
    deleteBtn.className = 'btn btn-sm btn-outline-danger w-100';
    deleteBtn.onclick = () => {
      if (confirm('Are you sure you want to delete this field?')) {
        canvas.remove(obj);
        updateFieldPanel();
      }
    };
    wrapper.appendChild(deleteBtn);

    panel.appendChild(wrapper);
  });
}

// Create style toggle buttons (Bold, Italic, Font)
function createStyleButtons(obj) {
  const group = document.createElement('div');
  group.className = 'btn-group btn-group-sm';

  // Bold button
  const boldBtn = document.createElement('button');
  boldBtn.innerHTML = '<strong>B</strong>';
  boldBtn.className = `btn btn-outline-secondary ${obj.fontWeight === 'bold' ? 'active' : ''}`;
  boldBtn.title = 'Toggle Bold';
  boldBtn.onclick = function() {
    const isBold = obj.fontWeight === 'bold';
    obj.set('fontWeight', isBold ? 'normal' : 'bold');
    canvas.renderAll();
    updateFieldPanel();
  };
  group.appendChild(boldBtn);

  // Italic button
  const italicBtn = document.createElement('button');
  italicBtn.innerHTML = '<em>I</em>';
  italicBtn.className = `btn btn-outline-secondary ${obj.fontStyle === 'italic' ? 'active' : ''}`;
  italicBtn.title = 'Toggle Italic';
  italicBtn.onclick = function() {
    const isItalic = obj.fontStyle === 'italic';
    obj.set('fontStyle', isItalic ? 'normal' : 'italic');
    canvas.renderAll();
    updateFieldPanel();
  };
  group.appendChild(italicBtn);

  // Font family button
  const fontBtn = document.createElement('button');
  fontBtn.innerText = 'Font';
  fontBtn.className = 'btn btn-outline-secondary';
  fontBtn.title = 'Change Font Family';
  fontBtn.onclick = function() {
    const currentFont = obj.fontFamily || 'Arial';
    const fonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Times', 
      'Georgia', 'Verdana', 'Courier New', 'Courier'
    ];
    
    const fontSelect = document.createElement('select');
    fontSelect.className = 'form-select';
    fonts.forEach(font => {
      const option = document.createElement('option');
      option.value = font;
      option.text = font;
      option.selected = font === currentFont;
      fontSelect.appendChild(option);
    });
    
    // Create a simple modal-like experience
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 20px; border: 2px solid #ccc; border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000;
    `;
    
    const label = document.createElement('label');
    label.innerText = 'Select Font Family:';
    label.className = 'form-label mb-2 d-block';
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'mt-3';
    
    const okBtn = document.createElement('button');
    okBtn.innerText = 'OK';
    okBtn.className = 'btn btn-primary me-2';
    okBtn.onclick = () => {
      obj.set('fontFamily', fontSelect.value);
      canvas.renderAll();
      document.body.removeChild(modal);
      updateFieldPanel();
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.onclick = () => document.body.removeChild(modal);
    
    buttonGroup.appendChild(okBtn);
    buttonGroup.appendChild(cancelBtn);
    modal.appendChild(label);
    modal.appendChild(fontSelect);
    modal.appendChild(buttonGroup);
    document.body.appendChild(modal);
  };
  group.appendChild(fontBtn);

  return group;
}

// Save template as JSON
function saveTemplate() {
  // 1. Export the full canvas state. Include any extra props (e.g. 'label').
  const jsonObj = canvas.toJSON(['label']);

  // 2. Convert to string with indentation for readability
  const jsonStr = JSON.stringify(jsonObj, null, 2);

  // 3. Build a Blob and temporary download link
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href     = url;
  link.download = 'template.json';
  document.body.appendChild(link);

  // 4. Trigger download
  link.click();

  // 5. Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download current canvas as image
function downloadImage() {
  if (!originalBgImg) {
    alert('Please upload an image first');
    return;
  }
  
  const dataURL = canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 2 // Higher resolution export
  });
  
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = 'template-preview.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Handle canvas object selection
canvas.on('selection:created', updateFieldPanel);
canvas.on('selection:updated', updateFieldPanel);
canvas.on('selection:cleared', updateFieldPanel);

// Handle object modifications
canvas.on('object:modified', function(e) {
  const obj = e.target;
  if (obj.type === 'text' && obj.originalData) {
    // Update original data when object is manually moved/scaled
    obj.originalData.left = obj.left;
    obj.originalData.top = obj.top;
  }
});

// Responsive canvas handling
function handleResize() {
  if (!originalBgImg) return;
  
  setTimeout(() => {
    const container = document.querySelector('.canvas-box');
    const newWidth = container.clientWidth - 20;
    const newHeight = container.clientHeight - 20;
    
    // Only resize if container size actually changed
    if (Math.abs(canvas.getWidth() - newWidth) > 5 || 
        Math.abs(canvas.getHeight() - newHeight) > 5) {
      
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);
      fitImageToCanvas(originalBgImg);
    }
  }, 100);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeCanvas();
  updateFieldPanel();
});

// Handle window resize with debouncing
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleResize, 250);
});