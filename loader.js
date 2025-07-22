let canvas = new fabric.Canvas('canvas');
const liveToggle = document.getElementById('livePreviewToggle');
let originalBgImg = null;
let originalImageData = null; // Store the base64 image data
let multipage_enabled = false;
let multipage_template = false;
let labs_enabled = false;

function loadTemplate(selectedFile="") {
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
  form.innerHTML = '';
  canvas.getObjects().forEach(obj => {
    const label = document.createElement('label');
    label.className = 'form-label mt-2';
    label.innerText = obj.label || 'Field';

    let input;
    if (obj.type == "text") {
    input = document.createElement('input');
    }

    else if (obj.type == "textbox") {
    input = document.createElement('textarea');
    input.rows = 4;
    }

    input.type = 'text';
    input.className = 'form-control';
    input.value = obj.text || '';

    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const { cleanText, styles } = parseMarkdownToStyledText(input.value);

        obj.text = cleanText;
        obj.styles = styles;

        canvas.renderAll();
      }, 500); // wait 300 ms after user stops typing
    });


    form.appendChild(label);
    form.appendChild(input);
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

function downloadImage({_canvas=null, title=null} = {}) {
  if (!_canvas) {_canvas = canvas}
  const dataURL = _canvas.toDataURL({ format: 'png', multiplier: 4 });
  const link = document.createElement('a');
  link.href = dataURL;
  let finalTitle = title || _canvas.title || "chart";
  finalTitle = finalTitle.replace(".json","").replace("(Multi-Page)","");
  link.download = finalTitle + ".png";
  link.click();
}

fetch('templates_json/templates.json')
  .then(res => res.json())
  .then(files => {
    const selector = document.getElementById('templateSelector');
    files.forEach(file => {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = file.replace('.json', '').replace(/_/g, ' ');
      selector.appendChild(option);
    });
  })
  .catch(err => {
    console.error("Failed to load template list:", err);
  });

document.getElementById('livePreviewToggle').addEventListener('change', () => {
  document.querySelectorAll('#dynamicFields input').forEach(input => {
    input.dispatchEvent(new Event('input'));
  });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeCanvas();
});

// Handle window resize with debouncing
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  // resizeTimeout = setTimeout(handleResize, 100);
});