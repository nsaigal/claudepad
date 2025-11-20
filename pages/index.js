import Head from "next/head";
import { useEffect, useState, useRef, useCallback } from "react";
import { Geist_Mono } from "next/font/google";
import { Wrench, Download, Wand2, Copy, X, Undo2, HelpCircle } from "lucide-react";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Local storage keys for persisting user data
const STORAGE_KEY = "claudepad-state-v1";
const CUSTOM_INSTRUCTIONS_KEY = "claudepad-custom-instructions-v1";

/**
 * Spark component - creates a single sparkle particle for typing magic effect
 */
function Spark({ x, y }) {
  const size = Math.random() * 4 + 2;
  const duration = Math.random() * 0.5 + 0.3;
  const offsetX = (Math.random() - 0.5) * 30;
  const offsetY = Math.random() * -40 - 15;

  return (
    <div
      className="typing-spark"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        animation: `spark ${duration}s ease-out forwards`,
        "--spark-offset-x": `${offsetX}px`,
        "--spark-offset-y": `${offsetY}px`,
      }}
    />
  );
}

/**
 * TypingMagic component - creates the sparkle effect when typing
 * Shows glowing ripples and sparks at the cursor position
 */
function TypingMagic({ x, y }) {
  const sparkCount = Math.floor(Math.random() * 3) + 3; // 3-5 sparks
  
  return (
    <>
      {/* Glowing ripple layers that expand outward */}
      <div
        className="typing-ripple typing-ripple-outer"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          animation: `ripple-outer 0.8s ease-out forwards`,
        }}
      />
      <div
        className="typing-ripple typing-ripple-inner"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          animation: `ripple-inner 0.6s ease-out 0.1s forwards`,
        }}
      />
      {/* Sparks */}
      {Array.from({ length: sparkCount }).map((_, i) => (
        <Spark
          key={i}
          x={x + (Math.random() - 0.5) * 10}
          y={y + (Math.random() - 0.5) * 5}
        />
      ))}
    </>
  );
}

function FreewriteLogo({ isLoading }) {
  return (
    <>
      <div className={`freewrite-logo ${isLoading ? 'logo-loading' : ''}`}>
        <span className="logo-text">CLAUDEPAD</span>
        {isLoading && <span className="logo-fill" />}
      </div>
      <div className="freewrite-blurb">
        a freewriting tool powered by LLMs
      </div>
    </>
  );
}

