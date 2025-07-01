const canvas = new fabric.Canvas('canvas');
const liveToggle = document.getElementById('livePreviewToggle');

function loadTemplate() {
  const selectedFile = document.getElementById('templateSelector').value;
  if (!selectedFile) return;

  fetch('templates_json/' + selectedFile)
    .then(response => response.json())
    .then(template => {
      const bgSrc = template.backgroundImage?.src;
      if (!bgSrc) return;

      // 1. Load the Base64 background exactly like builder.js does
      fabric.Image.fromURL(bgSrc, img => {
        // 2. Clear old canvas state
        canvas.clear();

        // 3. Resize canvas to container size
        const container = document.querySelector('.canvas-box');
        const containerWidth = container.clientWidth - 10;   // match builder’s −10 padding
        const containerHeight = container.clientHeight - 10;
        canvas.setWidth(containerWidth);
        canvas.setHeight(containerHeight);

        // 4. Compute scale & centering (same as fitImageToCanvas)
        const { width: origW, height: origH } = template.backgroundImage;
        const scale = Math.min(containerWidth / origW, containerHeight / origH);
        const left  = (containerWidth - origW * scale)  / 2;
        const top   = (containerHeight - origH * scale) / 2;

        img.set({
          scaleX: scale,
          scaleY: scale,
          left,
          top,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false
        });

        // 5. Draw background and then reload the rest of the JSON
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

        canvas.loadFromJSON(
          template,
          // onComplete: adjust coords & render
          () => {
            canvas.getObjects().forEach(obj => {
              if (obj.type !== 'image') obj.setCoords();
            });
            canvas.renderAll();
            populateInputFields();
          },
          // reviver: make text selectable again
          (o, object) => {
            if (object.type === 'text') object.selectable = true;
          }
        );
      });
    })
    .catch(err => console.error('Failed to load template:', err));
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