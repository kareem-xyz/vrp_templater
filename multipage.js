

function confirmMultipage(fabricCanvas) {
    // Safety
  if (!fabricCanvas) {
    console.error("No Canvas object passed");
    return false;
  }

  // Confirm Template is multipager, and has a multipage object
  if (!fabricCanvas.multipage_template) {
    console.error("Template/Canvas is not of multipage type");
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

function UpdateCustomValues(fabricCanvas) {
  fabricCanvas.getObjects().forEach(obj => {
    if (obj.type === "textbox" && obj.multipage_text == true) {
      obj.multipage_height = obj.height;
    }
  });
  return fabricCanvas;
}