export default function Home() {
  const [content, setContent] = useState("");
  const [typingMagic, setTypingMagic] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [placeholder, setPlaceholder] = useState("type something, when you're ready for edits click ⌘ + enter");
  const [isMac, setIsMac] = useState(true);
  const [hasStagedEdits, setHasStagedEdits] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [saveIndicator, setSaveIndicator] = useState({ show: false, time: null });
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [hasApiKeySaved, setHasApiKeySaved] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState(null);
  const [promptPopupVisible, setPromptPopupVisible] = useState(false);
  const [highlightPrompt, setHighlightPrompt] = useState("");
  const [promptPopupPosition, setPromptPopupPosition] = useState({ x: 0, y: 0 });
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [contentHistory, setContentHistory] = useState([]);
  const declinedEditsRef = useRef([]);
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const selectionRangeRef = useRef(null);
  const lastContentRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.content === "string" && textareaRef.current) {
          setContent(parsed.content);
          // Set text content (not HTML) for initial load
          textareaRef.current.textContent = parsed.content;
          lastContentRef.current = parsed.content;
        }
      } catch (error) {
        console.warn("Unable to restore editor state:", error);
      }
    } else {
      // No stored content, ensure empty class is set
      if (textareaRef.current) {
        textareaRef.current.classList.add('empty');
      }
      lastContentRef.current = "";
    }

    // Load custom instructions
    const storedInstructions = window.localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY);
    if (storedInstructions) {
      setCustomInstructions(storedInstructions);
    }

    // Check if API key is already saved
    fetch("/api/check-api-key")
      .then((res) => res.json())
      .then((data) => {
        setHasApiKeySaved(data.hasApiKey);
      })
      .catch(() => {
        // Ignore errors
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload = JSON.stringify({ content });
    window.localStorage.setItem(STORAGE_KEY, payload);
    
    // Don't show save indicator on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // Show save indicator
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    setSaveIndicator({ show: true, time: timeString });
    
    // Hide after 2 seconds
    const timeoutId = setTimeout(() => {
      setSaveIndicator({ show: false, time: null });
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [content]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, customInstructions);
  }, [customInstructions]);

  const saveApiKey = async () => {
    try {
      const response = await fetch("/api/store-api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: anthropicApiKey }),
      });

      if (response.ok) {
        setHasApiKeySaved(!!anthropicApiKey.trim());
        setToastMessage("API key saved");
        setTimeout(() => {
          setToastMessage("");
        }, 2000);
      } else {
        const error = await response.json();
        setToastMessage(`Error: ${error.error || "Failed to save"}`);
        setTimeout(() => {
          setToastMessage("");
        }, 3000);
      }
    } catch (error) {
      setToastMessage("Error saving API key");
      setTimeout(() => {
        setToastMessage("");
      }, 3000);
    }
  };

  useEffect(() => {
    // Auto-focus the editor on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Detect platform and set appropriate placeholder
    if (typeof window !== "undefined") {
      const platformIsMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      setIsMac(platformIsMac);
      setPlaceholder(platformIsMac 
        ? "type something, when you're ready for edits press ⌘ + enter" 
        : "type something, when you're ready for edits press ctrl + enter");
    }
  }, []);

  useEffect(() => {
    // Update placeholder visibility based on content
    if (textareaRef.current) {
      const isEmpty = !content.trim();
      if (isEmpty) {
        textareaRef.current.classList.add('empty');
      } else {
        textareaRef.current.classList.remove('empty');
      }
    }
  }, [content]);

  useEffect(() => {
    // Check for staged edits by examining the HTML
    const checkStagedEdits = () => {
      if (textareaRef.current) {
        const editContainers = textareaRef.current.querySelectorAll('.edit-container');
        setHasStagedEdits(editContainers.length > 0);
      }
    };
    
    checkStagedEdits();
    
    // Also check after a short delay to catch DOM updates
    const timeoutId = setTimeout(checkStagedEdits, 100);
    return () => clearTimeout(timeoutId);
  }, [content]);

  useEffect(() => {
    // Set up event delegation for accept/decline buttons
    const handleEditAction = (event) => {
      const target = event.target;
      const editor = textareaRef.current;
      if (!editor) return;

      // Check if clicked on accept or decline button
      if (target.classList.contains('edit-accept') || target.classList.contains('edit-decline')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        const container = target.closest('.edit-container');
        if (!container) return;

        const original = container.getAttribute('data-original');
        const edit = container.getAttribute('data-edit');
        
        if (target.classList.contains('edit-accept')) {
          // Save the original text (before this edit) to history
          const tempContainer = document.createElement('div');
          tempContainer.innerHTML = editor.innerHTML;
          const thisContainer = tempContainer.querySelector(`[data-edit-id="${container.getAttribute('data-edit-id')}"]`);
          if (thisContainer) {
            const original = thisContainer.getAttribute('data-original');
            const textNode = document.createTextNode(original);
            thisContainer.parentNode.replaceChild(textNode, thisContainer);
          }
          const cleanContent = tempContainer.innerText || tempContainer.textContent || "";
          setContentHistory(prev => {
            if (prev.length === 0 || prev[prev.length - 1] !== cleanContent) {
              return [...prev, cleanContent].slice(-10);
            }
            return prev;
          });
          
          // Accept: replace container with just the edit (normal color, no special styling)
          const textNode = document.createTextNode(edit);
          if (container.parentNode) {
            container.parentNode.replaceChild(textNode, container);
          }
          
          // Update content state
          const newContent = editor.innerText || editor.textContent || "";
          setContent(newContent);
          lastContentRef.current = newContent;
        } else {
          // Decline: replace container with just the original text
          const textNode = document.createTextNode(original);
          if (container.parentNode) {
            container.parentNode.replaceChild(textNode, container);
          }
          // Track declined edit as full object
          const editedText = container.querySelector('.edited-text');
          const editType = editedText?.classList.contains('improvement') ? 'improvement' : 'typo';
          const editText = edit;
          
          const declinedEdit = {
            type: editType,
            original: original.trim(),
            [editType === 'improvement' ? 'improvement' : 'typo']: editText.trim()
          };
          
          // Check if this exact edit was already declined
          const isDuplicate = declinedEditsRef.current.some(e => 
            e.type === declinedEdit.type &&
            e.original === declinedEdit.original &&
            e[editType] === declinedEdit[editType]
          );
          
          if (!isDuplicate) {
            declinedEditsRef.current.push(declinedEdit);
          }
          
          // Update content state
          const newContent = editor.innerText || editor.textContent || "";
          setContent(newContent);
          lastContentRef.current = newContent;
        }
      }
    };

    const editor = textareaRef.current;
    if (editor) {
      editor.addEventListener('click', handleEditAction, true);
      return () => {
        editor.removeEventListener('click', handleEditAction, true);
      };
    }
  }, []);

  useEffect(() => {
    // Handle text selection to show inline toolbar
    const handleSelection = () => {
      const selection = window.getSelection();
      const editor = textareaRef.current;
      
      // Don't handle if interacting with toolbar or popup
      const activeElement = document.activeElement;
      if (activeElement?.closest('.selection-toolbar') || activeElement?.closest('.highlight-prompt-popup')) {
        return;
      }

      if (!editor || !selection || selection.rangeCount === 0) {
        setToolbarVisible(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      
      // Check if selection is within the editor
      if (!editor.contains(range.commonAncestorContainer)) {
        setToolbarVisible(false);
        return;
      }

      // Don't show toolbar if clicking on edit controls
      const clickedElement = selection.anchorNode?.parentElement;
      if (clickedElement?.closest('.edit-controls') || clickedElement?.closest('.edit-container')) {
        setToolbarVisible(false);
        return;
      }

      if (selectedText && selectedText.length > 0) {
        // Save the range for later use
        selectionRangeRef.current = range.cloneRange();
        setSelectedText(selectedText);
        
        // Calculate toolbar position (above the selection, centered)
        // Use getBoundingClientRect which gives viewport coordinates
        const rect = range.getBoundingClientRect();
        
        setToolbarPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        
        setToolbarVisible(true);
      } else {
        setToolbarVisible(false);
      }
    };

    const handleMouseUp = (e) => {
      // Don't handle if clicking inside toolbar or popup
      if (e.target?.closest('.selection-toolbar') || e.target?.closest('.highlight-prompt-popup')) {
        return;
      }
      setTimeout(handleSelection, 10);
    };

    const handleClickOutside = (e) => {
      // Close toolbar if clicking outside
      if (toolbarVisible && !e.target?.closest('.selection-toolbar') && !e.target?.closest('.highlight-prompt-popup')) {
        // Don't close if clicking in editor (might be selecting text)
        if (!textareaRef.current?.contains(e.target)) {
          setToolbarVisible(false);
        }
      }
      
      // Close popup if clicking outside
      if (promptPopupVisible) {
        if (!e.target?.closest('.highlight-prompt-popup') && !e.target?.closest('.selection-toolbar')) {
          if (!textareaRef.current?.contains(e.target)) {
            setPromptPopupVisible(false);
            setHighlightPrompt("");
          }
        }
      }
    };

    const editor = textareaRef.current;
    if (editor) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('click', handleClickOutside);
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [toolbarVisible, promptPopupVisible]);

  /**
   * Handle typing in the editor
   * Shows a subtle magic sparkle effect on each keystroke
   */
  const handleInput = (event) => {
    const editor = event.target;
    const newContent = editor.innerText || editor.textContent || "";
    const isTyping = newContent.length > content.length;
    
    // Update placeholder visibility
    const isEmpty = !newContent.trim();
    if (isEmpty) {
      editor.classList.add('empty');
    } else {
      editor.classList.remove('empty');
    }


    if (isTyping && editor && containerRef.current) {
      const container = containerRef.current;
      
      // Get cursor position using Selection API
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      
      if (range) {
        // Create a temporary range to measure cursor position
        const tempRange = range.cloneRange();
        tempRange.collapse(true);
        
        const rect = tempRange.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate position relative to container
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;
        
        // Create subtle typing magic effect
        const magicId = Math.random();
        setTypingMagic((prev) => [...prev, { id: magicId, x, y }]);
        
        // Remove magic after animation
        setTimeout(() => {
          setTypingMagic((prev) => prev.filter((m) => m.id !== magicId));
        }, 1200);
      }
    }
    
    setContent(newContent);
    lastContentRef.current = newContent;
  };

  /**
   * Call Claude API to get editing suggestions for the entire document
   * 
   * This is the main editing function that:
   * 1. Sends the document to Claude with system prompt for editing
   * 2. Receives typo corrections and improvements
   * 3. Applies them with collaborative cursor animations
   * 4. Tracks declined edits so Claude won't suggest them again
   */
  const callClaude = async () => {
    if (!content.trim() || isLoading) {
      return;
    }

    // Prevent regeneration if there are staged edits (user must accept/decline first)
    if (hasStagedEdits) {
      setToastMessage("Please accept or decline all staged edits before regenerating");
      setTimeout(() => {
        setToastMessage("");
      }, 3000);
      return;
    }

    setIsLoading(true);
    const currentContent = content;
    // Send declined edits so Claude won't suggest the same changes again
    const declinedEdits = Array.from(declinedEditsRef.current);

    try {
      const payload = {
        message: currentContent,
        declinedEdits: declinedEdits.length > 0 ? declinedEdits : undefined,
        customInstructions: customInstructions.trim() || undefined,
      };

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || "Failed to get response";
        
        // Add specific handling for authentication errors
        if (response.status === 401 || errorMessage.includes("invalid x-api-key") || errorMessage.includes("authentication")) {
          throw new Error("Invalid API key. Please check your API key in Settings.");
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      console.log('API Response:', data);
      console.log('Number of edits:', data.response?.length);
      
      // Apply edits with collaborative animation
      if (data.response && Array.isArray(data.response) && data.response.length > 0 && textareaRef.current) {
        const editor = textareaRef.current;
        let htmlContent = editor.innerHTML;
        
        /**
         * Check if a match in plain text is a whole word (not part of a larger word)
         * Used to avoid matching partial words (e.g., "an" inside "and")
         */
        const isWholeWordMatch = (textContent, matchIndex, matchLength) => {
          const charBefore = matchIndex > 0 ? textContent[matchIndex - 1] : '';
          const charAfter = matchIndex + matchLength < textContent.length 
            ? textContent[matchIndex + matchLength] 
            : '';
          
          // Word boundary: not a letter, digit, or underscore
          const isWordChar = (char) => /[\w]/.test(char);
          
          return !isWordChar(charBefore) && !isWordChar(charAfter);
        };
        
        /**
         * Find text positions in HTML content
         * 
         * This is one of the most complex parts of the app. It needs to:
         * 1. Search for text in the visible content (ignoring HTML tags)
         * 2. Map those positions back to the HTML string (including tags)
         * 3. Handle whitespace normalization for improvements
         * 4. Support word boundaries for typo corrections
         * 
         * @param {string} htmlContent - The HTML string to search in
         * @param {string} searchText - The text to find
         * @param {boolean} useWordBoundaries - Whether to match whole words only
         * @param {boolean} isTypo - Whether this is a typo correction (affects matching strategy)
         * @returns {Array} Array of {index, length} objects representing matches in HTML
         */
        const findTextPositionsInHTML = (htmlContent, searchText, useWordBoundaries = true, isTypo = false) => {
          // Extract plain text from HTML (strips all tags)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          const textContent = tempDiv.textContent || tempDiv.innerText || '';
          
          const htmlMatches = [];
          
          // Normalize whitespace for comparison (multiple spaces/newlines become single space)
          // This helps match text even if formatting differs slightly
          const normalizedText = textContent.replace(/\s+/g, ' ');
          
          // Find all matches in the text content
          let searchIndex = 0;
          while (true) {
            let matchIndex;
            let matchLength;
            let usedExactMatch = false;
            
            if (useWordBoundaries) {
              // For typos: find word boundaries in original text (don't normalize)
              const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escapedText}\\b`);
              const match = textContent.substring(searchIndex).match(regex);
              if (!match) break;
              matchIndex = searchIndex + match.index;
              matchLength = searchText.length;
            } else {
              // For typos without word boundaries: try exact match first
              if (isTypo) {
                const exactMatchIndex = textContent.indexOf(searchText, searchIndex);
                if (exactMatchIndex !== -1) {
                  matchIndex = exactMatchIndex;
                  matchLength = searchText.length;
                  usedExactMatch = true;
                } else {
                  // Fallback to normalized matching
                  const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
                  matchIndex = normalizedText.indexOf(normalizedSearch, searchIndex);
                  if (matchIndex === -1) break;
                  matchLength = normalizedSearch.length;
                }
              } else {
                // For improvements: normalize and find exact match
                const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
                matchIndex = normalizedText.indexOf(normalizedSearch, searchIndex);
                if (matchIndex === -1) break;
                matchLength = normalizedSearch.length;
              }
            }
            
            /**
             * Map the match position from normalized text back to actual text position
             * This is needed because we normalized whitespace earlier, but now need
             * to work with the original text that has the actual spacing
             */
            let actualStart;
            let actualEnd;
            
            if (useWordBoundaries || (isTypo && usedExactMatch)) {
              // For typos with word boundaries: matchIndex is already in actual text coordinates
              actualStart = matchIndex;
              actualEnd = matchIndex + matchLength;
            } else {
              // For improvements: we matched in normalized text, now map back to actual text
              // Walk through actual text, counting normalized positions
              let actualPos = 0;
              let normalizedPos = 0;
              
              while (normalizedPos < matchIndex && actualPos < textContent.length) {
                if (/\s/.test(textContent[actualPos])) {
                  while (actualPos < textContent.length && /\s/.test(textContent[actualPos])) {
                    actualPos++;
                  }
                  normalizedPos++;
                } else {
                  actualPos++;
                  normalizedPos++;
                }
              }
              
              actualStart = actualPos;
              
              // Find end position
              let actualEndPos = actualStart;
              let normalizedEnd = matchIndex + matchLength;
              let normalizedCurrent = matchIndex;
              
              while (normalizedCurrent < normalizedEnd && actualEndPos < textContent.length) {
                if (/\s/.test(textContent[actualEndPos])) {
                  while (actualEndPos < textContent.length && /\s/.test(textContent[actualEndPos])) {
                    actualEndPos++;
                  }
                  normalizedCurrent++;
                } else {
                  actualEndPos++;
                  normalizedCurrent++;
                }
              }
              
              actualEnd = actualEndPos;
            }
            
            /**
             * Map text positions to HTML positions
             * This is the trickiest part: we need to find where the text appears in the HTML,
             * but skip over all HTML tags and entities while counting character positions.
             * 
             * For example, in "Hello <span>world</span>!", "world" starts at:
             * - text position 6 (after "Hello ")
             * - HTML position 12 (after "Hello <span>")
             */
            let htmlPos = 0;
            let textPos = 0;
            
            // Find HTML start position by walking through HTML until we reach the text position
            while (textPos < actualStart && htmlPos < htmlContent.length) {
              if (htmlContent[htmlPos] === '<') {
                // Skip entire HTML tag (doesn't count as visible text)
                while (htmlPos < htmlContent.length && htmlContent[htmlPos] !== '>') {
                  htmlPos++;
                }
                if (htmlPos < htmlContent.length) htmlPos++;
              } else if (htmlContent[htmlPos] === '&') {
                // Handle HTML entities like &nbsp; &lt; etc (count as 1 character)
                const entityEnd = htmlContent.indexOf(';', htmlPos);
                if (entityEnd !== -1) {
                  htmlPos = entityEnd + 1;
                  textPos++;
                } else {
                  htmlPos++;
                  textPos++;
                }
              } else {
                // Regular character
                htmlPos++;
                textPos++;
              }
            }
            
            const htmlStart = htmlPos;
            
            // Find HTML end position using the same logic
            while (textPos < actualEnd && htmlPos < htmlContent.length) {
              if (htmlContent[htmlPos] === '<') {
                while (htmlPos < htmlContent.length && htmlContent[htmlPos] !== '>') {
                  htmlPos++;
                }
                if (htmlPos < htmlContent.length) htmlPos++;
              } else if (htmlContent[htmlPos] === '&') {
                const entityEnd = htmlContent.indexOf(';', htmlPos);
                if (entityEnd !== -1) {
                  htmlPos = entityEnd + 1;
                  textPos++;
                } else {
                  htmlPos++;
                  textPos++;
                }
              } else {
                htmlPos++;
                textPos++;
              }
            }
            
            htmlMatches.push({
              index: htmlStart,
              length: htmlPos - htmlStart
            });
            
            // Move search index forward
            searchIndex = matchIndex + matchLength;
          }
          
          return htmlMatches;
        };
        
        /**
         * Apply edits sequentially with collaborative cursor animation
         * 
         * This creates the "Google Docs-like" effect where you see:
         * 1. A cursor appear at the edit location
         * 2. The original text get struck through
         * 3. New text typed out character by character
         * 4. Accept/decline buttons appear
         * 
         * The animation makes it feel like an AI collaborator is editing with you
         */
        const applyEditsWithAnimation = async () => {
          for (let i = 0; i < data.response.length; i++) {
            const { type, original, typo, improvement, reason } = data.response[i];
            const edit = type === 'improvement' ? improvement : typo;
            if (!original || !edit) continue;
            
            // Determine CSS class: 'typo' (blue) or 'improvement' (green italic)
            const editClass = type === 'improvement' ? 'improvement' : 'typo';
            
            // Add tooltip for improvements (shows the reason on hover)
            const tooltipAttr = reason ? `data-reason="${reason.trim().replace(/"/g, '&quot;')}"` : '';
            
            // Find where this text appears in the HTML
            // Strategy differs for typos vs improvements:
            // - Typos: single words use word boundaries (avoid partial matches)
            // - Improvements: use normalized whitespace matching (more flexible)
            const isSingleWord = type === 'typo' && !original.trim().includes(' ');
            let useWordBoundaries = isSingleWord;
            let matches = findTextPositionsInHTML(htmlContent, original, useWordBoundaries, type === 'typo');
            
            // If no matches found for multi-word typo, try without word boundaries (exact match)
            if (matches.length === 0 && type === 'typo' && !isSingleWord) {
              useWordBoundaries = false;
              matches = findTextPositionsInHTML(htmlContent, original, useWordBoundaries, true);
            }
            
            console.log(`Edit ${i}: Looking for: "${original.substring(0, 100)}..."`);
            console.log(`Edit ${i}: Edit text: "${edit}"`);
            console.log(`Edit ${i}: Found ${matches.length} matches`);
            
            if (matches.length === 0) {
              // Fallback: try direct search in plain text
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = htmlContent;
              const plainText = tempDiv.textContent || tempDiv.innerText || '';
              const normalizedSearch = original.replace(/\s+/g, ' ').trim();
              const normalizedPlain = plainText.replace(/\s+/g, ' ').trim();
              
              console.log(`Edit ${i}: Plain text search - looking for: "${normalizedSearch.substring(0, 100)}..."`);
              console.log(`Edit ${i}: Plain text contains match:`, normalizedPlain.includes(normalizedSearch));
              
              if (normalizedPlain.includes(normalizedSearch)) {
                console.log('Found in plain text, but not mapped to HTML. Skipping this edit.');
              } else {
                console.log('Edit not found in editor content. Skipping.');
              }
              continue;
            }
            
            // Process each valid match (in reverse to maintain indices)
            for (let j = matches.length - 1; j >= 0; j--) {
              const matchInfo = matches[j];
              const matchedText = htmlContent.substring(matchInfo.index, matchInfo.index + matchInfo.length);
              
              // Extract plain text from the matched HTML to verify it matches original
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = matchedText;
              let matchedPlainText = tempDiv.textContent || tempDiv.innerText || '';
              
              // Normalize whitespace for comparison (especially important for improvements)
              const normalizedMatched = matchedPlainText.replace(/\s+/g, ' ').trim();
              const normalizedOriginal = original.replace(/\s+/g, ' ').trim();
              
              console.log(`Match ${j}: "${normalizedMatched.substring(0, 50)}..." vs "${normalizedOriginal.substring(0, 50)}..."`);
              
              // Only proceed if the matched text equals the original
              if (normalizedMatched !== normalizedOriginal) {
                console.log('Match does not equal original, skipping');
                continue;
              }
              
              // Check if this edit has already been applied
              // Look backwards to see if we're inside an edit-container span
              const beforeContext = htmlContent.substring(Math.max(0, matchInfo.index - 200), matchInfo.index);
              const afterContext = htmlContent.substring(matchInfo.index + matchInfo.length, Math.min(htmlContent.length, matchInfo.index + matchInfo.length + 200));
              
              // Find the last opening tag before this position
              const lastEditContainerOpen = beforeContext.lastIndexOf('<span class="edit-container"');
              const lastEditContainerClose = beforeContext.lastIndexOf('</span>');
              
              // Check if we're inside an edit-container span
              const isInsideEditContainer = lastEditContainerOpen > lastEditContainerClose;
              
              // Check if the edit text already appears right after
              const tempDiv2 = document.createElement('div');
              tempDiv2.innerHTML = afterContext.substring(0, Math.min(100, afterContext.length));
              const afterPlainText = (tempDiv2.textContent || tempDiv2.innerText || '').trim();
              const isEditAlreadyPresent = afterPlainText.startsWith(edit);
              
              // Skip if edit is already applied
              if (isInsideEditContainer && isEditAlreadyPresent) {
                continue;
              }
              
              const beforeMatch = htmlContent.substring(0, matchInfo.index);
              const afterMatchHtml = htmlContent.substring(matchInfo.index + matchInfo.length);
              
              /**
               * ANIMATION STEP 1: Scroll to edit location if needed
               * For long documents, edits might be off-screen. We insert a marker
               * and smoothly scroll to it so the user can see the animation
               */
              const scrollMarkerId = `scroll-marker-${i}-${j}-${Date.now()}`;
              htmlContent = beforeMatch + 
                `<span id="${scrollMarkerId}" class="edit-scroll-marker"></span>` + 
                original + 
                afterMatchHtml;
              editor.innerHTML = htmlContent;
              
              // Find the marker and scroll to it if needed
              const scrollMarker = editor.querySelector(`#${scrollMarkerId}`);
              if (scrollMarker) {
                const markerRect = scrollMarker.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportTop = 0;
                const viewportBottom = viewportHeight;
                
                // Check if marker is visible in viewport (getBoundingClientRect is relative to viewport)
                const isVisible = markerRect.top >= viewportTop && 
                                 markerRect.bottom <= viewportBottom &&
                                 markerRect.top >= 0;
                
                if (!isVisible) {
                  // Add a visual pulse effect before scrolling
                  scrollMarker.style.background = 'rgba(96, 165, 250, 0.3)';
                  scrollMarker.style.borderRadius = '2px';
                  scrollMarker.style.padding = '2px 4px';
                  scrollMarker.style.animation = 'edit-pulse 0.5s ease-out';
                  
                  // Scroll to the marker
                  scrollMarker.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                  });
                  
                  // Wait for scroll animation to complete
                  await new Promise(resolve => setTimeout(resolve, 600));
                  
                  // Remove pulse effect
                  scrollMarker.style.background = '';
                  scrollMarker.style.borderRadius = '';
                  scrollMarker.style.padding = '';
                  scrollMarker.style.animation = '';
                }
                
                // Remove the marker
                scrollMarker.remove();
              }
              
              /**
               * ANIMATION STEP 2: Show collaborator cursor
               * A blinking blue cursor appears where the edit will happen
               */
              htmlContent = beforeMatch + 
                '<span class="collaborator-cursor"></span>' + 
                original + 
                afterMatchHtml;
              editor.innerHTML = htmlContent;
              
              await new Promise(resolve => setTimeout(resolve, 300));
              
              const editId = `edit-${i}-${j}-${Date.now()}`;
              
              /**
               * ANIMATION STEP 3: Strike through the original text
               * The text that will be replaced gets a red strikethrough
               */
              htmlContent = beforeMatch + 
                `<span class="strikethrough-edit">${original}</span>` + 
                afterMatchHtml;
              editor.innerHTML = htmlContent;
              
              await new Promise(resolve => setTimeout(resolve, 800));
              
              /**
               * ANIMATION STEP 4: Type out the new text character by character
               * The replacement text appears with a typing effect (30ms per character)
               * The cursor follows along as it types
               */
              let typedEdit = '';
              for (let k = 0; k < edit.length; k++) {
                typedEdit += edit[k];
                htmlContent = beforeMatch + 
                  `<span class="strikethrough-edit">${original}</span> ` +
                  `<span class="edited-text ${editClass}" ${tooltipAttr}>${typedEdit}</span>` +
                  '<span class="collaborator-cursor"></span>' +
                  afterMatchHtml;
                editor.innerHTML = htmlContent;
                await new Promise(resolve => setTimeout(resolve, 30));
              }
              
              /**
               * ANIMATION STEP 5: Show accept/decline buttons
               * Remove cursor and add interactive buttons to accept or reject the edit
               * The edit is wrapped in a container with data attributes for tracking
               */
              htmlContent = beforeMatch + 
                `<span class="edit-container" data-edit-id="${editId}" data-original="${original.replace(/"/g, '&quot;')}" data-edit="${edit.replace(/"/g, '&quot;')}">` +
                `<span class="strikethrough-edit">${original}</span> ` +
                `<span class="edited-text ${editClass}" ${tooltipAttr}>${edit}</span>` +
                `<span class="edit-controls" contenteditable="false">` +
                `<button class="edit-accept" title="Accept" contenteditable="false">✓</button>` +
                `<button class="edit-decline" title="Decline" contenteditable="false">✕</button>` +
                `</span>` +
                `</span>` +
                afterMatchHtml;
              editor.innerHTML = htmlContent;
              
              // Small delay before next edit for better visual pacing
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          // Update content state
          const finalContent = editor.innerText || editor.textContent || "";
          setContent(finalContent);
          lastContentRef.current = finalContent;
        };
        
        await applyEditsWithAnimation();
      } else {
        // No edits found - trigger shake animation and show toast
        if (textareaRef.current) {
          const editor = textareaRef.current;
          editor.classList.add('shake');
          setTimeout(() => {
            editor.classList.remove('shake');
          }, 700);
          
          setToastMessage("No edits needed");
          setTimeout(() => {
            setToastMessage("");
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error calling Claude:", error);
      
      // Show user-friendly error toast
      let errorMsg = "Error: " + error.message;
      
      // Check for specific error types
      if (error.message.includes("invalid x-api-key") || error.message.includes("authentication")) {
        errorMsg = "Invalid API key. Please check your API key in Settings.";
      } else if (error.message.includes("API key is missing")) {
        errorMsg = "API key missing. Please add one in Settings.";
      } else if (error.message.includes("rate limit")) {
        errorMsg = "Rate limit exceeded. Please try again later.";
      }
      
      setToastMessage(errorMsg);
      setTimeout(() => {
        setToastMessage("");
      }, 5000);
      
      // Shake animation
      if (textareaRef.current) {
        const editor = textareaRef.current;
        editor.classList.add('shake');
        setTimeout(() => {
          editor.classList.remove('shake');
        }, 700);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Accept all staged edits at once
   * Saves the current state to history first for undo support
   */
  const acceptAll = () => {
    const editor = textareaRef.current;
    if (!editor) return;

    // Save the ORIGINAL text (before edits) to history for undo
    const editContainers = editor.querySelectorAll('.edit-container');
    let originalContent = editor.innerHTML;
    
    // Replace edit containers with just the original text to get pre-edit state
    editContainers.forEach(container => {
      const original = container.getAttribute('data-original');
      if (original) {
        const textNode = document.createTextNode(original);
        container.parentNode.replaceChild(textNode, container);
      }
    });
    
    // Save this clean state to history
    const cleanContent = editor.innerText || editor.textContent || "";
    setContentHistory(prev => {
      if (prev.length === 0 || prev[prev.length - 1] !== cleanContent) {
        return [...prev, cleanContent].slice(-10);
      }
      return prev;
    });
    
    // Restore the HTML with edits
    editor.innerHTML = originalContent;
    
    // Now actually accept all edits
    const editContainersAgain = editor.querySelectorAll('.edit-container');
    for (let i = editContainersAgain.length - 1; i >= 0; i--) {
      const container = editContainersAgain[i];
      const edit = container.getAttribute('data-edit');
      
      if (edit && container.parentNode) {
        const textNode = document.createTextNode(edit);
        container.parentNode.replaceChild(textNode, container);
      }
    }
    
    // Update content state
    const newContent = editor.innerText || editor.textContent || "";
    setContent(newContent);
    lastContentRef.current = newContent;
  };

  /**
   * Decline all staged edits at once
   * Tracks declined edits so Claude won't suggest them again in future requests
   */
  const declineAll = () => {
    const editor = textareaRef.current;
    if (!editor) return;

    const editContainers = editor.querySelectorAll('.edit-container');
    
    // Process in reverse order to maintain DOM indices as we remove elements
    for (let i = editContainers.length - 1; i >= 0; i--) {
      const container = editContainers[i];
      const original = container.getAttribute('data-original');
      
      if (original && container.parentNode) {
        // Replace the edit container with just the original text
        const textNode = document.createTextNode(original);
        container.parentNode.replaceChild(textNode, container);
        
        // Track this as a declined edit so it won't be suggested again
        const editedText = container.querySelector('.edited-text');
        const editType = editedText?.classList.contains('improvement') ? 'improvement' : 'typo';
        const edit = container.getAttribute('data-edit');
        
        const declinedEdit = {
          type: editType,
          original: original.trim(),
          [editType === 'improvement' ? 'improvement' : 'typo']: edit.trim()
        };
        
        // Avoid duplicate entries in declined edits list
        const isDuplicate = declinedEditsRef.current.some(e => 
          e.type === declinedEdit.type &&
          e.original === declinedEdit.original &&
          e[editType] === declinedEdit[editType]
        );
        
        if (!isDuplicate) {
          declinedEditsRef.current.push(declinedEdit);
        }
      }
    }
    
    // Update content state
    setContent(editor.innerText || editor.textContent || "");
  };

  const handleKeyDown = (event) => {
    // CMD+Enter on Mac, Ctrl+Enter on Windows/Linux
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      callClaude();
    }
    // CMD+A (or Ctrl+A) to accept all edits (only when there are staged edits)
    if ((event.key === "a" || event.key === "A") && (event.metaKey || event.ctrlKey)) {
      if (hasStagedEdits) {
        event.preventDefault();
        acceptAll();
      }
    }
    // CMD+U (or Ctrl+U) to undo all edits (only when there are staged edits)
    if ((event.key === "u" || event.key === "U") && (event.metaKey || event.ctrlKey)) {
      if (hasStagedEdits) {
        event.preventDefault();
        declineAll();
      }
    }
    // Escape to close menu, toolbar, or prompt popup
    if (event.key === "Escape") {
      if (promptPopupVisible) {
        setPromptPopupVisible(false);
        setSelectedText("");
        setHighlightPrompt("");
        selectionRangeRef.current = null;
        window.getSelection().removeAllRanges();
      } else if (toolbarVisible) {
        setToolbarVisible(false);
        window.getSelection().removeAllRanges();
      } else if (isMenuOpen) {
        setIsMenuOpen(false);
      } else if (isHelpOpen) {
        setIsHelpOpen(false);
      }
    }
  };

  /**
   * Handle AI editing of selected/highlighted text
   * 
   * This allows users to:
   * 1. Select any portion of text
   * 2. Give it a custom prompt (e.g., "make it more concise")
   * 3. See AI suggestions applied with the same animation system
   * 
   * This is different from callClaude() which edits the whole document
   */
  const handleHighlightPrompt = async () => {
    if (!highlightPrompt.trim() || !selectedText.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setPromptPopupVisible(false);
    
    const editor = textareaRef.current;
    if (!editor) {
      setIsLoading(false);
      return;
    }

    const fullText = editor.innerText || editor.textContent || "";
    const declinedEdits = Array.from(declinedEditsRef.current);

    try {
      const payload = {
        message: fullText,
        highlightedText: selectedText,
        prompt: highlightPrompt.trim(),
        declinedEdits: declinedEdits.length > 0 ? declinedEdits : undefined,
        customInstructions: customInstructions.trim() || undefined,
        isHighlightMode: true,
      };

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || "Failed to get response";
        
        if (response.status === 401 || errorMessage.includes("invalid x-api-key") || errorMessage.includes("authentication")) {
          throw new Error("Invalid API key. Please check your API key in Settings.");
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Apply edits with collaborative animation (reuse the same logic)
      if (data.response && Array.isArray(data.response) && data.response.length > 0 && textareaRef.current) {
        const editor = textareaRef.current;
        let htmlContent = editor.innerHTML;
        
        // Use the same applyEditsWithAnimation logic from callClaude
        // We'll extract this into a shared function, but for now, reuse the logic
        // For simplicity, we can call the same edit application code
        // But we need to find the highlighted text in the HTML and apply edits there
        
        // Find the highlighted text position in HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        const highlightIndex = textContent.indexOf(selectedText);
        
        if (highlightIndex !== -1) {
          // Map text position to HTML position and apply edits
          // For now, let's use a simpler approach - replace the selected text with edits
          // We'll reuse the edit application logic from callClaude
          
          // Apply edits using the same animation system
          const applyEditsWithAnimation = async () => {
            for (let i = 0; i < data.response.length; i++) {
              const { type, original, typo, improvement, reason } = data.response[i];
              const edit = type === 'improvement' ? improvement : typo;
              if (!original || !edit) continue;
              
              const editClass = type === 'improvement' ? 'improvement' : 'typo';
              const tooltipAttr = reason ? `data-reason="${reason.trim().replace(/"/g, '&quot;')}"` : '';
              
              // Refresh HTML content from editor
              let currentHtmlContent = editor.innerHTML;
              
              // Find the original text in HTML (simplified - reuse existing logic)
              const findTextPositionsInHTML = (htmlContent, searchText) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                const textContent = tempDiv.textContent || tempDiv.innerText || '';
                const normalizedText = textContent.replace(/\s+/g, ' ');
                const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
                const matchIndex = normalizedText.indexOf(normalizedSearch);
                
                if (matchIndex === -1) return [];
                
                // Map to HTML position (simplified)
                let htmlPos = 0;
                let textPos = 0;
                while (textPos < matchIndex && htmlPos < htmlContent.length) {
                  if (htmlContent[htmlPos] === '<') {
                    while (htmlPos < htmlContent.length && htmlContent[htmlPos] !== '>') {
                      htmlPos++;
                    }
                    if (htmlPos < htmlContent.length) htmlPos++;
                  } else if (htmlContent[htmlPos] === '&') {
                    const entityEnd = htmlContent.indexOf(';', htmlPos);
                    if (entityEnd !== -1) {
                      htmlPos = entityEnd + 1;
                      textPos++;
                    } else {
                      htmlPos++;
                      textPos++;
                    }
                  } else {
                    htmlPos++;
                    textPos++;
                  }
                }
                
                // Find end position
                let htmlEndPos = htmlPos;
                let textEndPos = textPos;
                const searchLength = normalizedSearch.length;
                while (textEndPos < textPos + searchLength && htmlEndPos < htmlContent.length) {
                  if (htmlContent[htmlEndPos] === '<') {
                    while (htmlEndPos < htmlContent.length && htmlContent[htmlEndPos] !== '>') {
                      htmlEndPos++;
                    }
                    if (htmlEndPos < htmlContent.length) htmlEndPos++;
                  } else if (htmlContent[htmlEndPos] === '&') {
                    const entityEnd = htmlContent.indexOf(';', htmlEndPos);
                    if (entityEnd !== -1) {
                      htmlEndPos = entityEnd + 1;
                      textEndPos++;
                    } else {
                      htmlEndPos++;
                      textEndPos++;
                    }
                  } else {
                    htmlEndPos++;
                    textEndPos++;
                  }
                }
                
                return [{
                  index: htmlPos,
                  length: htmlEndPos - htmlPos
                }];
              };
              
              const matches = findTextPositionsInHTML(currentHtmlContent, original);
              
              if (matches.length > 0) {
                const matchInfo = matches[0];
                const beforeMatch = currentHtmlContent.substring(0, matchInfo.index);
                const afterMatchHtml = currentHtmlContent.substring(matchInfo.index + matchInfo.length);
                
                const editId = `edit-${i}-${Date.now()}`;
                
                // Apply inline strikethrough style
                currentHtmlContent = beforeMatch + 
                  `<span class="strikethrough-edit">${original}</span>` + 
                  afterMatchHtml;
                editor.innerHTML = currentHtmlContent;
                
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Type out the edit
                let typedEdit = '';
                for (let k = 0; k < edit.length; k++) {
                  typedEdit += edit[k];
                  currentHtmlContent = beforeMatch + 
                    `<span class="strikethrough-edit">${original}</span> ` +
                    `<span class="edited-text ${editClass}" ${tooltipAttr}>${typedEdit}</span>` +
                    '<span class="collaborator-cursor"></span>' +
                    afterMatchHtml;
                  editor.innerHTML = currentHtmlContent;
                  await new Promise(resolve => setTimeout(resolve, 30));
                }
                
                // Finalize
                currentHtmlContent = beforeMatch + 
                  `<span class="edit-container" data-edit-id="${editId}" data-original="${original.replace(/"/g, '&quot;')}" data-edit="${edit.replace(/"/g, '&quot;')}">` +
                  `<span class="strikethrough-edit">${original}</span> ` +
                  `<span class="edited-text ${editClass}" ${tooltipAttr}>${edit}</span>` +
                  `<span class="edit-controls" contenteditable="false">` +
                  `<button class="edit-accept" title="Accept" contenteditable="false">✓</button>` +
                  `<button class="edit-decline" title="Decline" contenteditable="false">✕</button>` +
                  `</span>` +
                  `</span>` +
                  afterMatchHtml;
                editor.innerHTML = currentHtmlContent;
                
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            const finalContent = editor.innerText || editor.textContent || "";
            setContent(finalContent);
            lastContentRef.current = finalContent;
          };
          
          await applyEditsWithAnimation();
        }
      } else {
        setToastMessage("No edits generated");
        setTimeout(() => {
          setToastMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error("Error calling Claude:", error);
      
      let errorMsg = "Error: " + error.message;
      
      if (error.message.includes("invalid x-api-key") || error.message.includes("authentication")) {
        errorMsg = "Invalid API key. Please check your API key in Settings.";
      } else if (error.message.includes("API key is missing")) {
        errorMsg = "API key missing. Please add one in Settings.";
      } else if (error.message.includes("rate limit")) {
        errorMsg = "Rate limit exceeded. Please try again later.";
      }
      
      setToastMessage(errorMsg);
      setTimeout(() => {
        setToastMessage("");
      }, 5000);
    } finally {
      setIsLoading(false);
      setSelectedText("");
      setHighlightPrompt("");
      selectionRangeRef.current = null;
    }
  };

  const handleCopySelected = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).then(() => {
        setToastMessage("Copied to clipboard");
        setTimeout(() => {
          setToastMessage("");
        }, 2000);
        setToolbarVisible(false);
        window.getSelection().removeAllRanges();
      }).catch(() => {
        setToastMessage("Failed to copy");
        setTimeout(() => {
          setToastMessage("");
        }, 2000);
      });
    }
  };

  const saveToHistory = () => {
    const editor = textareaRef.current;
    if (!editor) return;
    
    const currentContent = editor.innerText || editor.textContent || "";
    // Always save current state to history (before making changes)
    // This ensures we can undo the change we're about to make
    setContentHistory(prev => {
      // Only add if it's different from the last entry to avoid duplicates
      if (prev.length === 0 || prev[prev.length - 1] !== currentContent) {
        // Keep only last 10 history entries
        return [...prev, currentContent].slice(-10);
      }
      return prev;
    });
    // Don't update lastContentRef here - it will be updated after the change
  };

  const handleUndo = () => {
    if (contentHistory.length === 0) return;
    
    const editor = textareaRef.current;
    if (!editor) return;
    
    // Get the last content from history
    const previousContent = contentHistory[contentHistory.length - 1];
    
    // Restore the content
    editor.textContent = previousContent;
    setContent(previousContent);
    lastContentRef.current = previousContent;
    
    // Remove from history
    setContentHistory(prev => prev.slice(0, -1));
    
    // Clear any staged edits
    const editContainers = editor.querySelectorAll('.edit-container');
    editContainers.forEach(container => {
      const original = container.getAttribute('data-original');
      if (original && container.parentNode) {
        const textNode = document.createTextNode(original);
        container.parentNode.replaceChild(textNode, container);
      }
    });
    
    setToastMessage("Undone");
    setTimeout(() => {
      setToastMessage("");
    }, 2000);
  };

  const handleDeleteSelected = () => {
    const editor = textareaRef.current;
    if (!editor || !selectionRangeRef.current) return;

    // Save current state to history before deleting
    saveToHistory();

    const range = selectionRangeRef.current;
    
    // Delete the selected text
    range.deleteContents();
    
    // Update content state
    const newContent = editor.innerText || editor.textContent || "";
    setContent(newContent);
    lastContentRef.current = newContent;
    
    // Hide toolbar and clear selection
    setToolbarVisible(false);
    setSelectedText("");
    selectionRangeRef.current = null;
    window.getSelection().removeAllRanges();
  };

  const handleOpenPromptPopup = () => {
    if (!selectedText) return;
    
    const range = selectionRangeRef.current;
    if (!range) return;
    
    // Calculate popup position (below the selection)
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    
    setPromptPopupPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height + 10
    });
    
    setPromptPopupVisible(true);
    setHighlightPrompt("");
    setToolbarVisible(false);
  };

  const handleDownload = () => {
    const editor = textareaRef.current;
    if (!editor) return;

    const textContent = editor.innerText || editor.textContent || "";
    if (!textContent.trim()) return;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>ClaudePad</title>
        <meta
          name="description"
          content="A freewriting tool powered by LLMs"
        />
      </Head>
      <div
        ref={containerRef}
        className={`${geistMono.variable} relative flex min-h-screen justify-center text-white`}
        style={{ backgroundColor: '#0a0e1a', overflow: 'visible' }}
      >
        <FreewriteLogo isLoading={isLoading} />
        <div className="top-right-buttons">
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="hamburger-button"
            title="Help"
            aria-label="Help"
          >
            <HelpCircle size={16} className="wrench-icon" />
          </button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="hamburger-button"
            title="Menu"
            aria-label="Menu"
          >
            <Wrench size={16} className="wrench-icon" />
          </button>
          <button
            onClick={handleUndo}
            className="undo-button"
            title="Undo"
            disabled={contentHistory.length === 0}
          >
            <Undo2 size={16} className="undo-icon" />
          </button>
          <button
            onClick={handleDownload}
            className="download-button"
            title="Download"
          >
            <Download size={16} className="download-icon" />
          </button>
        </div>
        {isHelpOpen && (
          <div className="menu-overlay" onClick={() => setIsHelpOpen(false)}>
            <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
              <div className="menu-header">
                <h2 className="menu-title">How to Use</h2>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="menu-close"
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <div className="menu-content">
                <div className="settings-section">
                  <h3 style={{ fontFamily: "monospace", color: "rgba(0, 255, 136, 0.9)", marginBottom: "12px", fontSize: "16px" }}>Getting Started</h3>
                  <p style={{ fontFamily: "monospace", marginBottom: "16px", lineHeight: "1.6", color: "rgba(255, 255, 255, 0.8)" }}>
                    Start typing your text in the editor. When you're ready for AI-powered edits, press <strong>{isMac ? '⌘' : 'Ctrl'}+Enter</strong> to generate suggestions.
                  </p>
                  
                  <h3 style={{ fontFamily: "monospace", color: "rgba(0, 255, 136, 0.9)", marginBottom: "12px", marginTop: "24px", fontSize: "16px" }}>Reviewing Edits</h3>
                  <p style={{ fontFamily: "monospace", marginBottom: "16px", lineHeight: "1.6", color: "rgba(255, 255, 255, 0.8)" }}>
                    When edits appear, you can:
                  </p>
                  <ul style={{ fontFamily: "monospace", marginLeft: "20px", marginBottom: "16px", lineHeight: "1.8", color: "rgba(255, 255, 255, 0.8)" }}>
                    <li>Click <strong>✓</strong> to accept an edit</li>
                    <li>Click <strong>✕</strong> to decline an edit</li>
                    <li>Use <strong>{isMac ? '⌘' : 'Ctrl'}+A</strong> to accept all edits</li>
                    <li>Use <strong>{isMac ? '⌘' : 'Ctrl'}+U</strong> to decline all edits</li>
                  </ul>
                  
                  <h3 style={{ fontFamily: "monospace", color: "rgba(0, 255, 136, 0.9)", marginBottom: "12px", marginTop: "24px", fontSize: "16px" }}>Selecting Text</h3>
                  <p style={{ fontFamily: "monospace", marginBottom: "16px", lineHeight: "1.6", color: "rgba(255, 255, 255, 0.8)" }}>
                    Select any text to see a toolbar with options to:
                  </p>
                  <ul style={{ fontFamily: "monospace", marginLeft: "20px", marginBottom: "16px", lineHeight: "1.8", color: "rgba(255, 255, 255, 0.8)" }}>
                    <li><strong>Edit with AI</strong> - Provide a prompt to modify the selected text</li>
                    <li><strong>Copy</strong> - Copy the selected text</li>
                    <li><strong>Delete</strong> - Remove the selected text</li>
                  </ul>
                  
                  <h3 style={{ fontFamily: "monospace", color: "rgba(0, 255, 136, 0.9)", marginBottom: "12px", marginTop: "24px", fontSize: "16px" }}>Other Features</h3>
                  <ul style={{ fontFamily: "monospace", marginLeft: "20px", marginBottom: "16px", lineHeight: "1.8", color: "rgba(255, 255, 255, 0.8)" }}>
                    <li><strong>Undo</strong> - Use the undo button to revert changes</li>
                    <li><strong>Download</strong> - Export your text as a .txt file</li>
                    <li><strong>Settings</strong> - Configure your API key and custom instructions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {isMenuOpen && (
          <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}>
            <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
              <div className="menu-header">
                <h2 className="menu-title">Settings</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="menu-close"
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <div className="menu-content">
                <div className="settings-section">
                  <label className="settings-label">Anthropic API Key</label>
                  {hasApiKeySaved && !anthropicApiKey && (
                    <p className="menu-hint" style={{ marginBottom: "8px", color: "rgba(0, 255, 136, 0.8)" }}>
                      ✓ API key saved
                    </p>
                  )}
                  <input
                    type="password"
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    placeholder={hasApiKeySaved ? "API key saved (enter new key to change)" : "sk-ant-..."}
                    className="custom-instructions-textarea"
                    onBlur={saveApiKey}
                  />
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      onClick={saveApiKey}
                      className="save-api-key-button"
                      style={{
                        padding: "8px 16px",
                        background: "rgba(0, 255, 136, 0.2)",
                        border: "1px solid rgba(0, 255, 136, 0.5)",
                        color: "rgba(0, 255, 136, 0.9)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: "14px",
                      }}
                    >
                      {hasApiKeySaved && !anthropicApiKey.trim() ? "Clear API Key" : "Save API Key"}
                    </button>
                    <span className="menu-hint" style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                      Get your API key{' '}
                      <a 
                        href="https://console.anthropic.com/settings/keys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: "rgba(0, 255, 136, 0.8)", textDecoration: "underline" }}
                      >
                        here
                      </a>
                    </span>
                  </div>
                </div>
                <div className="settings-section">
                  <label className="settings-label">Custom Instructions</label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Add custom instructions that will be included in the system prompt..."
                    className="custom-instructions-textarea"
                    rows={10}
                  />
                  <p className="menu-hint">
                    These instructions will be appended to the system prompt for all edit requests.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {typingMagic.map((magic) => (
          <TypingMagic key={magic.id} x={magic.x} y={magic.y} />
        ))}
        <div className="w-full max-w-2xl flex flex-col min-h-screen" style={{ paddingTop: '100px', position: 'relative', overflow: 'visible' }}>
        {/* Vignette effect */}
        {content.length > 200 && (
          <div 
            className="vignette"
            style={{
              opacity: Math.min(0.8, (content.length - 200) / 1500),
            }}
          />
        )}
          <div
            ref={textareaRef}
            contentEditable={!isLoading}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className="flex-1 w-full resize-none px-8 py-8 font-mono text-base leading-relaxed text-white outline-none"
            style={{
              backgroundColor: '#0a0e1a',
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              position: 'relative',
              zIndex: 1,
              overflow: 'visible',
              ...(isLoading && { pointerEvents: "none", opacity: 0.7 }),
            }}
          />
        </div>
        {!hasStagedEdits && (
          <div className="floating-edit-buttons">
            <button
              onClick={callClaude}
              disabled={isLoading || !content.trim()}
              className="make-edits-button"
              title="Edit document"
            >
              edit document ({isMac ? '⌘' : 'Ctrl'}+Enter)
            </button>
          </div>
        )}
        {hasStagedEdits && (
          <div className="floating-edit-buttons">
            <button
              onClick={acceptAll}
              className="accept-all-button"
            >
              accept all edits (⌘A)
            </button>
            <button
              onClick={declineAll}
              className="decline-all-button"
            >
              undo all edits (⌘U)
            </button>
          </div>
        )}
        {toastMessage && (
          <div className="toast">
            {toastMessage}
          </div>
        )}
        {saveIndicator.show && (
          <div className="save-indicator">
            <span className="save-checkmark">✓</span>
            <span className="save-text">saved at {saveIndicator.time}</span>
          </div>
        )}
        {toolbarVisible && selectedText && (
          <div 
            className="selection-toolbar"
            style={{
              left: `${toolbarPosition.x}px`,
              top: `${toolbarPosition.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="toolbar-button toolbar-button-magic"
              onClick={handleOpenPromptPopup}
              title="Edit with AI"
            >
              <Wand2 size={16} />
            </button>
            <button
              className="toolbar-button toolbar-button-copy"
              onClick={handleCopySelected}
              title="Copy"
            >
              <Copy size={16} />
            </button>
            <button
              className="toolbar-button toolbar-button-delete"
              onClick={handleDeleteSelected}
              title="Delete"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {promptPopupVisible && selectedText && (
          <div 
            className="highlight-prompt-popup"
            style={{
              left: `${promptPopupPosition.x}px`,
              top: `${promptPopupPosition.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="highlight-prompt-header">
              <span className="highlight-prompt-label">Edit selected text:</span>
              <button
                className="highlight-prompt-close"
                onClick={() => {
                  setPromptPopupVisible(false);
                  setSelectedText("");
                  setHighlightPrompt("");
                  selectionRangeRef.current = null;
                  window.getSelection().removeAllRanges();
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="highlight-prompt-text-preview">
              "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
            </div>
            <input
              type="text"
              value={highlightPrompt}
              onChange={(e) => setHighlightPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleHighlightPrompt();
                } else if (e.key === "Escape") {
                  setPromptPopupVisible(false);
                  setSelectedText("");
                  setHighlightPrompt("");
                  selectionRangeRef.current = null;
                  window.getSelection().removeAllRanges();
                }
              }}
              placeholder="e.g., make it shorter, more concise, better..."
              className="highlight-prompt-input"
              autoFocus
            />
            <div className="highlight-prompt-actions">
              <button
                onClick={handleHighlightPrompt}
                disabled={!highlightPrompt.trim() || isLoading}
                className="highlight-prompt-submit"
              >
                {isLoading ? "Processing..." : "Apply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
