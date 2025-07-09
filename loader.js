const canvas = new fabric.Canvas('canvas');
const liveToggle = document.getElementById('livePreviewToggle');
let originalBgImg = null
let originalImageData = null; // Store the base64 image data

function loadTemplate(selectedFile="") {
  initializeCanvas();

  // If passed filename
  if (!selectedFile){
    selectedFile = document.getElementById('templateSelector').value;
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
          option.textContent = file;
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
  canvas.getObjects("text" || "textarea").forEach(obj => {
    const label = document.createElement('label');
    label.className = 'form-label mt-2';
    label.innerText = obj.label || 'Field';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.value = obj.text || '';

    input.addEventListener('input', () => {
      obj.text = input.value;
      canvas.renderAll();
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

function downloadImage() {
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 4 });
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'filled_template.png';
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