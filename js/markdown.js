// Function 1: Convert markdown to HTML tokens using marked.js
function markdownToHtmlTokens(mdText) {
  // Configure marked with proper options for nested lists
  marked.setOptions({
    gfm: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
  });
  
  // Get tokens from marked lexer
  const tokens = marked.lexer(mdText);
  return tokens;
}

// Function 2: Convert HTML tokens to fabric.js styles and characters
function htmlTokensToStyledText(tokens, fontsize=1) {
  let cleanText = '';
  let styles = {};
  let lineNum = 0;

  function processTokens(tokenList, indentLevel = 0) {
    tokenList.forEach(token => {
      switch (token.type) {
        case 'paragraph':
          if (token.tokens) {
            processInlineTokens(token.tokens);
          } else if (token.text) {
            addStyledText(token.text, { fontSize: fontsize });
          }
          cleanText += '\n';
          lineNum++;
          break;
          
        case 'heading':
          // Handle headings with font size scaling
          const headingStyle = getHeadingStyle(token.depth, fontsize);
          if (token.tokens) {
            processInlineTokens(token.tokens, headingStyle);
          } else if (token.text) {
            addStyledText(token.text, headingStyle);
          }
          cleanText += '\n';
          lineNum++;
          break;
          
        case 'list':
          // Handle the list items with proper nesting
          if (token.items) {
            token.items.forEach((item, index) => {
              processListItem(item, indentLevel, token.ordered, index + 1);
            });
          }
          break;
          
        case 'text':
          addStyledText(token.text, { fontSize: fontsize });
          break;
          
        case 'space':
          cleanText += '\n';
          lineNum++;
          break;
          
        default:
          if (token.tokens) {
            processTokens(token.tokens, indentLevel);
          } else if (token.text) {
            addStyledText(token.text, { fontSize: fontsize });
          }
          break;
      }
    });
  }

  function processListItem(item, indentLevel, isOrdered = false, itemNumber = 1) {
    // Add bullet and indentation - using 2 spaces per indent level
    const bulletIndent = '  '.repeat(indentLevel);
    let bulletChar;
    
    if (isOrdered) {
      // For numbered lists, use the actual item number
      bulletChar = `${itemNumber}. `;
    } else {
      bulletChar = indentLevel === 0 ? '• ' : '◦ ';
    }
    
    const bullet = `${bulletIndent}${bulletChar}`;
    
    addStyledText(bullet, { fontSize: fontsize });
    
    // Process the item content with inline formatting
    if (item.tokens && item.tokens.length > 0) {
      // Process each token in the list item
      item.tokens.forEach(token => {
        if (token.type === 'text') {
          // Handle text tokens that might contain inline formatting
          if (token.tokens) {
            processInlineTokens(token.tokens, { fontSize: fontsize });
          } else {
            addStyledText(token.text, { fontSize: fontsize });
          }
        } else {
          // Handle other token types (paragraphs, etc.)
          processTokenContent(token);
        }
      });
    } else if (item.text) {
      // Fallback for simple text
      addStyledText(item.text, { fontSize: fontsize });
    }
    
    cleanText += '\n';
    lineNum++;
    
    // Handle nested lists - check if this item has nested items
    if (item.tokens) {
      item.tokens.forEach(token => {
        if (token.type === 'list') {
          processTokens([token], indentLevel + 1);
        }
      });
    }
  }

  function processTokenContent(token) {
    switch (token.type) {
      case 'paragraph':
        if (token.tokens) {
          processInlineTokens(token.tokens, { fontSize: fontsize });
        } else if (token.text) {
          addStyledText(token.text, { fontSize: fontsize });
        }
        break;
      case 'text':
        if (token.tokens) {
          processInlineTokens(token.tokens, { fontSize: fontsize });
        } else {
          addStyledText(token.text, { fontSize: fontsize });
        }
        break;
      default:
        if (token.tokens) {
          processInlineTokens(token.tokens, { fontSize: fontsize });
        } else if (token.text) {
          addStyledText(token.text, { fontSize: fontsize });
        }
        break;
    }
  }

  function processInlineTokens(inlineTokens, baseStyle = { fontSize: fontsize }) {
    if (!inlineTokens || !Array.isArray(inlineTokens)) return;
    
    inlineTokens.forEach(token => {
      switch (token.type) {
        case 'text':
          addStyledText(token.text, baseStyle);
          break;
          
        case 'strong':
          const strongStyle = { ...baseStyle, fontWeight: 'bold' };
          if (token.tokens && token.tokens.length > 0) {
            processInlineTokens(token.tokens, strongStyle);
          } else if (token.text) {
            addStyledText(token.text, strongStyle);
          }
          break;
          
        case 'em':
          const emStyle = { ...baseStyle, fontStyle: 'italic' };
          if (token.tokens && token.tokens.length > 0) {
            processInlineTokens(token.tokens, emStyle);
          } else if (token.text) {
            addStyledText(token.text, emStyle);
          }
          break;
          
        case 'del':
          const delStyle = { ...baseStyle, underline: true };
          if (token.tokens && token.tokens.length > 0) {
            processInlineTokens(token.tokens, delStyle);
          } else if (token.text) {
            addStyledText(token.text, delStyle);
          }
          break;
          
        case 'code':
          const codeStyle = { ...baseStyle, fontFamily: 'monospace', backgroundColor: '#f5f5f5' };
          addStyledText(token.text, codeStyle);
          break;
          
        default:
          if (token.tokens && token.tokens.length > 0) {
            processInlineTokens(token.tokens, baseStyle);
          } else if (token.text) {
            addStyledText(token.text, baseStyle);
          }
          break;
      }
    });
  }

  function addStyledText(text, style) {
    if (!text) return;
    if (!styles[lineNum]) styles[lineNum] = {};
    
    // Calculate the current line position (characters on current line)
    const lines = cleanText.split('\n');
    const currentLineText = lines[lineNum] || '';
    let lineIndex = currentLineText.length;
    
    for (let i = 0; i < text.length; i++) {
      styles[lineNum][lineIndex] = { ...style };
      lineIndex++;
    }
    
    cleanText += text;
  }

  // Helper function to get heading styles based on depth
  function getHeadingStyle(depth, fontsize=1) {
    const fontSizes = {
      1: 1.25,    // # - 1.25x size
      2: 1.15,    // ## - 1.15x size
      3: 1.10,    // ### - 1.10x size
      4: 1.05,    // #### - 1.05x size
      5: 1.025,   // ##### - 1.025x size
      6: 1.0      // ###### - normal size
    };
    
    return {
      fontSize: fontsize * (fontSizes[depth] || 1.0),
      fontWeight: 'bold'
    };
  }

  processTokens(tokens);
  
  return { cleanText: cleanText.trimEnd(), styles };
}

