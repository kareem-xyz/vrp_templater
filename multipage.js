

function confirmMultipage(fabricCanvas) {
    // Safety
  if (!fabricCanvas) {
    console.error("No Canvas object passed");
    return false;
  }

  // Confirm Template is multipager and has multipaging enabled.
  if (!(fabricCanvas.multipage_template && fabricCanvas.multipage_enabled)) {
    console.error("Template/Canvas is not of multipage type, or multipage is not enabled.");
    return false;
  }

  const objects = fabricCanvas.getObjects();
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj.type == 'textbox' && obj.multipage_text) {
      return true;
    }
  }

    console.error("Template is multipage, but no object is multipage, or Object has not Text")
    return false;
}

function processPages(fabricCanvas, desiredHeight=null) {
  let targetbox = null;
  let targetIndex = null;
  const objects = fabricCanvas.getObjects();
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj.type == 'textbox' && obj.multipage_text) {
      targetbox = obj;
      targetIndex = i;
      break;
    }
  }

  desiredHeight = targetbox.multipage_height;

  const wrappedLines = targetbox._textLines.map(line => line.join(''));
  const lineHeight = targetbox.getHeightOfLine(0);
  const lineGroups = processTextbox(wrappedLines, desiredHeight, lineHeight);

  lineGroups.forEach(element => {
    let tempCanvas = fabricCanvas;
    tempCanvas.getObjects()[targetIndex].text = element;
    downloadImage()
  });
  return true;
}

// Returns a group of lists (lines), where each groups fits one page.
function processTextbox(textLines, desiredHeight, lineHeight) {
  let maxLines = Math.round(desiredHeight / lineHeight);
  
  if (textLines.length <= maxLines) {
    // Fits on one page
    return [textLines.join('\n')]
  } else {
    // Needs pagination
    let currentPageLines = textLines.slice(0, maxLines)
    let remainingLines = textLines.slice(maxLines)
    
    return [
      currentPageLines.join('\n'),
      ...processTextbox(remainingLines, desiredHeight, lineHeight)
    ]
  }
}

function downloadCanvas(fabricCanvas=null) {
  if (!fabricCanvas) {
    fabricCanvas = canvas;
  }

  if (confirmMultipage(fabricCanvas)) {
    processPages(fabricCanvas);
    console.log("Downloading multi page\n")
    return;
  }
  downloadImage(fabricCanvas);
  console.log("Downloading single page\n")
}

// Particularly related to the multipage feature.
function UpdateCustomValues(fabricCanvas) {
  fabricCanvas.getObjects().forEach(obj => {
    if (obj.type === "textbox" && obj.multipage_text == true) {
      // Show the controls for multipage. On by default.
      const mpdiv = document.getElementById('multipage-div');
      const mpswitch = document.getElementById("multipage-switch");

      mpdiv.hidden = false;
      mpswitch.checked = true;

      // Deny Graphical Scaling because it messes up the height/scale x/y values.
      obj.set({
      multipage_height: obj.height,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: true,
      });
    }
  });
  return fabricCanvas;
}

let mpswitch = document.getElementById("multipage-switch");
mpswitch.addEventListener('change', function () {
  canvas.multipage_enabled = mpswitch.checked;
  console.log("Multi-page mode:", canvas.multipage_enabled);
});