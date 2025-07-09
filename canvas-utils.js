currentImageScale=1;

// Initialize canvas with container constraints the same as canvas-box, which is constrained by Bootstrap col
function initializeCanvas() {
  const container = document.querySelector('.canvas-box');
  const containerWidth = container.clientWidth; // Account for scaling rounding, which can slightly cause overflow
  const containerHeight = container.clientHeight;

  canvas.setDimensions({
  width: containerWidth,
  height: containerHeight
})
  canvas.renderAll();

  return [containerWidth, containerHeight];
}

// Fit image within the fixed canvas bounds
function fitImageToCanvas(img) {
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  
  // Calculate scale to fit image within canvas bounds
  let scale = Math.min(
    canvasWidth / img.width, 
    canvasHeight / img.height
  );
    scale = scale.toFixed(7);
  // Store the current scale for object positioning
  currentImageScale = scale;
  
  // Center the image in the canvas
  const left = 0;
  const top = 0;
  
  img.set({
    scaleX: scale,
    scaleY: scale,
    left: left,
    top: top,
    originX: 'left',
    originY: 'top',
    selectable: false, // Prevent background image from being selected
    evented: false // Prevent background image from receiving events
  });
  
  // Scale existing text objects proportionally
  rescaleTextObjects(scale);
  let newW = img.width * scale;
  let newH = img.height * scale;

  canvas.setDimensions({
    width: newW,
    height: newH
  }, false)

  canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
  // canvas.setZoom(scale);
  canvas.renderAll();
  console.log(canvas.getWidth(), canvas.getHeight(), img.width * scale, img.height* scale)
  return scale;
}

// Rescale all text objects when image scale changes
function rescaleTextObjects(scaleRatio) {
  
  canvas.getObjects('text').forEach(obj => {
    // Store original data if not already stored
    if (!obj.originalData) {
      obj.originalData = {
        left: obj.left,
        top: obj.top,
        fontSize: obj.fontSize
      };
    }
    
    // Scale position and size
    let old_scale = obj.scaleX;
    obj.set({
      left: obj.left * scaleRatio / old_scale,
      top: obj.top * scaleRatio / old_scale,
      scaleX: scaleRatio,
      scaleY: scaleRatio
    });
    
    obj.setCoords();
  });
}

// Responsive canvas handling
function handleResize() {
  if (!originalBgImg) return; 
  setTimeout(() => {
    const container = document.querySelector('.canvas-box');
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    // Only resize if container size actually changed
    if (Math.abs(canvas.getWidth() - newWidth) > 1.0 || 
        Math.abs(canvas.getHeight() - newHeight) > 1.0) {
      
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);
      fitImageToCanvas(originalBgImg);
    }
  }, 100);
}

// /////////////////////////OOOLLLLLLDDD
// /**
//  * Shared Canvas Utilities for Template Builder and Loader
//  */

// // Initialize canvas with container constraints
// function initializeCanvas(canvas) {
//   const container = document.querySelector('.canvas-box');
//   const containerWidth = container.clientWidth - 10; // Account for padding/border
//   const containerHeight = container.clientHeight - 10;
  
//   canvas.setWidth(containerWidth);
//   canvas.setHeight(containerHeight);
//   canvas.renderAll();
// }

// // Fit image within the fixed canvas bounds
// function fitImageToCanvas(canvas, img) {
//   const canvasWidth = canvas.getWidth();
//   const canvasHeight = canvas.getHeight();
  
//   // Calculate scale to fit image within canvas bounds
//   const scale = Math.min(
//     canvasWidth / img.width, 
//     canvasHeight / img.height
//   );
  
//   // Position the image in the top left corner
//   const left = 0;
//   const top =0;
  
//   img.set({
//     scaleX: scale,
//     scaleY: scale,
//     left: left,
//     top: top,
//     originX: 'left',
//     originY: 'top',
//     selectable: false, // Prevent background image from being selected
//     evented: false // Prevent background image from receiving events
//   });
  
//   return scale; // Return the scale for scaling other objects
// }

// // Scale all text objects in a canvas proportionally, given ratio
// function rescaleTextObjects(canvas, scaleRatio) {
//   if (Math.abs(scaleRatio - 1) < 0.001) return;

//   canvas.getObjects('text').forEach(obj => {
//     if (!obj.originalData) {
//       obj.originalData = {
//         fontSize: obj.fontSize
//       };
//     }

//     const newFontSize = obj.originalData.fontSize * scaleRatio;
//     obj.set({
//       fontSize: newFontSize
//     });
//     obj.setCoords();
//   });
// }


// // Download current canvas as image
// function downloadCanvasImage(canvas, filename = 'canvas-image.png') {
//   const dataURL = canvas.toDataURL({
//     format: 'png',
//     quality: 1,
//     multiplier: 2 // Higher resolution export
//   });
  
//   const a = document.createElement('a');
//   a.href = dataURL;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
// }