// Main function that maintains the same interface as the original
function parseMarkdownToStyledText(mdText, fontsize=1) {
  // Step 1: Convert markdown to HTML tokens using marked.js
  const tokens = markdownToHtmlTokens(mdText);
  
  // Step 2: Convert HTML tokens to fabric.js styles and characters
  return htmlTokensToStyledText(tokens, fontsize);
}

// Usage example:
// const result = parseMarkdownToStyledText(mdText);
// console.log(result.cleanText);
// console.log(result.styles);
// Replace parseMarkdownToStyledText function with this
// Replace parseMarkdownToStyledText function with this
// Map between Quill font keys and CSS font-family names
const QUILL_FONT_TO_CSS = {
  'arial': 'Arial',
  'arial-black': 'Arial Black',
  'comic-sans-ms': 'Comic Sans MS',
  'courier-new': 'Courier New',
  'georgia': 'Georgia',
  'impact': 'Impact',
  'times-new-roman': 'Times New Roman',
  'trebuchet-ms': 'Trebuchet MS',
  'verdana': 'Verdana',
  'serif': 'serif',
  'monospace': 'monospace'
};
const CSS_FONT_TO_QUILL = Object.fromEntries(
  Object.entries(QUILL_FONT_TO_CSS).map(([k,v]) => [v, k])
);

