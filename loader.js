const canvas = new fabric.Canvas('canvas');
const liveToggle = document.getElementById('livePreviewToggle');
let originalBgImg = null
let originalImageData = null; // Store the base64 image data
let currentImageScale = 1;

function loadTemplate() {
  const selectedFile = document.getElementById('templateSelector').value;
  if (!selectedFile) return;

  fetch('templates_json/' + selectedFile)
    .then(response => response.json())
    .then(template => {
      const bgImg = template.backgroundImage?.src;
      if (!bgImg) return;

      fabric.Image.fromURL(bgImg, function(img) {
        originalBgImg=img;
        const container = document.querySelector('.canvas-box');
        const maxW = container.clientWidth;
        const maxH = container.clientHeight; // Leave some margin below header/buttons
        let scale = Math.min(maxW / img.width, maxH / img.height);

        // Round to nearest quarter step to reduce floating imprecision
        scale = Math.round(scale * 50) / 50;


        // Resize canvas to match scaled background
        canvas.setWidth((img.width * scale));
        canvas.setHeight((img.height * scale));

        // img.set({
        //   scaleX: scale,
        //   scaleY: scale,
        //   originX: 'left',
        //   originY: 'top',
        //   left: 0,
        //   top: 0
        // });

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

        canvas.loadFromJSON(template, () => {
          canvas.getObjects().forEach(obj => {
            if (obj.type !== 'image') {
              obj.setCoords();
            }
          });
          
          canvas.renderAll();
          populateInputFields();
        }, function(o, object) {
          if (object.type === 'text') {
            object.selectable = true;
          }
          fitImageToCanvas(originalBgImg);
        });
      });
    });
}

function populateInputFields() {
  const form = document.getElementById('dynamicFields');
  form.innerHTML = '';
  canvas.getObjects('text').forEach(obj => {
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
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 3 });
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
  resizeTimeout = setTimeout(handleResize, 250);
});