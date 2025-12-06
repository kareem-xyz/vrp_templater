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

async function downloadCanvas(fabricCanvas=canvas) {

  // If multipage is enabled and template confirms, generate pages but do NOT auto-download.
  // Instead show a modal with previews and options to download all or individual pages.
  if (mpswitch.checked && confirmMultipage(fabricCanvas)) {
    const pages = await processPages(fabricCanvas);
    if (!pages || pages.length === 0) {
      console.warn('No pages generated for multipage download');
      return false;
    }

    // Show modal with previews and controls
    createMultipageModal(pages, fabricCanvas?.title);
    return true;
  }

  // Single page -> use existing download flow (object-style)
  downloadImage({ _canvas: fabricCanvas });
}

// Create a simple modal that lists generated pages with preview and download controls.
function createMultipageModal(pages, titleBase='chart') {
  closeMultipageModal();

  // ensure CSS is loaded once
  if (!document.getElementById('multipage-modal-css')) {
    const link = document.createElement('link');
    link.id = 'multipage-modal-css';
    link.rel = 'stylesheet';
    link.href = 'css/multipage-modal.css';
    document.head.appendChild(link);
  }

  // Load modal HTML and card template from html/elements
  Promise.all([
    fetch('html/elements/multipage_modal.html').then(r => r.text()),
    fetch('html/elements/multipage_card.html').then(r => r.text())
  ]).then(([modalHtml, cardHtml]) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml.trim();
    const modal = wrapper.querySelector('#multipage-modal');
    const grid = modal.querySelector('#mp-grid');

    // For each page, clone the card template and fill values
    pages.forEach((pageCanvas, idx) => {
      const cardWrapper = document.createElement('div');
      cardWrapper.innerHTML = cardHtml.trim();
      const card = cardWrapper.firstElementChild;
      if (!card) return;

      const previewLink = (typeof generateURL === 'function')
        ? generateURL({ _canvas: pageCanvas, title: `${titleBase} (p${idx+1}-${pages.length})` })
        : null;
      const dataUrl = previewLink ? previewLink.href : (pageCanvas.toDataURL ? pageCanvas.toDataURL({ format: 'png' }) : null);

      const img = card.querySelector('.mp-img');
      if (img && dataUrl) img.src = dataUrl;

      const lbl = card.querySelector('.mp-label');
      if (lbl) lbl.textContent = `Page ${idx+1}`;

      const dl = card.querySelector('.mp-download');
      if (dl) dl.onclick = () => downloadImage({ _canvas: pageCanvas, title: `${titleBase} (p${idx+1}-${pages.length})` });

      grid.appendChild(card);
    });

    const downloadAllBtn = modal.querySelector('#mp-download-all');
    if (downloadAllBtn) downloadAllBtn.onclick = () => downloadAllPages(pages, titleBase);
  const downloadZipBtn = modal.querySelector('#mp-download-zip');
  if (downloadZipBtn) downloadZipBtn.onclick = () => downloadAllPages(pages=pages, titleBase=titleBase, zip=true);

    document.body.appendChild(modal);

    // Show using Bootstrap modal and remove element after hidden
    try {
      const bsModal = new bootstrap.Modal(modal);
      modal.addEventListener('hidden.bs.modal', () => modal.remove());
      bsModal.show();
    } catch (e) {
      // If bootstrap isn't available, fallback to just keeping the element visible
    }
  });
}

function closeMultipageModal() {
  const existing = document.getElementById('multipage-modal');
  if (!existing) return;
  try {
    const inst = bootstrap.Modal.getInstance(existing);
    if (inst) inst.hide();
    else existing.remove();
  } catch (e) {
    existing.remove();
  }
}

function downloadAllPages(pages, titleBase, zip = false, format = default_settings?.file_format) {
  if (zip) {
    return downloadAllZip(pages, titleBase, format);
  }

  if (!pages || pages.length === 0) return;
  for (let i = 0; i < pages.length; i++) {
    downloadImage({ _canvas: pages[i], title: `${titleBase} (p${i+1}-${pages.length})`, format: format});
  }
}

// Create a zip of all pages and trigger a single download. Loads JSZip from CDN if needed.
async function downloadAllZip(pages, titleBase="chart", format = default_settings?.file_format) {
  if (!pages || pages.length === 0) return;

  // Ensure fflate is available: try local vendor first, then CDN fallback
  if (typeof fflate === 'undefined') {
    // try local vendor
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/fflate.min.js';
      s.onload = resolve;
      s.onerror = resolve; // continue to CDN fallback on error
      document.head.appendChild(s);
    });
  }

  if (typeof fflate === 'undefined') {
    console.error('No zip library available (fflate)');
    return;
  }

  // Convert dataURL to Uint8Array
  const dataUrlToUint8 = async (dataUrl) => {
    const res = await fetch(dataUrl);
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  };

  const files = {};
  await Promise.all(pages.map(async (pageCanvas, i) => {
    const title = `${titleBase} (p${i+1}-${pages.length})`;
    // Reuse generateURL to get both data URL and sanitized filename
    let dataUrl = null;
    let filename = null;

    const link = generateURL({ _canvas: pageCanvas, title, format });
    dataUrl = link.href;
    filename = link.download || "chart";

    if (!dataUrl && pageCanvas.toDataURL) {
      dataUrl = pageCanvas.toDataURL({ format });
    }
    if (!dataUrl) return;

    const u8 = await dataUrlToUint8(dataUrl);
    files[filename] = u8;
  }));

  // Use fflate to zip synchronously
  try {
    const zipped = fflate.zipSync(files);
    const blob = new Blob([zipped], { type: 'application/zip' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    // Use generateURL to produce a sanitized zip name when possible
    let zipName = sanitizeFilename(titleBase) + ".zip";
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    console.error('Error zipping files', e);
  }
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

function updateMPSwitch(force=null) {
  let mpswitch = document.getElementById("multipage-switch");
  let refreshswitch = document.getElementById("multipage-refresh");

  if (force !== null) {
    mpswitch.checked = force;
  }

  let mp_mode_bool = mpswitch.checked; // true mode is multipage, false is single page
  canvas.multipage_enabled = mpswitch.checked;
  refreshswitch.hidden = !mp_mode_bool;

  if (mp_mode_bool) {
    HideMainCanvas(true);
    refreshPages();
  }

  else {
    HideMainCanvas(false);
    clearGeneratedPages();
  }

  console.log("Multi-page mode:", canvas.multipage_enabled);
}
