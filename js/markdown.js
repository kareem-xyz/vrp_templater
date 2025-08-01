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