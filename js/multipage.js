let pagesArray = [];

function confirmMultipage(fabricCanvas) {
  if (!fabricCanvas) {
    console.error("No Canvas object passed");
    return false;
  }

  if (!(fabricCanvas.multipage_template)) {
    console.log("Template/Canvas is not of multipage type, or multipage is not enabled.");
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

async function processPages(fabricCanvas=null, desiredHeight=null) {
  clearGeneratedPages();
  HideMainCanvas(true);
  if (!fabricCanvas) {fabricCanvas = canvas;}

  let targetbox = null;
  let targetIndex = null;
  let targetPageIndex
  const objects = fabricCanvas.getObjects();
  
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj.type == 'textbox' && obj.multipage_text) {
      targetbox = obj;
      targetIndex = i;
      break;
    }
    if (obj.page_index) {
      targetPageIndex = i;
    }
  }

  if (!targetbox) return false;

  desiredHeight = targetbox.multipage_height;
const wrappedLines = targetbox._textLines.map(line => line.join(''));
const wrappedStyles = convertUnwrappedStylesToWrapped(targetbox);
  const lineHeights = [];

  for (i = 0; i < wrappedLines.length; i++) {
    lineHeights.push(targetbox.getHeightOfLine(i));
  }

  // const lineHeights = targetbox.getHeightOfLine(0);
  const [lineGroups, lineStyles] = processTextbox(wrappedLines, desiredHeight, lineHeights, wrappedStyles);
  
  // Clear existing pages array
  pagesArray = [];
  
  for (let i = 0; i < lineGroups.length; i++) {
    let pageCanvas = await makeNextPageCanvas(fabricCanvas, targetIndex, lineGroups[i], i, lineStyles[i]);
    await addPageIndex(pageCanvas, targetPageIndex, i+1, lineGroups.length);
    pageCanvas.renderAll();
    pagesArray.push(pageCanvas);
  }
  
  return pagesArray;
}

function processTextbox(wrappedLines, desiredHeight, lineHeights, wrappedStyles) {
  const TextBoxes = [];
  const TextStyles = [];

  let currHeight = 0;
  let lines = [];
  let linesStyles = [];

  for (let i = 0; i < lineHeights.length; i++) {
    const line = wrappedLines[i];
    const style = wrappedStyles[i] || {};

    currHeight += lineHeights[i];
    lines.push(line);
    linesStyles.push(style);

    if (currHeight >= desiredHeight || i === lineHeights.length - 1) {
      TextBoxes.push([...lines]);
      TextStyles.push(JSON.parse(JSON.stringify(linesStyles)));
      lines = [];
      linesStyles = [];
      currHeight = 0;
    }
  }


  return [TextBoxes, TextStyles];
}


function makeNextPageCanvas(fabricCanvas, objectTargetIndex, pageText, pageIndex, textstyle) {
  return new Promise((resolve) => {
    // Create the canvas element first
    const newCanvasElement = document.createElement('canvas');
    const canvasId = `canvas-page-${pageIndex}`;
    newCanvasElement.id = canvasId;
    newCanvasElement.width = fabricCanvas.getWidth();
    newCanvasElement.height = fabricCanvas.getHeight();
    
    let canvasDiv = document.getElementById("canvas-div");
    let housing_col = document.createElement('div');
    let housing_box = document.createElement('div');

    housing_col.classList.add("canvas-col","col");
    housing_box.classList.add("canvas-box");

    housing_box.appendChild(newCanvasElement);
    housing_col.appendChild(housing_box);
    canvasDiv.appendChild(housing_col);

    // Create new Fabric canvas
    const newCanvas = new fabric.Canvas(canvasId);
    
    // Copy canvas properties
    newCanvas.setBackgroundColor(fabricCanvas.backgroundColor);
    
    // Clone background image if it exists
    if (fabricCanvas.backgroundImage) {
      fabricCanvas.backgroundImage.clone((clonedBg) => {
        newCanvas.setBackgroundImage(clonedBg, () => {
          cloneObjectsToNewPage(fabricCanvas, newCanvas, objectTargetIndex, pageText, resolve, textstyle);
        });
      });
    } else {
      cloneObjectsToNewPage(fabricCanvas, newCanvas, objectTargetIndex, pageText, resolve, textstyle);
    }
  });
}