// // Responsive canvas handling with debouncing
// function setupResponsiveCanvas(canvas, originalBgImg = null, currentImageScale = 1) {
//   function handleResize() {
//     setTimeout(() => {
//       const container = document.querySelector('.canvas-box');
//       const newWidth = container.clientWidth - 10;
//       const newHeight = container.clientHeight - 10;
        
//         canvas.setWidth(newWidth);
//         canvas.setHeight(newHeight);
        
//         // If there's a background image, refit it
//         const bgImg = originalBgImg || canvas.backgroundImage;
//         if (bgImg) {
//           const newScale = fitImageToCanvas(canvas, bgImg);
//           canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas));
          
//           // Scale existing objects proportionally
//           const scaleRatio = newScale / currentImageScale;
//           rescaleTextObjects(canvas, scaleRatio);
//           currentImageScale = newScale;
          
//           canvas.renderAll();
//     }
//     }, 100);
//   }

//   // Handle window resize with debouncing
//   let resizeTimeout;
//   window.addEventListener('resize', function() {
//     clearTimeout(resizeTimeout);
//     resizeTimeout = setTimeout(handleResize, 250);
//   });
  
//   return handleResize; // Return the function for manual calls
// }

// // Create style toggle buttons (Bold, Italic, Font, Center-align)
// function createStyleButtons(canvas, obj, updatePanelCallback) {
//   const group = document.createElement('div');
//   group.className = 'btn-group btn-group-sm';

//   // Bold
//   const boldBtn = document.createElement('button');
//   boldBtn.innerHTML = '<strong>B</strong>';
//   boldBtn.className = `btn btn-outline-secondary ${obj.fontWeight === 'bold' ? 'active' : ''}`;
//   boldBtn.title = 'Toggle Bold';
//   boldBtn.onclick = () => {
//     obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
//     canvas.renderAll();
//     if (updatePanelCallback) updatePanelCallback();
//   };
//   group.appendChild(boldBtn);

//   // Italic
//   const italicBtn = document.createElement('button');
//   italicBtn.innerHTML = '<em>I</em>';
//   italicBtn.className = `btn btn-outline-secondary ${obj.fontStyle === 'italic' ? 'active' : ''}`;
//   italicBtn.title = 'Toggle Italic';
//   italicBtn.onclick = () => {
//     obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
//     canvas.renderAll();
//     if (updatePanelCallback) updatePanelCallback();
//   };
//   group.appendChild(italicBtn);

//   // Font family
//   const fontBtn = document.createElement('button');
//   fontBtn.innerText = 'Font';
//   fontBtn.className = 'btn btn-outline-secondary';
//   fontBtn.title = 'Change Font Family';
//   fontBtn.onclick = () => {
//     // Font selection modal logic would go here
//     console.log('Font selection not implemented yet');
//   };
//   group.appendChild(fontBtn);

//   // Center-align
//   const alignBtn = document.createElement('button');
//   alignBtn.innerText = 'C';
//   alignBtn.className = `btn btn-outline-secondary ${obj.textAlign === 'center' ? 'active' : ''}`;
//   alignBtn.title = 'Toggle Center Align';
//   alignBtn.onclick = () => {
//     const newAlign = obj.textAlign === 'center' ? 'left' : 'center';
//     obj.set('textAlign', newAlign);
//     obj.set({
//       originX: newAlign === 'center' ? 'center' : 'left'
//     });
//     canvas.renderAll();
//     if (updatePanelCallback) updatePanelCallback();
//   };
//   group.appendChild(alignBtn);

//   return group;
// }

// // Save template as JSON (builder specific but could be generalized)
// function saveTemplateAsJSON(canvas, filename = 'template.json') {
//   // Export the full canvas state. Include any extra props (e.g. 'label').
//   const jsonObj = canvas.toJSON(['label']);

//   // Convert to string with indentation for readability
//   const jsonStr = JSON.stringify(jsonObj, null, 2);

//   // Build a Blob and temporary download link
//   const blob = new Blob([jsonStr], { type: 'application/json' });
//   const url  = URL.createObjectURL(blob);
//   const link = document.createElement('a');

//   link.href     = url;
//   link.download = filename;
//   document.body.appendChild(link);

//   // Trigger download
//   link.click();

//   // Clean up
//   document.body.removeChild(link);
//   URL.revokeObjectURL(url);
// }

// // Load template list from JSON file
// function loadTemplateList(selector, templatesPath = 'templates_json/templates.json') {
//   return fetch(templatesPath)
//     .then(res => res.json())
//     .then(files => {
//       files.forEach(file => {
//         const option = document.createElement('option');
//         option.value = file;
//         option.textContent = file.replace('.json', '').replace(/_/g, ' ');
//         selector.appendChild(option);
//       });
//       return files;
//     })
//     .catch(err => {
//       console.error("Failed to load template list:", err);
//       throw err;
//     });
// }