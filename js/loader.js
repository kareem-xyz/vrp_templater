function loadTemplate(selectedFile="") {
  updateMPSwitch(false);
  initializeCanvas();

  // If passed filename
  if (!selectedFile){
    selectedFile = document.getElementById('templateSelector').value;
    const old = document.getElementById('subTemplateSelector');
    if (old) old.remove();
    if (!selectedFile) return;
  }

  // If folder (must include / and templates.json file inside)
  if (!selectedFile.includes('.json') && selectedFile.endsWith("/")) {
    // Fetch the list of files inside the folder (expected JSON array)
    fetch('templates_json/' + selectedFile + 'templates.json') // Assumes index.json lists files
      .then(res => res.json())
      .then(fileList => {
        // Remove old sub-selector if it exists
          const old = document.getElementById('subTemplateSelector');
          if (old) old.remove();
        // Create new select element
        const subSelector = document.createElement('select');
        subSelector.id = 'subTemplateSelector';
        subSelector.className = 'form-select mt-2'; // Add Bootstrap styling if using it

        // Add placeholder option
        const defaultOption = document.createElement('option');
        defaultOption.textContent = '-- Select sub-template --';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        subSelector.appendChild(defaultOption);

        // Add options from file list
        fileList.forEach(file => {
          const option = document.createElement('option');
          option.value = selectedFile + file;
          option.textContent = file.replace('.json', '').replace(/_/g, ' ')
          subSelector.appendChild(option);
        });

        subSelector.addEventListener('change', () => {
        // Set full path as the selected value of #templateSelector for consistency
        const fullPath = subSelector.value;
        loadTemplate(fullPath); // Trigger same logic as main selector
        });
        document.getElementById("selector-div").appendChild(subSelector)
      });
      return;
  }

  // Actual file path
  fetch('templates_json/' + selectedFile)
    .then(response => response.json())
    .then(template => {
      // Useful for download
      canvas.title = selectedFile.replace(".json", "");
      const bgImg = template.backgroundImage?.src;
      if (!bgImg) return;
      canvas.loadFromJSON(template, () => {
        fabric.Image.fromURL(bgImg, function(img) {
          originalBgImg=img;
          fitImageToCanvas(img);
          canvas.getObjects().forEach(obj => {
            if (obj.type == 'text') {
              obj.setCoords();
            }
          });
          canvas = UpdateCustomValues(canvas); // currently only used for multipage updates.
          if (template.type == "lab"){
            canvas.type = "lab";
            canvas.lab_objects = template.lab_objects;
            loadLab(canvas);
          } 
          populateInputFields();

          }, 
            function(o, object) {
              if (object.type === 'text') {
              object.selectable = true;  
              }
        });
      });
    });

  canvas.renderAll();
}

function populateInputFields() {
  const form = document.getElementById('dynamicFields');
  const fieldsPanel = document.getElementById('fieldsPanel');
  fieldsPanel.innerHTML = '';
  form.innerHTML = '';
  canvas.getObjects().forEach((obj, index) => {
    let wrapper = makeTextUI(obj, index)
    form.appendChild(wrapper);
  });
}

function generateImage() {
  const textObjects = canvas.getObjects('text');
  document.querySelectorAll('#dynamicFields input').forEach((input, index) => {
    if (textObjects[index]) {
      textObjects[index].text = input.value;
    }
  });
  canvas.renderAll();
}

function downloadImage({_canvas=canvas, title=null, type=default_settings?.file_format, _link=null} = {}) {
  if (_link) {
    _link.click();
  }
  const link = generateURL(_canvas, title, type)
  link.click();
}

function generateURL({_canvas=canvas, title=null, type=default_settings?.file_format} = {}) {
  const dataURL = _canvas.toDataURL({ format: type, multiplier: 4});
  const link = document.createElement('a');
  link.href = dataURL;
  let filename = title || _canvas.title;
  filename = filename.replace(".json","").replace("(Multi-Page)","");
  link.download = `${filename}.${type}`;
  return link
}