const canvas = new fabric.Canvas('builderCanvas');
let fieldCount = 0;

// Upload background image
document.getElementById('imageUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(f) {
    fabric.Image.fromURL(f.target.result, function(img) {
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'left',
        originY: 'top',
        textAlign: 'left',
        left: 0,
        top: 0
      });
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    });
  };
  reader.readAsDataURL(file);
});

// Add fields programmatically
function addField() {
  const text = new fabric.Text("Text", {
    left: canvas.getWidth() / 2,  // Horizontal center
    top: 20 + (25 * fieldCount++),                      // Near the top
    fontSize: 18,
    fill: 'black',
    originX: 'left',           // Align text center on X
    originY: 'top',              // Align top edge on Y
    hasControls: false,
    label: 'Field ' + fieldCount
  });
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.renderAll();
  updateFieldPanel();
}


// Update sidebar panel
function updateFieldPanel() {
  const panel = document.getElementById('fieldsPanel');
  panel.innerHTML = '';

  canvas.getObjects('text').forEach((obj, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-3 p-2 border rounded';

    const label = document.createElement('label');
    label.innerText = `Field ${index + 1}`;
    wrapper.appendChild(label);

    const nameInput = document.createElement('input');
    nameInput.className = 'form-control mb-1';
    nameInput.value = obj.label || obj.text;
    nameInput.oninput = () => {
      obj.text = nameInput.value;
      obj.label = nameInput.value;
      canvas.renderAll();
    };
    wrapper.appendChild(nameInput);

    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.className = 'form-control mb-1';
    sizeInput.value = obj.fontSize;
    sizeInput.oninput = () => {
      obj.fontSize = parseInt(sizeInput.value);
      canvas.renderAll();
    };
    wrapper.appendChild(sizeInput);

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '🗑 Delete';
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.onclick = () => {
      canvas.remove(obj);
      updateFieldPanel();
    };
    wrapper.appendChild(deleteBtn);

    panel.appendChild(wrapper);
  });
}

// Save canvas as JSON
function saveTemplate() {
  const json = canvas.toJSON(['label']);
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "template.json");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Download current image view
function downloadImage() {
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 4 });
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'template_image.png';
  link.click();
}
