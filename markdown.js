function parseMarkdownToStyledText(mdText) {
  const lines = mdText.split('\n');
  let cleanText = '';
  let styles = {};

  lines.forEach((line, lineNum) => {
    let lineIndex = 0; // Local index per line

    // Handle indentation/bullets
    const indentMatch = line.match(/^(-+)\s*/);
    const indentLevel = indentMatch ? indentMatch[1].length : 0;
    line = line.replace(/^(-+)\s*/, '');
    const bulletIndent = '    '.repeat(Math.max(indentLevel - 1, 0));
    const bulletChar = indentLevel === 1 ? '• ' : indentLevel > 1 ? '◦ ' : '';
    const bullet = indentLevel > 0 ? `${bulletIndent}${bulletChar}` : '';

    cleanText += bullet;
    if (!styles[lineNum]) styles[lineNum] = {};
    for (let i = 0; i < bullet.length; i++) {
      styles[lineNum][lineIndex++] = {}; // Use line-local index
    }

    const styleStack = [];
    let i = 0;

    while (i < line.length) {
      if (
        line.slice(i, i + 2) === '**' &&
        canToggle(line, i, '**', styleStack, 'fontWeight')
      ) {
        toggleStyle(styleStack, 'fontWeight', 'bold');
        i += 2;
      } else if (
        line.slice(i, i + 2) === '~~' &&
        canToggle(line, i, '~~', styleStack, 'underline')
      ) {
        toggleStyle(styleStack, 'underline', true);
        i += 2;
      } else if (
        line[i] === '_' &&
        canToggle(line, i, '_', styleStack, 'fontStyle')
      ) {
        toggleStyle(styleStack, 'fontStyle', 'italic');
        i += 1;
      } else {
        const char = line[i];
        if (!styles[lineNum]) styles[lineNum] = {};
        styles[lineNum][lineIndex] = mergeStyles(styleStack);
        cleanText += char;
        lineIndex += 1;
        i += 1;
      }
    }

    cleanText += '\n';
  });

  return { cleanText: cleanText.trimEnd(), styles };

  // Toggle style on/off in the stack
  function toggleStyle(stack, key, value) {
    const existingIndex = stack.findIndex((s) => s.key === key);
    if (existingIndex !== -1) {
      stack.splice(existingIndex, 1);
    } else {
      stack.push({ key, value });
    }
  }

  // Merge all active styles in the stack into one object
  function mergeStyles(stack) {
    const styleObj = {};
    stack.forEach((s) => (styleObj[s.key] = s.value));
    return styleObj;
  }

  // Check if we should toggle this marker
  function canToggle(line, pos, marker, styleStack, styleKey) {
    const isStyleActive = styleStack.some((s) => s.key === styleKey);
    if (isStyleActive) {
      return true;
    } else {
      return line.indexOf(marker, pos + marker.length) !== -1;
    }
  }
}
