// Global Variables
let pagesArray = [];
let canvas = new fabric.Canvas('canvas-0');
let fieldCount = 0;
const liveToggle = document.getElementById('livePreviewToggle');
let originalBgImg = null;
let originalImageData = null; // Store the base64 image data
let multipage_enabled = false;
let multipage_template = false;
let labs_enabled = false;
let default_settings = null;
let currentImageScale=1;
let QUILL_FONT_TO_CSS = {};
let CSS_FONT_TO_QUILL = {};
const Font = Quill.import('formats/font');
let mpswitch = document.getElementById("multipage-switch");


function main() {
    // Import Default settings
    fetchJSON("etc/default_settings.json")
    .then((data) => {
        if (data) {
        default_settings = data;
        console.log("Default settings loaded:", default_settings);
        }
    });

    // Import Templates
    fetch('templates_json/templates.json')
    .then(res => res.json())
    .then(files => {
        const selector = document.getElementById('templateSelector');
        files.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file.replace('.json', '').replace(/_/g, ' ');
        selector.appendChild(option);
        });
    })
    .catch(err => {
        console.error("Failed to load template list:", err);
    });

    // Multipage Switch Initilisation
    mpswitch.checked = false;
    mpswitch.addEventListener("change", ()=>{
    updateMPSwitch();
    });

    // Importing Fonts
    // Read fonts from default_settings if available, otherwise use fallback
    Font.whitelist = (typeof default_settings !== 'undefined' && default_settings && default_settings.fonts) 
    ? default_settings.fonts.map(font => font.toLowerCase().replace(/\s+/g, '-'))
    : ['serif', 'arial', 'arial-black', 'comic-sans-ms', 'courier-new', 'georgia', 'times-new-roman', 'trebuchet-ms', 'verdana', 'great-vibes'];
    Quill.register(Font, true);


    initializeCanvas();
    initializeFontMappings();
}

document.addEventListener('DOMContentLoaded', main());