const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const templateImg = new Image();
templateImg.src = '../templates_images/PatientIDEmpty.png'; // Make sure this file is in the same folder
templateImg.onload = () => {
  ctx.drawImage(templateImg, 0, 0);
};

function drawCenteredText(text, centerX, centerY, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  // Canvas text baseline is by default alphabetic, so adjust
  const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  ctx.fillText(text, centerX - textWidth / 2, centerY + actualHeight / 2);
}

function generateImage() {
  // Clear canvas + redraw template
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(templateImg, 0, 0);

  const name = document.getElementById('nameInput').value;
  const dob = document.getElementById('dobInput').value;
  const vrp = document.getElementById('vrpInput').value;
  const dr = document.getElementById('drInput').value;

  // Draw text at specified positions
  drawCenteredText(name, 550, 335, '50px Arial', 'black');
  drawCenteredText(dob, 550, 380, '20px Arial', 'black');
  drawCenteredText(vrp, 550, 410, '20px Arial', 'black');
  drawCenteredText(dr, 550, 440, '30px Arial', 'black');

  // Show download link
  const link = document.getElementById('downloadLink');
  link.href = canvas.toDataURL();
  link.style.display = 'inline';
}