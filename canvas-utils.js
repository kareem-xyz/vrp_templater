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
  
  canvas.getObjects().filter(obj =>
  obj.type === 'text' || obj.type === 'textbox'
  ).forEach(obj => {
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

/*
                Old Handle resize function
// Responsive canvas handling with debouncing
function setupResponsiveCanvas(canvas, originalBgImg = null, currentImageScale = 1) {
  function handleResize() {
    setTimeout(() => {
      const container = document.querySelector('.canvas-box');
      const newWidth = container.clientWidth - 10;
      const newHeight = container.clientHeight - 10;
        
        canvas.setWidth(newWidth);
        canvas.setHeight(newHeight);
        
        // If there's a background image, refit it
        const bgImg = originalBgImg || canvas.backgroundImage;
        if (bgImg) {
          const newScale = fitImageToCanvas(canvas, bgImg);
          canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas));
          
          // Scale existing objects proportionally
          const scaleRatio = newScale / currentImageScale;
          rescaleTextObjects(canvas, scaleRatio);
          currentImageScale = newScale;
          
          canvas.renderAll();
    }
    }, 100);
  }

  // Handle window resize with debouncing
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 250);
  });
  */