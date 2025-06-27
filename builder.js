const canvas = new fabric.Canvas('builderCanvas');
let fieldCount = 0;

// Upload background image
document.getElementById('imageUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(f) {
    fabric.Image.fromURL(f.target.result, function(img) {
      
  const container = document.querySelector('.canvas-box');
  const maxW = container.clientWidth;
  const maxH = window.innerHeight * 0.8; // Leave some margin below header/buttons
  let scale = Math.min(maxW / img.width, maxH / img.height);

  // Round to nearest quarter step to reduce floating imprecision
  scale = Math.round(scale * 4) / 4;



canvas.setWidth(img.width * scale);
canvas.setHeight(img.height * scale);

img.set({
  scaleX: scale,
  scaleY: scale,
  originX: 'left',
  originY: 'top',
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
  const text = new fabric.Text("Field" + (++fieldCount), {
    left: canvas.getWidth() / 2,  // Horizontal center
    top: 20 + (25 * fieldCount),                      // Near the top
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

    const labelRow = document.createElement('div');
    labelRow.className = 'd-flex align-items-center justify-content-between';

    const label = document.createElement('label');
    label.innerText = `Field ${index + 1}`;
    label.className = 'me-2 mb-0';
    labelRow.appendChild(label);

    const styleButtons = createStyleButtons(obj);
    labelRow.appendChild(styleButtons);
    wrapper.appendChild(labelRow);

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

function createStyleButtons(obj) {
  const group = document.createElement('div');

  const styleConfigs = [
    {
      label: 'B',
      prop: 'fontWeight',
      value: 'bold',
      style: { fontWeight: 'bold' },
      toggle: (obj) => {
        obj.fontWeight = obj.fontWeight === 'bold' ? 'normal' : 'bold';
      },
      isActive: (obj) => obj.fontWeight === 'bold'
    },
    {
      label: 'I',
      prop: 'fontStyle',
      value: 'italic',
      style: { fontStyle: 'italic' },
      toggle: (obj) => {
        obj.fontStyle = obj.fontStyle === 'italic' ? 'normal' : 'italic';
      },
      isActive: (obj) => obj.fontStyle === 'italic'
    }
  ];

  styleConfigs.forEach(({ label, style, toggle, isActive }) => {
    const btn = document.createElement('button');
    btn.innerText = label;
    btn.className = 'btn btn-sm btn-outline-dark me-1';

    Object.assign(btn.style, style);

    if (isActive(obj)) btn.classList.add('active');

    btn.onclick = () => {
      toggle(obj);
      canvas.renderAll();
      updateFieldPanel(); // Refresh to update button styles
    };

    group.appendChild(btn);
  });

  return group;
}


function getDefaultStyleValue(prop) {
  switch (prop) {
    case 'fontWeight':
    case 'fontStyle':
      return 'normal';
    case 'underline':
      return false;
    default:
      return '';
  }
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
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 3 });
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'template_image.png';
  link.click();
}


// Under Progress
// function addRowRegion(x, y, width, height, rowCount = 5) {
//   const fields = [];

//   const rowHeight = height / rowCount;
//   for (let i = 0; i < rowCount; i++) {
//     const text = new fabric.Text(`Row ${i + 1}`, {
//       left: x + 10,
//       top: y + i * rowHeight + rowHeight / 4,
//       fontSize: 16,
//       fill: 'black',
//       originX: 'left',
//       originY: 'top',
//       hasControls: false,
//       label: `Row ${i + 1}`
//     });
//     fields.push(text);
//   }

//   const container = new fabric.Rect({
//     left: x,
//     top: y,
//     width,
//     height,
//     fill: 'rgba(0, 0, 255, 0.05)',
//     stroke: 'blue',
//     strokeDashArray: [5, 5],
//     selectable: false
//   });

//   const group = new fabric.Group([container, ...fields], {
//     left: x,
//     top: y,
//     selectable: true,
//     objectCaching: false,
//     type: 'rowGroup',
//     metadata: { rows: rowCount }
//   });

//   canvas.add(group);
//   canvas.renderAll();
// }

// function promptRowRegion() {
//   const x = 100, y = 100, width = 400, height = 200; // Could use a drawn rectangle in future
//   const rows = parseInt(prompt("How many rows?"), 10);
//   if (!isNaN(rows) && rows > 0) {
//     addRowRegion(x, y, width, height, rows);
//   }
// }