function parseQuillDeltaToStyledText(delta, baseFontSize = 1) {
  if (!delta || !delta.ops) return { cleanText: '', styles: {} };

  let lines = [];
  let currentText = '';
  let currentStyles = {};
  let charIndex = 0;

  // Track numbering for ordered lists per indent level
  const orderedCounters = {};

  function addRun(str, attrs) {
    if (!str) return;
    const style = convertQuillAttributesToFabric(attrs || {}, baseFontSize);
    for (let i = 0; i < str.length; i++) {
      currentStyles[charIndex] = { ...style };
      currentText += str[i];
      charIndex++;
    }
  }

  function applyAlignToLine(align) {
    if (!align) return;
    for (const k in currentStyles) {
      currentStyles[k] = { ...currentStyles[k], textAlign: align };
    }
  }

  function toRoman(num) {
  const romans = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  for (const [value, symbol] of romans) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}


function prependListPrefix(indentLevel = 0, listType) {
  if (!listType) return;

  const indentSpaces = '    '.repeat(indentLevel);
  let prefixText;

  if (listType === 'ordered') {
    const key = String(indentLevel);
    orderedCounters[key] = (orderedCounters[key] || 0) + 1;
    const num = orderedCounters[key];

    // Cycle through styles based on nesting depth
    const styleIndex = indentLevel % 3; 
    if (styleIndex === 0) {
      // Decimal: 1,2,3...
      prefixText = `${num}. `;
    } else if (styleIndex === 1) {
      // Alpha: a,b,c... (wrap after 26)
      const letter = String.fromCharCode(96 + ((num - 1) % 26) + 1);
      prefixText = `${letter}. `;
    } else if (styleIndex === 2) {
      // Roman numerals (wrap if needed)
      prefixText = `${toRoman(num).toLowerCase()}. `;
    }
  } else {
    // Bullets cycle as well if you want
    prefixText = indentLevel % 2 === 0 ? '• ' : '◦ ';
  }

  const prefix = indentSpaces + prefixText;

  // Shift existing styles to the right
  const shifted = {};
  const shiftBy = prefix.length;
  Object.keys(currentStyles).forEach(k => {
    shifted[parseInt(k, 10) + shiftBy] = currentStyles[k];
  });

  const baseStyle = convertQuillAttributesToFabric({}, baseFontSize);
  for (let i = 0; i < prefix.length; i++) shifted[i] = { ...baseStyle };

  currentStyles = shifted;
  currentText = prefix + currentText;
  charIndex += prefix.length;
}


function applyHeaderToLine(level, baseFontSize) {
  const multipliers = { 
    1: 1.865, 
    2: 1.45, 
    3: 1.15, 
    4: 1.0, 
    5: 0.90, 
    6: 0.75 
  };

  Object.keys(currentStyles).forEach(k => {
    const s = currentStyles[k] || {};
    const mult = level ? multipliers[level] : 1.0;
    s.fontSize = baseFontSize * mult;

    currentStyles[k] = s;
  });
}


function flushLine(blockAttrs) {
  if (blockAttrs && blockAttrs.list) {
    prependListPrefix(blockAttrs.indent || 0, blockAttrs.list);
  } else {
    for (const k in orderedCounters) orderedCounters[k] = 0;
  }

  if (blockAttrs && blockAttrs.align) applyAlignToLine(blockAttrs.align);

if (blockAttrs && 'header' in blockAttrs) {
  // Pass value directly (could be 1..6 or false)
  applyHeaderToLine(blockAttrs.header, baseFontSize);
}


  lines.push({ text: currentText, styles: currentStyles });
  currentText = '';
  currentStyles = {};
  charIndex = 0;
}



  delta.ops.forEach(op => {
    if (typeof op.insert !== 'string') return;

    let t = op.insert;
    const attrs = op.attributes || {};

    while (true) {
      const nl = t.indexOf('\n');
      if (nl === -1) {
        addRun(t, attrs);
        break;
      }
      const part = t.slice(0, nl);
      addRun(part, attrs);
      // newline encountered - block formats like list/align live here
      flushLine(attrs);
      t = t.slice(nl + 1);
    }
  });

  if (currentText.length) flushLine(null);

  let cleanText = '';
  let styles = {};
  lines.forEach((line, i) => {
    styles[i] = {};
    cleanText += line.text;
    Object.keys(line.styles).forEach(idx => {
      styles[i][parseInt(idx, 10)] = line.styles[idx];
    });
    if (i < lines.length - 1) cleanText += '\n';
  });

  return { cleanText, styles };

  // Updated to honor Quill font keys and sizes
  function convertQuillAttributesToFabric(attributes, baseFontSize) {
    const style = { fontSize: baseFontSize };

    if (attributes.bold) style.fontWeight = 'bold';
    if (attributes.italic) style.fontStyle = 'italic';
    if (attributes.underline) style.underline = true;
    if (attributes.strike) style.linethrough = true;
    if (attributes.color) style.fill = attributes.color;
    if (attributes.font) {
      style.fontFamily = QUILL_FONT_TO_CSS[attributes.font] || attributes.font;
    }

    if (attributes.header) {
      const headerMultipliers = { 1: 1.25, 2: 1.15, 3: 1.10, 4: 1.05, 5: 1.025, 6: 1.0 };
      style.fontSize = baseFontSize * (headerMultipliers[attributes.header] || 1.0);
      style.fontWeight = 'bold';
    } else if (attributes.size) {
      const sizeMultipliers = { small: 0.75, large: 1.5, huge: 2.5 };
      if (sizeMultipliers[attributes.size]) {
        style.fontSize = baseFontSize * sizeMultipliers[attributes.size];
      } else {
        const sizeValue = parseFloat(attributes.size);
        if (!isNaN(sizeValue)) style.fontSize = sizeValue;
      }
    }

    if (attributes.align) style.textAlign = attributes.align;
    return style;
  }
}