function cloneObjectsToNewPage(fabricCanvas, newCanvas, objectTargetIndex, pageText, resolve, textstyle) {
  const objects = fabricCanvas.getObjects();
  let clonedCount = 0;
  
  if (objects.length === 0) {
    newCanvas.renderAll();
    resolve(newCanvas);
    return;
  }
  
  objects.forEach((obj, index) => {
    obj.clone((clonedObj) => {
      if (index === objectTargetIndex) {
        clonedObj.text = pageText.join('\n');

        // Reconstruct style map
        const newStyleMap = {};
        for (let lineIndex = 0; lineIndex < textstyle.length; lineIndex++) {
          newStyleMap[lineIndex] = {};
          for (const [charIndex, style] of Object.entries(textstyle[lineIndex] || {})) {
            newStyleMap[lineIndex][parseInt(charIndex)] = style;
          }
        }

        clonedObj.styles = newStyleMap;
        clonedObj._styleMap = {}; // Let Fabric rebuild

        clonedObj.initDimensions();
        clonedObj.setCoords();

      }
      newCanvas.add(clonedObj);
      clonedCount++;
      
      if (clonedCount === objects.length) {
        newCanvas.renderAll();
        resolve(newCanvas);
      }
    });
  });
}

async function downloadCanvas(fabricCanvas=null) {
  if (!fabricCanvas) {
    fabricCanvas = canvas;
  }

  if (confirmMultipage(fabricCanvas)) {
    if (mpswitch.checked == false) {
      alert("Cannot Download Multiple pages with multipage switch Off.");
      return;
    }
    // Refresh and Download multiple pages.
    const pages = await processPages();
    const length = pages.length;
    for (let i = 0; i < length; i++) {
    let title = `${fabricCanvas.title} (p${i+1}-${length})`;
    downloadImage({_canvas:pages[i], title:title});
    }
    return;
  }
  
  downloadImage(fabricCanvas);
  return;
}

function UpdateCustomValues(fabricCanvas) {
  let mpdiv = document.getElementById('multipage-div');
  let mpswitch = document.getElementById("multipage-switch");

  if (!confirmMultipage(fabricCanvas)) {
    mpdiv.hidden = true;
    mpswitch.checked = false;
    fabricCanvas.multipage_enabled = false;
    fabricCanvas.multipage_template = false;
    return fabricCanvas;
  }

  fabricCanvas.getObjects().forEach(obj => {
    if (obj.type === "textbox" && obj.multipage_text == true) {
      mpdiv.hidden = false;
      mpswitch.checked = true;
      fabricCanvas.multipage_enabled = true;

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

function clearGeneratedPages() {
  const canvasDiv = document.getElementById("canvas-div");
  const children = Array.from(canvasDiv.children);
  
  // Remove all children except the first one
  for (let i = 1; i < children.length; i++) {
    canvasDiv.removeChild(children[i]);
  }
  
  // Clear the pages array as well
  pagesArray = [];

  // Re Enable the main canvas.
  HideMainCanvas(false);
  
  console.log("Cleared all generated pages");
}

async function refreshPages() {
  await processPages();
  console.log("Refreshed pages");
}
async function addPageIndex(canvas, pageObjectIndex, page_index, num_pages) {
  try {
  const objs = await canvas.getObjects()
  objs[pageObjectIndex].text = `Page (${page_index}-${num_pages})`
  return true;
  }
  catch{
    console.log("Error with writing page number.")
  }
}

function convertUnwrappedStylesToWrapped(textbox) {
  const fullText = textbox.text;
  const originalStyles = textbox.styles;
  const wrappedLines = textbox._textLines;
  const wrappedStyles = {};

  // Flatten wrapped lines into a list of [lineIndex, charIndex]
  const charMap = [];
  wrappedLines.forEach((line, lineIndex) => {
    line.forEach((char, charIndex) => {
      charMap.push({ lineIndex, charIndex });
    });
    charMap.push({ lineIndex: null, charIndex: null }); // line break
  });

  let textPointer = 0; // index in fullText
  let charPointer = 0; // index in charMap

  const lines = fullText.split('\n');
  for (let unwrappedLine = 0; unwrappedLine < lines.length; unwrappedLine++) {
    const line = lines[unwrappedLine];

    for (let i = 0; i < line.length; i++) {
      const style = originalStyles[unwrappedLine]?.[i];
      if (!style) {
        textPointer++;
        charPointer++;
        continue;
      }

      // Find the corresponding wrapped position
      const mapping = charMap[charPointer];
      if (!mapping || mapping.lineIndex == null) {
        console.warn("Could not map character", textPointer, "->", mapping);
        textPointer++;
        charPointer++;
        continue;
      }

      if (!wrappedStyles[mapping.lineIndex]) {
        wrappedStyles[mapping.lineIndex] = {};
      }

      wrappedStyles[mapping.lineIndex][mapping.charIndex] = style;

      textPointer++;
      charPointer++;
    }

    // Skip over newline
    textPointer++;
    charPointer++;
  }

  return wrappedStyles;
}

let mpswitch = document.getElementById("multipage-switch");
mpswitch.addEventListener('change', function () {
  canvas.multipage_enabled = mpswitch.checked;
  console.log("Multi-page mode:", canvas.multipage_enabled);
});