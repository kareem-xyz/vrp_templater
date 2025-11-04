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

function makeTextUI(obj, index = null) {

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-1 p-1 border rounded';

  const headerRow = document.createElement('div');
  headerRow.className = 'd-flex align-items-center justify-content-between mb-1';

  const fieldLabel = document.createElement('strong');
  if (!index) index = fieldCount;
  fieldLabel.innerText = obj.label || `Field ${index}`;
  fieldLabel.className = 'text';
  headerRow.appendChild(fieldLabel);

  const formattingRow = document.createElement('div');
  formattingRow.className = 'd-flex align-items-center gap-1';

  const toggleBtn = document.createElement('a');
  toggleBtn.innerHTML = '&#128474';
  toggleBtn.className = 'btn btn-outline-secondary btn-sm';
  toggleBtn.dat = 'btn btn-sm';
  toggleBtn.title = 'Show/Hide Formatting';
  formattingRow.appendChild(toggleBtn);

  const deleteBtn = document.createElement('a');
  deleteBtn.innerHTML = '&#10005;';
  deleteBtn.className = 'btn btn-sm btn-outline-danger';
  deleteBtn.title = 'Delete Field'
  deleteBtn.onclick = () => {
    if (confirm('Are you sure you want to delete this field?')) {
      canvas.remove(obj);
      wrapper.remove();
    }
  };
  formattingRow.appendChild(deleteBtn);

  headerRow.append(formattingRow);
  wrapper.appendChild(headerRow);

  // Editor container
  const editorContainer = document.createElement('div');
  editorContainer.className = 'mb-1';
  editorContainer.style.height = 'fit-content';
  editorContainer.style.border = '1px solid #ccc';
  wrapper.appendChild(editorContainer);

  // Init Quill after container is in DOM
  setTimeout(() => {
    const quill = new Quill(editorContainer, {
      theme: 'snow',
      modules: {
        toolbar: {
          container: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }],
            [{ font: Font.whitelist}],
            [{ header: [false, '1', '2','3', '4', '5', '6']}],
            [{ align: ['center', false] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
          ],
          handlers: {
            align: function (value) {
              const temp = value === false ? 'left' : 'center';
              obj.set({ textAlign: temp });
              // also apply inside Quill so what you see matches Fabric
              this.quill.format('align', value || '');
              canvas.renderAll();
            },
            header: function (value) {
              const range = this.quill.getSelection(true);
              if (!range) return;
              this.quill.formatLine(range.index, range.length, 'header', value);
            }
          }
        }
      }
    });

    // Get the real toolbar element Quill created
    const toolbarEl = quill.getModule('toolbar').container;


    // Start hidden, and wire toggle
    toolbarEl.hidden = true;
    toggleBtn.onclick = () => {
      toolbarEl.hidden = !toolbarEl.hidden;
    };

    // Initial content
    if (obj.text && obj.styles) {
      const delta = fabricStylesToQuillDelta(obj.text, obj.styles, obj.fontSize);
      quill.setContents(delta);
    } else if (obj.text) {
      quill.setText(obj.text);
    }

    // Sync back to Fabric
    quill.on('text-change', () => {
      const delta = quill.getContents();
      const { cleanText, styles } = parseQuillDeltaToStyledText(delta, obj.fontSize);
      obj.text = cleanText;
      obj.styles = styles;
      canvas.renderAll();
    });
  }, 0);

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
  
  // // Style buttons container (initially hidden)
  // const styleContainer = document.createElement('div');
  // styleContainer.className = 'd-none';
  // styleContainer.style.display = 'none';

  // Toggle functionality
  toggleBtn.onclick = () => {
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
  container.appendChild(toggleBtn);
  return container;
}

function getHeadingStyle(depth, fontsize=1) {
  const fontSizes = {
    1: 1.25,    // # - 1.25x size
    2: 1.15,    // ## - 1.15x size
    3: 1.10,    // ### - 1.10x size
    4: 1.05,    // #### - 1.05x size
    5: 1.025,   // ##### - 1.025x size
    6: 1.0      // ###### - normal size
  };
  
  return {
    fontSize: fontsize * (fontSizes[depth] || 1.0),
    fontWeight: 'bold'
  };
}