function fabricStylesToQuillDelta(text, styles, baseFontSize = 1) {
  if (!text) return { ops: [{ insert: '' }] };

  const ops = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineStyles = (styles && styles[lineIndex]) ? styles[lineIndex] : {};

    // detect indent and list prefix
    const leadingSpacesMatch = line.match(/^\s*/);
    const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0].length : 0;
    const indent = Math.floor(leadingSpaces / 2);

    // ordered like "12. " or unordered like "• " or "◦ "
    let contentStart = 0;
    let blockAttrs = {};
    const rest = line.slice(leadingSpaces);

    const orderedMatch = rest.match(/^(\d+)\.\s+/);
    const bulletMatch  = rest.match(/^(•|◦)\s+/);

    if (orderedMatch) {
      blockAttrs.list = 'ordered';
      contentStart = leadingSpaces + orderedMatch[0].length;
    } else if (bulletMatch) {
      blockAttrs.list = 'bullet';
      contentStart = leadingSpaces + bulletMatch[0].length;
    }
    if (blockAttrs.list && indent > 0) blockAttrs.indent = indent;

    // find dominant align on the line
    const alignCounts = {};
    Object.keys(lineStyles).forEach(k => {
      const a = lineStyles[k].textAlign;
      if (a) alignCounts[a] = (alignCounts[a] || 0) + 1;
    });
    const bestAlign = Object.entries(alignCounts).sort((a, b) => b[1] - a[1])[0];
    if (bestAlign && bestAlign[1] > 0) blockAttrs.align = bestAlign[0];

    // emit inline runs for the line content without the bullet prefix
    let i = contentStart;

    while (i < line.length) {
      const s = lineStyles[i] || {};
      let j = i + 1;
      for (; j <= line.length; j++) {
        const sj = lineStyles[j] || {};
        if (j === line.length) break;
        if (JSON.stringify(sj) !== JSON.stringify(s)) break;
      }
      const chunk = line.slice(i, j);
      const attrs = convertFabricToQuillInlineAttributes(s, baseFontSize);
      if (Object.keys(attrs).length) ops.push({ insert: chunk, attributes: attrs });
      else ops.push({ insert: chunk });
      i = j;
    }

    // newline carries block formats
    if (lineIndex < lines.length - 1) {
      if (Object.keys(blockAttrs).length) ops.push({ insert: '\n', attributes: blockAttrs });
      else ops.push({ insert: '\n' });
    }
  });

  return { ops };
}

function convertFabricToQuillInlineAttributes(style, baseFontSize) {
  const attributes = {};

  if (style.fontWeight === 'bold') attributes.bold = true;
  if (style.fontStyle === 'italic') attributes.italic = true;
  if (style.underline) attributes.underline = true;
  if (style.linethrough) attributes.strike = true;
  if (style.fill && style.fill !== 'black') attributes.color = style.fill;

  if (style.fontFamily) {
    attributes.font = CSS_FONT_TO_QUILL[style.fontFamily] || style.fontFamily;
  }

  // sizes as inline size, not header, to avoid surprising H1-H6 mapping
  if (style.fontSize && style.fontSize !== baseFontSize) {
    const ratio = style.fontSize / baseFontSize;
    if (ratio < 0.8) attributes.size = 'small';
    else if (ratio >= 2.0) attributes.size = 'huge';
    else if (ratio >= 1.4) attributes.size = 'large';
  }

  return attributes;
}
