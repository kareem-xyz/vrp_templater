const canvas = new fabric.Canvas('canvas');
const liveToggle = document.getElementById('livePreviewToggle');

fabric.Image.fromURL('templates_images/PatientIDEmpty.png', function(img) {
const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
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

function drawCenteredText(text, centerX, centerY, fontSize, color) {
const textObj = new fabric.Text(text, {
    left: centerX,
    top: centerY,
    fontSize: fontSize,
    fill: color,
    originX: 'center',
    originY: 'center'
});
canvas.add(textObj);
}

function generateImage() {
canvas.getObjects('text').forEach(obj => canvas.remove(obj));

const name = document.getElementById('nameInput').value;
const dob = document.getElementById('dobInput').value;
const vrp = document.getElementById('vrpInput').value;
const dr = document.getElementById('drInput').value;

drawCenteredText(name, 275, 167, 30, 'black');
drawCenteredText(dob, 275, 190, 16, 'black');
drawCenteredText(vrp, 275, 210, 16, 'black');
drawCenteredText(dr, 275, 235, 20, 'black');

canvas.renderAll();

const dataURL = canvas.toDataURL({ format: 'png' });
const link = document.getElementById('downloadLink');
link.href = dataURL;
link.style.display = 'inline';
}

// Attach live preview listeners
document.querySelectorAll('#nameInput, #dobInput, #vrpInput, #drInput').forEach(input => {
input.addEventListener('input', () => {
    if (liveToggle.checked) {
    generateImage();
    }
});
});