currentImageScale=1;

// Initialize canvas with container constraints the same as canvas-box, which is constrained by Bootstrap col
function initializeCanvas(cnvs=null) {
  const container = document.querySelector('.canvas-box');
  const containerWidth = container.clientWidth; // Account for scaling rounding, which can slightly cause overflow
  const containerHeight = container.clientHeight;
  if (!cnvs) {cnvs = canvas}
  cnvs.setDimensions({
  width: containerWidth,
  height: containerHeight
})
  cnvs.renderAll();

  return [containerWidth, containerHeight];
}

// Fit image within the fixed canvas bounds
function fitImageToCanvas(img, cnvs=null) {
  if (!cnvs) {cnvs = canvas;}
  const canvasWidth = cnvs.getWidth();
  const canvasHeight = cnvs.getHeight();
  
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

  cnvs.setDimensions({
    width: newW,
    height: newH
  }, false)

  cnvs.setBackgroundImage(img, cnvs.renderAll.bind(cnvs));
  cnvs.renderAll();
  console.log(cnvs.getWidth(), cnvs.getHeight(), img.width * scale, img.height* scale)
  return scale;
}

// Rescale all text objects when image scale changes
function rescaleTextObjects(scaleRatio, cnvs=null) {
  if (!cnvs) {cnvs = canvas;}
  cnvs.getObjects().filter(obj =>
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
function handleResize(cnvs=null) {
  if (!originalBgImg) return; 
  if (!cnvs) {cnvs = canvas;}
  setTimeout(() => {
    const container = document.querySelector('.canvas-box');
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    // Only resize if container size actually changed
    if (Math.abs(cnvs.getWidth() - newWidth) > 1.0 || 
        Math.abs(cnvs.getHeight() - newHeight) > 1.0) {
      
      cnvs.setWidth(newWidth);
      cnvs.setHeight(newHeight);
      fitImageToCanvas(originalBgImg);
    }
  }, 100);
}

async function fetchJSON(url) {
  try {
    const response = await fetch(url); // Make a GET request to the specified URL
    if (!response.ok) {
      // Check if the request was successful (status code 200-299)
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json(); // Parse the response body as JSON
    return jsonData; // Return the parsed JSON object
  } catch (error) {
    console.error("Error fetching JSON:", error);
    return null; // Or handle the error as appropriate for your application
  }
  // Example usage:
  /*
  const serverUrl = "https://example.com/api/data.json"; // Replace with your actual server URL
  fetchJSON(serverURL)
    .then((data) => {
      if (data) {
        console.log("JSON data received:", data);
        // You can now work with the 'data' object
        // For example: console.log(data.propertyName);
      } else {
        console.log("Failed to fetch JSON data.");
      }
    });
  */
}

function HideMainCanvas(bool) {
  const canvas0 = document.getElementsByClassName("canvas-col");
  canvas0[0].hidden = bool;
}