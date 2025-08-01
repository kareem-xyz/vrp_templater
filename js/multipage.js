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
  const lineHeight = targetbox.getHeightOfLine(0);
  const lineGroups = processTextbox(wrappedLines, desiredHeight, lineHeight);
  
  // Clear existing pages array
  pagesArray = [];
  
  for (let i = 0; i < lineGroups.length; i++) {
    let pageCanvas = await makeNextPageCanvas(fabricCanvas, targetIndex, lineGroups[i], i);
    await addPageIndex(pageCanvas, targetPageIndex, i+1, lineGroups.length);
    pageCanvas.renderAll();
    pagesArray.push(pageCanvas);
  }
  
  return pagesArray;
}

function processTextbox(textLines, desiredHeight, lineHeight) {
  let maxLines = Math.round(desiredHeight / lineHeight);
  
  if (textLines.length <= maxLines) {
    return [textLines.join('\n')];
  } else {
    let currentPageLines = textLines.slice(0, maxLines);
    let remainingLines = textLines.slice(maxLines);
    
    return [
      currentPageLines.join('\n'),
      ...processTextbox(remainingLines, desiredHeight, lineHeight)
    ];
  }
}

function makeNextPageCanvas(fabricCanvas, objectTargetIndex, pageText, pageIndex) {
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
          cloneObjectsToNewPage(fabricCanvas, newCanvas, objectTargetIndex, pageText, resolve);
        });
      });
    } else {
      cloneObjectsToNewPage(fabricCanvas, newCanvas, objectTargetIndex, pageText, resolve);
    }
  });
}

function cloneObjectsToNewPage(fabricCanvas, newCanvas, objectTargetIndex, pageText, resolve) {
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
        clonedObj.text = pageText; // Set the page-specific text
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

function cloneCanvas(originalCanvas, newId) {
  return new Promise((resolve) => {
    const newCanvasElement = document.createElement('canvas');
    const canvasId = "canvas" + newId;
    newCanvasElement.id = canvasId;
    newCanvasElement.width = originalCanvas.getWidth();
    newCanvasElement.height = originalCanvas.getHeight();
    
    let canvasDiv = document.getElementById("canvas-div");
    let housing_col = document.createElement('div');
    let housing_box = document.createElement('div');

    housing_col.classList.add("canvas-col","col");
    housing_box.classList.add("canvas-box");

    housing_box.appendChild(newCanvasElement);
    housing_col.appendChild(housing_box);
    canvasDiv.appendChild(housing_col);

    const newCanvas = new fabric.Canvas(canvasId);
    initializeCanvas(newCanvas);
    // Copy canvas properties
    newCanvas.setBackgroundColor(originalCanvas.backgroundColor);
    
    // Clone background image if it exists
    if (originalCanvas.backgroundImage) {
      originalCanvas.backgroundImage.clone((clonedBg) => {
        newCanvas.setBackgroundImage(clonedBg, () => {
          cloneObjectsOnly(originalCanvas, newCanvas, resolve);
        });
      });
    } else {
      cloneObjectsOnly(originalCanvas, newCanvas, resolve);
    }
  });
}

function cloneObjectsOnly(originalCanvas, newCanvas, resolve) {
  const objects = originalCanvas.getObjects();
  let clonedCount = 0;
  
  if (objects.length === 0) {
    newCanvas.renderAll();
    resolve(newCanvas);
    return;
  }
  
  objects.forEach(obj => {
    obj.clone(clonedObj => {
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
let mpswitch = document.getElementById("multipage-switch");
mpswitch.addEventListener('change', function () {
  canvas.multipage_enabled = mpswitch.checked;
  console.log("Multi-page mode:", canvas.multipage_enabled);
});