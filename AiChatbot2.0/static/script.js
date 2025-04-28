// --- script.js ---

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const themeCheckbox = document.getElementById('theme-checkbox'); // Get theme checkbox

// Settings Menu Elements
const settingsIcon = document.getElementById('settings-icon-clickable');
const settingsMenu = document.getElementById('settings-menu');
const rulesetInput = document.getElementById('ruleset-input');
const saveSettingsButton = document.getElementById('save-settings-button');
const clearChatButton = document.getElementById('clear-chat-button'); // Get Clear button
const personaSelect = document.getElementById('persona-select'); // Get Persona select
const rulesetLabel = document.getElementById('ruleset-label'); // Get ruleset label
const moodIndicator = document.getElementById('mood-indicator'); // Get mood indicator element

// --- Global variable for conversation history ---
let chatHistory = []; // Stores [role, content] tuples

// --- AbortController for fetch requests ---
let abortController = null; // To allow aborting the fetch

// --- Global Variables ---
let currentPersona = localStorage.getItem('chatbotPersona') || "default"; // Store selected persona NAME
let userCustomRuleset = localStorage.getItem('userCustomRuleset') || ""; // User's typed custom rules (used only when persona is 'custom')

// --- Mood Emojis Map ---
const personaMoods = {
    "default": "🤔",
    "pirate": "🏴‍☠️",
    "steve": "⛏️", 
    "kinglebron": "👑",
    "code-explainer": "💻",
    "bullet-points": "📝",
    "prof-oak": "🧑‍🔬",
    "custom": "💡"
};

// --- Persona Display Names ---
const personaDisplayNames = {
    "default": "AI Chatbot",
    "pirate": "Pirate Captain Chatbot",
    "steve": "Steve Chatbot", 
    "kinglebron": "King LeBron Chatbot",
    "code-explainer": "Code Explainer Chatbot",
    "bullet-points": "Summarizer Chatbot",
    "prof-oak": "Professor Oak Chatbot",
    "custom": "Custom AI Chatbot"
};

// --- SVG Icons ---
const sendIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480l0-83.6c0-4 1.5-7.8 4.2-10.8L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"/></svg>`;
const stopIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z"/></svg>`;
const settingsIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 1C11.4477 1 11 1.44772 11 2V4.06186C9.48898 4.46985 8.14581 5.38837 7.13803 6.66437L5.52978 5.85231C5.05507 5.60995 4.46247 5.83502 4.22011 6.30973C3.97775 6.78445 4.20282 7.37704 4.67753 7.6194L6.26912 8.42103C5.41885 9.50112 4.84998 10.79 4.6169 12.1811L2.50386 11.7402C1.97557 11.6293 1.44172 11.9577 1.33081 12.486C1.2199 13.0143 1.5483 13.5482 2.07659 13.6591L4.18963 14.0999C4.42271 15.4911 4.99158 16.7799 5.84185 17.86L4.25026 18.6616C3.77555 18.904 3.55048 19.4966 3.79284 19.9713C4.0352 20.446 4.6278 20.6711 5.10251 20.4287L6.6941 19.6271C7.70188 20.9031 9.04505 21.8216 10.5561 22.2296V24C10.5561 24.5523 11.0038 25 11.5561 25H12.4439C12.9962 25 13.4439 24.5523 13.4439 24V22.2296C14.955 21.8216 16.2981 20.9031 17.3059 19.6271L18.8975 20.4287C19.3722 20.6711 19.9648 20.446 20.2072 19.9713C20.4495 19.4966 20.2245 18.904 19.7497 18.6616L18.1581 17.86C19.0084 16.7799 19.5773 15.4911 19.8104 14.0999L21.9234 13.6591C22.4517 13.5482 22.7801 13.0143 22.6692 12.486C22.5583 11.9577 22.0244 11.6293 21.4961 11.7402L19.3831 12.1811C19.15 10.79 18.5811 9.50112 17.7309 8.42103L19.3225 7.6194C19.7972 7.37704 20.0222 6.78445 19.7799 6.30973C19.5375 5.83502 18.9449 5.60995 18.4702 5.85231L16.862 6.66437C15.8542 5.38837 14.511 4.46985 13 4.06186V2C13 1.44772 12.5523 1 12 1ZM12 8.5C13.933 8.5 15.5 10.067 15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5Z"></path></svg>`;
const regenerateIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.78 16.28C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM6 12C6 10.99 6.25 10.03 6.7 9.2L5.22 7.72C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18C8.69 18 6 15.31 6 12Z"></path></svg>`;
const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM20 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H20C21.1 23 22 22.1 22 21V7C22 5.9 21.1 5 20 5ZM20 21H8V7H20V21Z"></path></svg>`;

// --- Theme Switching Logic ---
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeCheckbox.checked = true; // Sync checkbox state
    } else {
        document.body.classList.remove('dark-mode');
        themeCheckbox.checked = false; // Sync checkbox state
    }
}

function toggleTheme() {
    const newTheme = themeCheckbox.checked ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function loadInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
}

// --- Settings Menu Logic ---
function toggleSettingsMenu() {
    const isVisible = settingsMenu.classList.toggle('visible');
    if (isVisible) {
        personaSelect.value = currentPersona;
        // Load the *user's actual typed custom rules* into the textarea initially
        rulesetInput.value = userCustomRuleset; 
        handlePersonaChange(); // Hide/show based on loaded persona
    }
}

function saveSettings() {
    const selectedPersona = personaSelect.value;

    if (selectedPersona === 'custom') {
        userCustomRuleset = rulesetInput.value; 
        console.log(`[saveSettings] Saving CUSTOM rules text: "${userCustomRuleset}"`);
        localStorage.setItem('userCustomRuleset', userCustomRuleset); 
    } else {
        console.log(`[saveSettings] Saving PREDEFINED persona: [${selectedPersona}]`);
    }

    currentPersona = selectedPersona; // Save the selected persona NAME
    localStorage.setItem('chatbotPersona', currentPersona); // Save selected persona NAME
    
    console.log(`[saveSettings] currentPersona variable is now: "${currentPersona}"`);
    console.log(`[saveSettings] localStorage saved persona: "${localStorage.getItem('chatbotPersona')}"`);
    console.log(`[saveSettings] localStorage saved custom rules: "${localStorage.getItem('userCustomRuleset')}"`);

    settingsMenu.classList.remove('visible');
    updateHeaderAndMood(); // *** Call updated function ***
}

function handlePersonaChange() {
    const selectedValue = personaSelect.value;
    if (selectedValue === 'custom') {
        rulesetLabel.classList.remove('hidden');
        rulesetInput.classList.remove('hidden');
        // When switching TO custom, populate with the stored user custom rules
        rulesetInput.value = userCustomRuleset; 
    } else { // Hide for ALL other personas (default, pirate, steve, oak, etc.)
        rulesetLabel.classList.add('hidden');
        rulesetInput.classList.add('hidden');
        // Don't need to clear or change the textarea value here
    }
}

// --- Markdown Rendering ---
// Configure marked (optional: disable deprecated features, enable GFM)
marked.setOptions({
  gfm: true, // Enable GitHub Flavored Markdown
  breaks: true, // Convert single line breaks to <br>
  sanitize: false, // IMPORTANT: Disable built-in sanitize if you trust the source or use DOMPurify later
                  // For LLM output, some level of sanitization might be wise in production.
                  // Let's keep it false for now to see raw potential, but BE CAREFUL.
});

// --- Chat Logic ---
// let eventSource = null; // No longer needed with fetch stream parsing

// --- Helper Function to Set Button Icon ---
function setButtonIcon(button, iconSVG) {
    button.innerHTML = iconSVG;
}

// Add messageType parameter
function addMessage(content, sender, elementId = null, personaForBot = null, messageType = null) { 
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper', sender === 'user' ? 'user-msg-wrapper' : 'bot-msg-wrapper');

    // --- Create Block for Message Bubble + Controls --- 
    const contentControlsBlock = document.createElement('div');
    contentControlsBlock.classList.add('message-content-controls-block');

    // --- Message Bubble --- 
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    
    const messageId = elementId || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    messageDiv.id = messageId;
    messageWrapper.dataset.messageId = messageId;

    // --- Controls Div (Populated based on sender) ---
    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('message-controls');

    // --- Reactions Container (Initialized, populated only for bot) ---
    let reactionsContainer = null;

    // Placeholder HTML check
    const placeholderIndicatorHtml = '<div class="typing-indicator"><span>.</span><span>.</span><span>.</span></div>';
    const isPlaceholder = content === placeholderIndicatorHtml;

    // Set message type data attribute if provided
    if (messageType) {
        messageDiv.dataset.messageType = messageType;
    }

    if (sender === 'bot') {
        messageDiv.dataset.rawText = "";
        const persona = personaForBot || currentPersona || 'default';
        const personaClass = `persona-${persona}`;
        messageDiv.classList.add(personaClass);
        messageDiv.dataset.persona = persona;
        
        // *** Special handling for initial placeholder ***
        if (isPlaceholder) {
            messageDiv.innerHTML = placeholderIndicatorHtml; // Directly set HTML for placeholder
    } else {
            renderBotMessageContent(messageDiv, content); // Render normally for other content
        }

        // --- Bot-Specific Controls ---
        const regenerateBtn = document.createElement('button');
        setButtonIcon(regenerateBtn, regenerateIconSVG);
        regenerateBtn.title = 'Regenerate response';
        regenerateBtn.classList.add('msg-ctrl-btn', 'regenerate-btn');
        regenerateBtn.onclick = () => handleRegenerate(messageWrapper);
        controlsDiv.appendChild(regenerateBtn);

        const reactBtn = document.createElement('button');
        reactBtn.innerHTML = '😀'; 
        reactBtn.title = 'React to message';
        reactBtn.classList.add('msg-ctrl-btn', 'react-btn');
        reactBtn.onclick = (event) => toggleReactionsPalette(event, messageWrapper);
        reactBtn.style.display = 'none'; // *** HIDE initially ***
        controlsDiv.appendChild(reactBtn);
        
        reactionsContainer = document.createElement('div');
        reactionsContainer.classList.add('message-reactions');
        reactionsContainer.id = `reactions-${messageId}`;

    } else { // Sender is 'user'
        messageDiv.textContent = content;
        messageDiv.dataset.persona = 'user'; 
        // No controls added for user messages currently
    }

    // Assemble the inner block: message + controls
    contentControlsBlock.appendChild(messageDiv);
    if (controlsDiv.hasChildNodes()) {
        contentControlsBlock.appendChild(controlsDiv);
    }

    // Assemble the main wrapper: inner block first
    messageWrapper.appendChild(contentControlsBlock);
    
    // Append the reaction container if it exists (only for bot)
    if (reactionsContainer) { 
        messageWrapper.appendChild(reactionsContainer); 
    }
    
    chatBox.appendChild(messageWrapper);
    scrollToBottom();
    return messageDiv; 
}

function updateStreamingMessage(elementId, chunk) {
    const messageDiv = document.getElementById(elementId);
    if (messageDiv) {
        // Append chunk to raw text storage
        messageDiv.dataset.rawText = (messageDiv.dataset.rawText || "") + chunk;
        // Render potentially incomplete Markdown
        renderBotMessageContent(messageDiv, messageDiv.dataset.rawText + "█"); // Add blinking cursor
        scrollToBottomIfNear();
    } else {
         console.warn(`Element ${elementId} not found for streaming update.`);
    }
}

// --- NEW Function to render bot message content, handling code blocks ---
function renderBotMessageContent(messageDiv, rawText) {
    try {
        // 1. Parse the full raw text to HTML using marked
        const dirtyHtml = marked.parse(rawText);
        
        // 2. Sanitize HTML (using DOMPurify if available, otherwise skip - basic protection)
        // IMPORTANT: Add DOMPurify library for real security. For now, just using the parsed HTML.
        const cleanHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(dirtyHtml) : dirtyHtml;

        // 3. Set the initial HTML content
        messageDiv.innerHTML = cleanHtml;

        // 4. Find and enhance code blocks
        messageDiv.querySelectorAll('pre > code[class*="language-"]').forEach((codeElement) => {
            enhanceCodeBlock(codeElement);
        });

        } catch(e) {
        console.error("Error rendering bot message:", e);
        messageDiv.textContent = rawText; // Fallback to text content on error
    }
}

// --- NEW Function to enhance a code block with header, buttons, and highlighting ---
function enhanceCodeBlock(codeElement) {
    const preElement = codeElement.parentElement; // Get the parent <pre>
    if (!preElement || preElement.tagName !== 'PRE') return;

    // Prevent double-enhancing
    if (preElement.parentElement.classList.contains('code-block-wrapper')) {
        return; 
    }

    // Extract language
    const languageClass = Array.from(codeElement.classList).find(cls => cls.startsWith('language-'));
    const language = languageClass ? languageClass.replace('language-', '') : 'plaintext';

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    // Create header div
    const header = document.createElement('div');
    header.className = 'code-block-header';

    // Language name span
    const langSpan = document.createElement('span');
    langSpan.className = 'language-name';
    langSpan.textContent = language;

    // Controls div (for buttons)
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'code-controls';

    // Copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    // copyButton.textContent = 'Copy'; 
    setButtonIcon(copyButton, copyIconSVG); // Use SVG Icon
    copyButton.title = 'Copy code';
    copyButton.addEventListener('click', () => {
        copyCodeToClipboard(codeElement, copyButton);
    });

    // Append elements to header
    controlsDiv.appendChild(copyButton);
    // Add Edit button later if needed
    header.appendChild(langSpan);
    header.appendChild(controlsDiv);

    // Insert header before <pre> and wrap both in the wrapper
    preElement.parentNode.insertBefore(wrapper, preElement);
    wrapper.appendChild(header);
    wrapper.appendChild(preElement); // Move <pre> inside the wrapper

    // Apply syntax highlighting using Highlight.js
    try {
        hljs.highlightElement(codeElement);
    } catch (e) {
        console.error("Highlight.js error:", e);
    }
}

// --- NEW Function to handle copying code ---
function copyCodeToClipboard(codeElement, button) {
    const codeToCopy = codeElement.textContent || "";
    navigator.clipboard.writeText(codeToCopy).then(() => {
        button.innerHTML = 'Copied!'; // Keep text for feedback
        button.title = 'Copied!';
        setTimeout(() => {
            setButtonIcon(button, copyIconSVG); // Reset icon
            button.title = 'Copy code';
        }, 1500); 
    }).catch(err => {
        console.error('Failed to copy code:', err);
        button.textContent = 'Error'; // Keep text for error
        button.title = 'Error copying';
        setTimeout(() => {
            setButtonIcon(button, copyIconSVG); // Reset icon
            button.title = 'Copy code';
        }, 1500);
    });
}

// --- finalizeStreamingMessage: Handles Pokedex or standard text ---
function finalizeStreamingMessage(elementId, userMessage, finalBotText, isPokedexEntry = false) { // Flag remains useful
     const messageDiv = document.getElementById(elementId);
     if (messageDiv) {
        console.log(`Finalizing message ${elementId}. Passed isPokedex flag: ${isPokedexEntry}`);
        const messagePersona = messageDiv.dataset.persona || currentPersona || 'default';
        let historyText = "";
        let needsFinalRender = false;

        // Check if Pokedex content was successfully rendered previously
        const containsPokedex = messageDiv.querySelector('.pokedex-container') !== null;
        console.log(`Finalizing: Contains Pokedex container? ${containsPokedex}`);

        if (containsPokedex) {
            // Pokedex already rendered. Set history/dataset text.
            const pokemonName = messageDiv.querySelector('.pokedex-name')?.textContent || 'Pokémon';
            historyText = `[Displayed Pokédex entry for ${pokemonName}]`;
            messageDiv.dataset.rawText = historyText; // Update dataset to match history
            needsFinalRender = false; // No standard text render needed
        } else {
            // Standard text message OR Pokedex that FAILED to render earlier.
            // Use the accumulated text (or the fallback text if stream ended prematurely).
            historyText = messageDiv.dataset.rawText || finalBotText;
            needsFinalRender = true; // Needs final render to remove cursor etc.
        }

        // Perform final render ONLY if needed (i.e., for non-pokedex or failed pokedex)
        if (needsFinalRender) {
            console.log(`Finalizing: Performing final text render for ${elementId}`);
            renderBotMessageContent(messageDiv, historyText); // Render without cursor
        } else {
            console.log(`Finalizing: Skipping final text render for ${elementId} (Pokedex rendered).`);
        }

        // Store user message first
        chatHistory.push(["user", userMessage]);
        // Store assistant message (final text or Pokedex placeholder) WITH its element ID and PERSONA
        chatHistory.push(["assistant", historyText, elementId, messagePersona]); 
        console.log("Updated Client-Side History:", chatHistory);
        
        showReactionButton(messageDiv); // Show buttons for both types
     }
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- NEW Helper: Scroll to bottom only if user is already near the bottom ---
function scrollToBottomIfNear() {
    const threshold = 50; // Pixels from bottom
    const isNearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < threshold;
    if (isNearBottom) {
        scrollToBottom();
    }
}

// --- Pong Game Easter Egg --- 
let pongCanvas = null;
let pongCtx = null;
let pongGameLoopId = null;
let pongPlayerPaddle = { y: 0, score: 0 };
let pongAIPaddle = { y: 0, score: 0 };
let pongBall = { x: 0, y: 0, dx: 0, dy: 0 };
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_RADIUS = 7;
const AI_PADDLE_MAX_SPEED = 9; // Renamed & Reduced AI max speed
let isPongRunning = false; // <-- Declare isPongRunning globally

// --- NEW Function to Resize Pong Canvas ---
function resizePongCanvas() {
    if (!pongCanvas || !chatBox) return;
    // Use clientWidth/Height to account for padding/borders of the container
    pongCanvas.width = chatBox.clientWidth;
    pongCanvas.height = chatBox.clientHeight;
    console.log(`Pong canvas resized to: ${pongCanvas.width}x${pongCanvas.height}`);
    // Optional: Reset ball/paddles positions after resize?
    // resetBall(); 
    // paddle1.y = pongCanvas.height / 2 - paddle1.height / 2;
    // paddle2.y = pongCanvas.height / 2 - paddle2.height / 2;
}

function initPongGame() {
    if (isPongRunning) return;
    console.log("Initializing Pong Game...");
    isPongRunning = true;

    chatBox.innerHTML = ''; // Clear chat messages
    // Adjust chatBox styles for game
    chatBox.style.padding = '0';
    chatBox.style.gap = '0';
    chatBox.style.overflow = 'hidden'; // Hide scrollbars during game

    // Create and append canvas if it doesn't exist
    if (!pongCanvas) {
        pongCanvas = document.createElement('canvas');
        pongCanvas.id = 'pongCanvas';
        pongCtx = pongCanvas.getContext('2d');
    }
    chatBox.appendChild(pongCanvas);

    resizePongCanvas(); // <--- Now this function exists

    // Disable user input
    userInput.disabled = true;
    userInput.placeholder = 'Pong game in progress...';

    // Modify Send button to act as Stop Pong button
    sendButton.innerHTML = stopIconSVG; // Use the existing stopIconSVG
    sendButton.onclick = closePongGame; // Change click handler
    sendButton.disabled = false; // Ensure it's enabled

    // Reset game state
    pongPlayerPaddle.y = pongCanvas.height / 2 - PADDLE_HEIGHT / 2;
    pongAIPaddle.y = pongCanvas.height / 2 - PADDLE_HEIGHT / 2;
    pongPlayerPaddle.score = 0;
    pongAIPaddle.score = 0;
    resetPongBall();

    document.addEventListener('mousemove', movePlayerPaddle);
    pongGameLoopId = requestAnimationFrame(pongGameLoop);
}

function closePongGame() {
    if (!isPongRunning) return;
    console.log("Closing Pong Game...");
    isPongRunning = false;

    if (pongGameLoopId) {
        cancelAnimationFrame(pongGameLoopId);
        pongGameLoopId = null;
    }

    const chatBox = document.querySelector('.chat-box');
    if (pongCanvas) {
        // pongCanvas is removed when chatBox.innerHTML is cleared below
        pongCanvas = null;
        pongCtx = null;
    }

    // Clear chatBox content and restore styles
    if (chatBox) {
        chatBox.innerHTML = ''; 
        chatBox.style.padding = ''; 
        chatBox.style.overflow = 'auto'; 
        addMessage("Pong game ended. Resuming chat...", "bot", null, "default");
    }

    // --- Restore Main Send/Stop Button ---
    sendButton.onclick = null; // Remove direct onclick
    sendButton.removeEventListener('click', closePongGame); // Remove pong listener
    setButtonIcon(sendButton, sendIconSVG); // Set send icon
    sendButton.addEventListener('click', sendMessage); // Re-add send listener
    sendButton.disabled = false; // Ensure clickable
    userInput.disabled = false; // Re-enable input field
    userInput.placeholder = 'Send a message...';

    console.log("Pong Closed.");
}

function resetPongBall() {
    if (!pongCanvas) return;
    pongBall.x = pongCanvas.width / 2;
    pongBall.y = pongCanvas.height / 2;
    let side = Math.random() > 0.5 ? 1 : -1;
    // Increase initial horizontal speed range further
    pongBall.dx = side * (Math.random() * 3 + 8.0); // Now speed between 8.0 and 11.0
    // Increase vertical range
    pongBall.dy = (Math.random() * 8) - 4.0; // Now between -4.0 and 4.0 
    // Ensure minimum vertical movement
    if (Math.abs(pongBall.dy) < 2.0) pongBall.dy = Math.sign(pongBall.dy || (Math.random() - 0.5)) * 2.0;
}

function movePlayerPaddle(event) {
    if (!pongCanvas) return;
    const rect = pongCanvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    // Center paddle around mouse, constrained within bounds
    pongPlayerPaddle.y = mouseY - PADDLE_HEIGHT / 2;
    if (pongPlayerPaddle.y < 0) {
        pongPlayerPaddle.y = 0;
    }
    if (pongPlayerPaddle.y + PADDLE_HEIGHT > pongCanvas.height) {
        pongPlayerPaddle.y = pongCanvas.height - PADDLE_HEIGHT;
    }
}

function pongGameLoop() {
    if (!pongCanvas || !pongCtx) {
         if (pongGameLoopId) cancelAnimationFrame(pongGameLoopId);
         return;
    }

    // 1. Update game state
    // Move ball
    pongBall.x += pongBall.dx;
    pongBall.y += pongBall.dy;

    // Move AI paddle (Smoother movement)
    const aiPaddleCenter = pongAIPaddle.y + PADDLE_HEIGHT / 2;
    const targetY = pongBall.y; // Target the ball's current Y
    const dy = targetY - aiPaddleCenter;
    // Move by a fraction of the distance, capped by max speed
    let moveAmount = dy * 0.1; // Move 10% of the way each frame (adjust for difficulty)
    moveAmount = Math.max(-AI_PADDLE_MAX_SPEED, Math.min(AI_PADDLE_MAX_SPEED, moveAmount));
    pongAIPaddle.y += moveAmount;
    
    // Keep AI paddle in bounds
    if (pongAIPaddle.y < 0) pongAIPaddle.y = 0;
    if (pongAIPaddle.y + PADDLE_HEIGHT > pongCanvas.height) pongAIPaddle.y = pongCanvas.height - PADDLE_HEIGHT;

    // Ball collision with top/bottom walls (remains same)
    if (pongBall.y - BALL_RADIUS < 0) {
        pongBall.y = BALL_RADIUS;
        pongBall.dy *= -1;
    }
     if (pongBall.y + BALL_RADIUS > pongCanvas.height) {
         pongBall.y = pongCanvas.height - BALL_RADIUS;
        pongBall.dy *= -1;
    }

    // Ball collision with paddles
    let paddleHit = false;
    // Player paddle (left)
    if (pongBall.dx < 0 && pongBall.x - BALL_RADIUS < PADDLE_WIDTH && pongBall.x - BALL_RADIUS > 0 && pongBall.y + BALL_RADIUS > pongPlayerPaddle.y && pongBall.y - BALL_RADIUS < pongPlayerPaddle.y + PADDLE_HEIGHT) {
        pongBall.dx *= -1.05; // Increase bounce speed increase slightly more
        pongBall.x = PADDLE_WIDTH + BALL_RADIUS;
        let deltaY = pongBall.y - (pongPlayerPaddle.y + PADDLE_HEIGHT / 2);
        pongBall.dy = deltaY * 0.30; // Increase vertical influence slightly
        paddleHit = true;
    }
    // AI paddle (right)
    else if (pongBall.dx > 0 && pongBall.x + BALL_RADIUS > pongCanvas.width - PADDLE_WIDTH && pongBall.x + BALL_RADIUS < pongCanvas.width && pongBall.y + BALL_RADIUS > pongAIPaddle.y && pongBall.y - BALL_RADIUS < pongAIPaddle.y + PADDLE_HEIGHT) {
        pongBall.dx *= -1.05; // Increase bounce speed increase slightly more
        pongBall.x = pongCanvas.width - PADDLE_WIDTH - BALL_RADIUS;
         let deltaY = pongBall.y - (pongAIPaddle.y + PADDLE_HEIGHT / 2);
         pongBall.dy = deltaY * 0.30; // Increase vertical influence slightly
         paddleHit = true;
    }
    
    // Speed limit (Increase max dx)
    pongBall.dx = Math.max(-16, Math.min(16, pongBall.dx)); 
    pongBall.dy = Math.max(-10, Math.min(10, pongBall.dy)); 
    
    // Scoring (remains same)
    if (pongBall.x + BALL_RADIUS < 0) {
        pongAIPaddle.score++;
        console.log(`Score: Player ${pongPlayerPaddle.score} - AI ${pongAIPaddle.score}`);
        resetPongBall();
    }
    if (pongBall.x - BALL_RADIUS > pongCanvas.width) {
        pongPlayerPaddle.score++;
        console.log(`Score: Player ${pongPlayerPaddle.score} - AI ${pongAIPaddle.score}`);
        resetPongBall();
    }

    // 2. Draw everything
    const currentTextColor = getComputedStyle(document.body).getPropertyValue('--text-color').trim() || '#333333'; // Fallback for safety
    const currentBorderColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#cccccc'; // Fallback

    // Clear canvas
    pongCtx.clearRect(0, 0, pongCanvas.width, pongCanvas.height);

    // Set fill style to theme text color
    pongCtx.fillStyle = currentTextColor;

    // Draw paddles
    pongCtx.fillRect(0, pongPlayerPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT); // Player paddle x is 0
    pongCtx.fillRect(pongCanvas.width - PADDLE_WIDTH, pongAIPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    pongCtx.beginPath();
    pongCtx.arc(pongBall.x, pongBall.y, BALL_RADIUS, 0, Math.PI * 2);
    pongCtx.fill();

    // Draw dashed line
    pongCtx.beginPath();
    pongCtx.setLineDash([5, 10]);
    pongCtx.moveTo(pongCanvas.width / 2, 0);
    pongCtx.lineTo(pongCanvas.width / 2, pongCanvas.height);
    pongCtx.strokeStyle = currentBorderColor; // Use border color for the dashed line
    pongCtx.lineWidth = 1;
    pongCtx.stroke();
    pongCtx.setLineDash([]);

    // Draw score
    pongCtx.fillStyle = currentTextColor; // Ensure fill style is set for text
    pongCtx.font = '30px sans-serif';
    pongCtx.textAlign = 'center';
    pongCtx.fillText(pongPlayerPaddle.score.toString(), pongCanvas.width / 4, 40);
    pongCtx.fillText(pongAIPaddle.score.toString(), pongCanvas.width * 3 / 4, 40);

    // Request next frame
    pongGameLoopId = requestAnimationFrame(pongGameLoop);
}
// --- End Pong Game ---

// --- Function to handle sending a message (MODIFIED SSE Handling) ---
async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') return;
    if (messageText.toLowerCase() === '/pong') { initPongGame(); return; }
    addMessage(messageText, 'user');
    userInput.value = '';
    userInput.disabled = true;
    sendButton.disabled = true; 
    setButtonIcon(sendButton, stopIconSVG);
    sendButton.removeEventListener('click', sendMessage);
    sendButton.addEventListener('click', stopGeneration);
    sendButton.disabled = false;

    // --- Add Typing Indicator Placeholder ---
    const botMessageId = `bot-message-${Date.now()}`;
    const placeholderContent = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    const botMessageDiv = addMessage(placeholderContent, 'bot', botMessageId, currentPersona);

    let accumulatedBotResponse = "";
    abortController = new AbortController(); 
    const signal = abortController.signal;
    let isPokedexRendered = false; // Flag to track if Pokedex was handled

    try {
        // --- Prepare payload (remains same) ---
        const payload = {
            message: messageText, 
            history: chatHistory,
            persona: currentPersona // Send the persona NAME
        };
        if (currentPersona === 'custom') { payload.customRuleset = userCustomRuleset; }
        console.log(`[sendMessage] Sending payload: ${JSON.stringify(payload)}`);

        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: signal
        });

        if (!response.ok || !response.body) {
             let errorMsg = `HTTP error! status: ${response.status}`;
             try { const errData = await response.json(); if(errData.error) errorMsg = errData.error;} catch(e){} 
             throw new Error(errorMsg);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let firstChunkReceived = false;
        let sseBuffer = ""; // Buffer for incomplete SSE messages

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                 console.log(`Stream finished for ${botMessageId}.`);
                 if (!isPokedexRendered) {
                     finalizeStreamingMessage(botMessageId, messageText, accumulatedBotResponse);
                 }
                 // Process any remaining data in the buffer if stream ends unexpectedly
                 if (sseBuffer.trim()) {
                     console.warn("Processing remaining buffer data after stream end:", sseBuffer);
                     // You might want more robust handling here depending on expected messages
                     // For now, just log it.
                 }
                break;
            }

            const chunkText = decoder.decode(value, { stream: true });
            sseBuffer += chunkText; // Append new chunk to buffer

            let separatorIndex;
            // Process buffer as long as it contains a complete message separator
            while ((separatorIndex = sseBuffer.indexOf('\n\n')) >= 0) {
                const messageText = sseBuffer.substring(0, separatorIndex); // Extract message
                sseBuffer = sseBuffer.substring(separatorIndex + 2); // Remove message + separator from buffer

                if (!messageText) continue; // Skip empty messages
                
                // Now process the complete messageText
                if (messageText.startsWith('data:')) {
                    const jsonData = messageText.substring(5).trim();
                    if (!jsonData) continue; // Skip empty data
                    
                    console.log("[SSE Buffered] Attempting to process data:", jsonData);
                    // Only attempt JSON parse if it looks like JSON
                    if (jsonData.startsWith('{') || jsonData.startsWith('[')) { 
                        try {
                            const parsedData = JSON.parse(jsonData);
                            
                            if (parsedData.pokedex_entry) {
                                // --- Handle Pokedex Entry --- 
                                console.log("Processing Pokedex Entry Data for:", botMessageId);
                                const targetDiv = document.getElementById(botMessageId);
                                if (targetDiv) {
             if (!firstChunkReceived) {
                                         console.log("First chunk received (pokedex), clearing placeholder for", botMessageId);
                                         targetDiv.innerHTML = ''; 
                 firstChunkReceived = true;
             }
                                    renderPokedexEntry(targetDiv, parsedData.pokedex_entry); 
                                    isPokedexRendered = true; 
                                } else { console.error("Target div not found for Pokedex"); }
                            }
                            else if (parsedData.chunk && parsedData.chunk.length > 0) {
                                // --- Handle Text Chunk --- 
                                if (!firstChunkReceived) {
                                    console.log("First chunk received (text), clearing placeholder for", botMessageId);
                                    const currentBotMsgDiv = document.getElementById(botMessageId);
                                    if (currentBotMsgDiv) currentBotMsgDiv.innerHTML = '';
                                    firstChunkReceived = true;
                                }
                                updateStreamingMessage(botMessageId, parsedData.chunk);
                                accumulatedBotResponse += parsedData.chunk; 
                            } 
                            else if (parsedData.error) {
                                // --- Handle Error Object --- 
                                if (!firstChunkReceived) {
                                     console.log("First chunk received (error), clearing placeholder for", botMessageId);
                                     const currentBotMsgDiv = document.getElementById(botMessageId);
                                     if (currentBotMsgDiv) currentBotMsgDiv.innerHTML = '';
                                     firstChunkReceived = true; 
                                 }
                                console.error("Received error object from stream:", parsedData.error);
                                const errorText = `\n\n**Error:** ${parsedData.error}`;
                                updateStreamingMessage(botMessageId, errorText);
                                accumulatedBotResponse += errorText;
                             }
                         } catch (e) {
                             console.warn("JSON Parse Failed for supposed JSON:", jsonData, e);
                         }
                    } else {
                        // Handle non-JSON data lines if necessary (e.g., the 'finished' message)
                        console.log("[SSE Buffered] Received non-JSON data line:", jsonData);
                        if (jsonData === 'finished') {
                            console.log("Stream explicitly marked as finished by data.");
                            // Optional: Trigger finalization slightly earlier?
                            // finalizeStreamingMessage(botMessageId, messageText, accumulatedBotResponse);
                        }
                    }
                 } else if (messageText.startsWith('event: end')) {
                     console.log("Received end event from stream."); 
                 } else if (messageText.startsWith('event: error')) {
                     console.error("Received explicit error event from stream.");
                 }
                 // Ignore other lines/events for now
            } // End while(separatorIndex)
        } // End while(true)

    } catch (error) {
        // ... existing error handling ...
        if (error.name === 'AbortError') { 
            console.log('Fetch aborted by user.');
            const stoppedText = accumulatedBotResponse + " *(Stopped)*";
            const botMsgDiv = document.getElementById(botMessageId);
            const stoppedPersona = botMsgDiv ? botMsgDiv.dataset.persona : currentPersona;
            // Finalize stopped message (will use placeholder text if Pokedex was rendered)
            finalizeStreamingMessage(botMessageId, messageText, stoppedText, isPokedexRendered); 
        } else {
            console.error('Error during fetch/stream:', error);
            const errorText = `**Error:** Sorry, I couldn't get a response. ${error.message}`;
            const botMsgDiv = document.getElementById(botMessageId);
            if (botMsgDiv) {
                renderBotMessageContent(botMsgDiv, errorText); 
                const errorPersona = botMsgDiv.dataset.persona || currentPersona;
                 // Finalize error message (will use placeholder text if Pokedex was rendered)
                 finalizeStreamingMessage(botMessageId, messageText, errorText, isPokedexRendered);
            } else {
                 addMessage(errorText, 'bot'); // Add new error if original div gone
            }
        }
    } finally {
        // --- Restore Send Button --- (remains same)
        userInput.disabled = false;
        setButtonIcon(sendButton, sendIconSVG);
        sendButton.removeEventListener('click', stopGeneration);
        sendButton.addEventListener('click', sendMessage);
        sendButton.disabled = false;
        abortController = null;
        scrollToBottom(); 
    }
}

// --- Function to handle stopping generation (MODIFIED) ---
function stopGeneration() {
    console.log("Stop button clicked.");
    if (abortController) {
        console.log("AbortController found, calling abort().");
        abortController.abort(); // AbortError will be caught in sendMessage/streamResponse
        // Button restoration is handled in the finally block of the try/catch that catches AbortError
    } else {
        console.log("AbortController not found.");
        // If no controller, maybe manually restore button just in case?
        userInput.disabled = false;
        setButtonIcon(sendButton, sendIconSVG); 
        sendButton.removeEventListener('click', stopGeneration);
        sendButton.addEventListener('click', sendMessage); 
        sendButton.disabled = false;
    }
}

// --- Clear Chat Logic ---
function clearChat() {
    if (confirm("Are you sure you want to clear the entire chat history?")) {
        chatHistory = []; // Clear the JS history variable
        chatBox.innerHTML = ''; // Clear the visual chat box
        console.log("Chat history cleared.");
        // Optional: Add a default message back?
        // addMessage("Chat cleared. How can I help?", "bot");
        settingsMenu.classList.remove('visible'); // Hide menu after clearing
    }
}

// --- Event Listeners (Updated for Checkbox) ---
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
themeCheckbox.addEventListener('change', toggleTheme); // Add listener for theme checkbox change
// stopButton.addEventListener('click', stopGeneration); // Removed stop button listener
settingsIcon.addEventListener('click', toggleSettingsMenu); // Listener for settings icon
saveSettingsButton.addEventListener('click', saveSettings); // Listener for save button
clearChatButton.addEventListener('click', clearChat); // Add listener for clear button
personaSelect.addEventListener('change', handlePersonaChange); // Add listener for persona change

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    loadInitialTheme();
    userInput.focus();
    // Set initial button icons
    setButtonIcon(sendButton, sendIconSVG);
    // setButtonIcon(settingsIcon, settingsIconSVG); // REMOVED - Use emoji from HTML
    // No initial stop button icon needed
    // Load saved states
    currentPersona = localStorage.getItem('chatbotPersona') || "default"; // Selected persona
    userCustomRuleset = localStorage.getItem('userCustomRuleset') || ""; // User's text

    if (currentPersona) {
        personaSelect.value = currentPersona;
    }
    // Populate textarea with user's custom text (might be hidden initially)
    rulesetInput.value = userCustomRuleset;
    handlePersonaChange(); // Ensure correct initial visibility
    updateHeaderAndMood(); // *** Call updated function on load ***
});

// --- Function to handle regenerating the last bot response (MODIFIED PAYLOAD) ---
async function handleRegenerate(messageWrapper) { 
    const messageId = messageWrapper.dataset.messageId;
    console.log(`Regenerate requested for message ID: ${messageId}`);

    if (!messageId) {
        console.error("Could not find message ID on wrapper for regeneration.");
        return;
    }
    
    // Find the bot message and its preceding user message IN THE HISTORY ARRAY
    let botEntryIndex = -1;
    let userEntry = null;
    let botEntry = null;

    // Iterate backwards through history to find the bot message by ID
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        // Check if it's an assistant entry and has at least 4 elements (role, content, id, persona)
        if (chatHistory[i][0] === 'assistant' && chatHistory[i].length >= 4 && chatHistory[i][2] === messageId) {
            botEntryIndex = i;
            botEntry = chatHistory[i];
            // Check if the preceding entry is a user message
            if (i > 0 && chatHistory[i - 1][0] === 'user') {
                userEntry = chatHistory[i - 1];
            }
            break; // Found the bot message
        }
    }

    if (!userEntry || !botEntry) {
        console.error(`Could not find a valid user/assistant pair in history for message ID: ${messageId}`);
        return;
    }

    const userMessageToResend = userEntry[1];
    const botMessageElementId = botEntry[2]; 
    const originalPersona = botEntry[3] || 'default'; // Get original persona NAME from history[3]

    console.log(`Found pair: User="${userMessageToResend}", BotElementID=${botMessageElementId}, OriginalPersona=${originalPersona}`);

    // 1. Prepare history *before* the message pair
    const historyBeforePair = chatHistory.slice(0, botEntryIndex - 1);

    // 2. Visually update the bot message to show loading
    const botMessageDiv = document.getElementById(botMessageElementId);
    if (!botMessageDiv) {
        console.error("Could not find bot message element to update:", botMessageElementId);
        return;
    }
    const placeholderContent = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    botMessageDiv.innerHTML = placeholderContent;
    botMessageDiv.dataset.rawText = ""; 
    // Update visual persona class immediately
    Object.keys(personaMoods).forEach(p => botMessageDiv.classList.remove(`persona-${p}`));
    botMessageDiv.classList.add(`persona-${originalPersona}`);
    botMessageDiv.dataset.persona = originalPersona; 


    // Disable buttons during regeneration
    userInput.disabled = true;
    sendButton.disabled = true;

    // 3. Call streaming function with original persona NAME
    await streamResponseForElement(userMessageToResend, historyBeforePair, botMessageElementId, originalPersona);

    // Re-enable buttons (handled in streamResponseForElement's finally block)
}

// --- Function to handle streaming for regeneration/editing (MODIFIED PAYLOAD) ---
async function streamResponseForElement(messageToSend, historyForContext, targetElementId, personaToUse) { 
    
    let accumulatedBotResponse = "";
    abortController = new AbortController(); 
    const signal = abortController.signal;

    // --- Transform Send button to Stop button --- 
    setButtonIcon(sendButton, stopIconSVG);
    sendButton.removeEventListener('click', sendMessage); 
    sendButton.addEventListener('click', stopGeneration); 
    sendButton.disabled = false; 

    try {
        console.log(`[streamResponse] Sending history: ${JSON.stringify(historyForContext)}`); 
        console.log(`[streamResponse] Sending message: "${messageToSend}"`);
        console.log(`[streamResponse] Sending persona name: "${personaToUse}"`); 

        // --- Prepare payload --- 
        const payload = {
            message: messageToSend, 
            history: historyForContext, 
            persona: personaToUse // Send the persona NAME
        };
        // Add custom rules only if persona is 'custom'
        if (personaToUse === 'custom') {
             // Use the globally stored userCustomRuleset for regeneration if custom
            payload.customRuleset = userCustomRuleset; 
            console.log(`[streamResponse] Sending customRuleset: "${payload.customRuleset}"`);
        }

        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: signal
        });

        if (!response.ok || !response.body) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let firstChunkReceived = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("Stream finished for element:", targetElementId);
                // Finalize involves UPDATING the history, not just appending
                finalizeRegeneratedMessage(targetElementId, messageToSend, accumulatedBotResponse, historyForContext, personaToUse);
                break;
            }

            const chunkText = decoder.decode(value, { stream: true });

            // Process potential multiple SSE messages in one chunk
             const lines = chunkText.split('\n\n');
             lines.forEach(line => {
                line = line.trim(); 
                 if (line.startsWith('data:')) {
                    const jsonData = line.substring(5).trim();
                     try {
                         const parsedData = JSON.parse(jsonData);
                        const botMessageDiv = document.getElementById(targetElementId); 
                        if (parsedData.chunk && parsedData.chunk.length > 0) {
                            if (!firstChunkReceived) {
                                botMessageDiv.innerHTML = ''; 
                                firstChunkReceived = true;
                            }
                            if (botMessageDiv) { 
                                updateStreamingMessage(targetElementId, parsedData.chunk);
                                accumulatedBotResponse += parsedData.chunk; 
                            }
                         } else if (parsedData.error) {
                             if (botMessageDiv) { 
                                if (!firstChunkReceived) {
                                    botMessageDiv.innerHTML = ''; 
                                    firstChunkReceived = true; 
                                }
                            console.error("Received error from stream:", parsedData.error);
                                const errorText = `\n\n**Error:** ${parsedData.error}`;
                                updateStreamingMessage(targetElementId, errorText);
                                accumulatedBotResponse += errorText;
                            }
                         }
                     } catch (e) {
                         console.warn("Could not parse JSON data chunk:", jsonData, e);
                     }
                 } else if (line.startsWith('event: end')) {
                     console.log("Received end event from stream.");
                     // The main `done` condition handles finalization now
                 } else if (line.startsWith('event: error')) {
                     console.error("Received explicit error event from stream.");
                 }
             });
        }

    } catch (error) {
        const botMessageDiv = document.getElementById(targetElementId);
        if (error.name === 'AbortError') { 
            console.log('Fetch aborted by user during regenerate/edit.');
             if (botMessageDiv) updateStreamingMessage(targetElementId, " *(Generation stopped)*");
            // Finalize with partial response, marking as stopped, using the correct persona
            finalizeRegeneratedMessage(targetElementId, messageToSend, accumulatedBotResponse + " *(Stopped)*", historyForContext, personaToUse); // Pass persona
        } else {
            // ... existing error handling ...
             // Finalize with error message, using correct persona
             finalizeRegeneratedMessage(targetElementId, messageToSend, `**Error:** Could not regenerate. ${error.message}`, historyForContext, personaToUse);
        }
    } finally {
        // Restore Send Button (same as sendMessage finally)
        userInput.disabled = false;
        setButtonIcon(sendButton, sendIconSVG);
        sendButton.removeEventListener('click', stopGeneration);
        sendButton.addEventListener('click', sendMessage);
        sendButton.disabled = false;
        abortController = null;
        scrollToBottom(); // Ensure scroll after update
    }
}

// --- finalizeRegeneratedMessage: Show reaction button ---
function finalizeRegeneratedMessage(elementId, userMessage, finalBotText, historyBeforePair, persona) {
    // Reconstruct history: old history + user message + new bot response (with persona)
    chatHistory = [ 
        ...historyBeforePair, 
        ["user", userMessage],
        ["assistant", finalBotText, elementId, persona] // Store with element ID and PERSONA
    ];
    console.log("History updated after regeneration/stopping:", chatHistory);
    
    // Also ensure the reaction button is visible for the regenerated message
    showReactionButton(elementId); // *** SHOW button on finalize ***
}

// --- finalizeStoppedMessage: Show reaction button ---
function finalizeStoppedMessage(elementId, userMessage, stoppedBotText, persona) {
     // Append user message + stopped bot message (with persona) to history
    chatHistory.push(["user", userMessage]);
    chatHistory.push(["assistant", stoppedBotText, elementId, persona]);
    console.log("History updated after stopping initial generation:", chatHistory);
    
    showReactionButton(elementId); // *** SHOW button on finalize ***
}

// --- Function to update mood indicator AND Header Title (RENAMED & MODIFIED) ---
function updateHeaderAndMood() {
    // Update mood emoji
    moodIndicator.textContent = personaMoods[currentPersona] || personaMoods["default"];
    
    // Update header title
    const headerTitleElement = document.getElementById('header-title'); // Assuming this ID
    if (headerTitleElement) {
        headerTitleElement.textContent = personaDisplayNames[currentPersona] || "AI Chatbot";
    }
}

// --- Emoji Reaction Logic ---
const availableReactions = ['👍', '😂', '❤️', '🤔', '🎉', '😢'];
let currentPaletteTarget = null; // Keep track of which message palette is open

function toggleReactionsPalette(event, messageWrapper) {
    event.stopPropagation(); // Prevent click bubbling to document listener
    closeReactionsPalette(); // Close any existing palette

    const palette = document.createElement('div');
    palette.className = 'reactions-palette visible';
    palette.id = 'reactions-palette-active'; // Unique ID for easy closing

    availableReactions.forEach(emoji => {
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'reaction-emoji';
        emojiSpan.textContent = emoji;
        emojiSpan.onclick = () => {
            addOrUpdateReaction(messageWrapper.dataset.messageId, emoji);
            closeReactionsPalette();
        };
        palette.appendChild(emojiSpan);
    });

    // Append palette near the button that triggered it
    const controlsDiv = messageWrapper.querySelector('.message-controls');
    if (controlsDiv) {
        controlsDiv.appendChild(palette);
        currentPaletteTarget = palette; // Store reference
    } else {
        console.error("Could not find controls div for palette");
    }
}

function closeReactionsPalette() {
    const existingPalette = document.getElementById('reactions-palette-active');
    if (existingPalette) {
        existingPalette.remove();
        currentPaletteTarget = null;
    }
}

// Function to add/update reaction display AND trigger bot reaction (with streaming)
async function addOrUpdateReaction(messageId, selectedEmoji) {
    const reactionsContainer = document.getElementById(`reactions-${messageId}`);
    if (!reactionsContainer) return;

    // Find the message element to get text and persona
    const messageElement = document.getElementById(messageId);
    if (!messageElement) {
        console.error("Could not find message element for reaction context:", messageId);
        return;
    }
    const originalText = messageElement.dataset.rawText || messageElement.textContent;
    const messagePersona = messageElement.dataset.persona; // Bot's persona name

    // --- Update UI (Reaction Bubble) --- 
    let existingBubble = null;
    reactionsContainer.querySelectorAll('.reaction-bubble').forEach(bubble => {
        if (bubble.dataset.emoji === selectedEmoji) {
            existingBubble = bubble;
        }
    });
    if (existingBubble) {
        const countSpan = existingBubble.querySelector('.count');
        let currentCount = parseInt(countSpan.textContent || '1', 10);
        countSpan.textContent = currentCount + 1;
    } else {
        const bubble = document.createElement('div');
        bubble.className = 'reaction-bubble';
        bubble.dataset.emoji = selectedEmoji;
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = selectedEmoji;
        const countSpan = document.createElement('span');
        countSpan.className = 'count';
        countSpan.textContent = '1';
        bubble.appendChild(emojiSpan);
        bubble.appendChild(countSpan);
        reactionsContainer.appendChild(bubble);
    }

    // --- Trigger Bot Reaction Stream ---
    console.log(`User reacted with ${selectedEmoji} to message ${messageId} (Persona: ${messagePersona})`);
    
    if (messagePersona && messagePersona !== 'user') {
        let ackPlaceholderDiv = null;
        let accumulatedAckResponse = "";
        let ackElementId = null;
        
        try {
            // --- Add Acknowledgment Placeholder (Mark its type) ---
            const placeholderContent = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
            // Pass 'acknowledgment' as the messageType
            ackPlaceholderDiv = addMessage(placeholderContent, 'bot', null, messagePersona, 'acknowledgment');
            ackElementId = ackPlaceholderDiv.id; // Store the ID for streaming
            console.log(`Added acknowledgment placeholder with ID: ${ackElementId}`);

            // --- Fetch and Stream the acknowledgment --- 
            const response = await fetch('/react', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: messageId,
                    emoji: selectedEmoji,
                    originalText: originalText.substring(0, 500), 
                    botPersona: messagePersona 
                })
                // No AbortController needed for this short message?
            });
            
            if (!response.ok || !response.body) {
                // Attempt to parse error from body if possible
                let errorMsg = `HTTP error! status: ${response.status}`;
                try { 
                    const errData = await response.json(); 
                    if(errData.error) errorMsg = errData.error;
                } catch (e) {/* Ignore parsing error */}
                 throw new Error(errorMsg);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let firstChunkReceived = false;

            // Stream processing loop
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log(`Acknowledgment stream finished for ${ackElementId}.`);
                    finalizeAcknowledgmentMessage(ackElementId, accumulatedAckResponse, messagePersona);
                    break;
                }
                
                const chunkText = decoder.decode(value, { stream: true });
                const lines = chunkText.split('\n\n');
                
                lines.forEach(line => {
                    line = line.trim(); 
                    if (line.startsWith('data:')) {
                        const jsonData = line.substring(5).trim();
                        try {
                            const parsedData = JSON.parse(jsonData);
                            if (parsedData.chunk && parsedData.chunk.length > 0) {
                                if (!firstChunkReceived) {
                                    // Clear placeholder on first chunk
                                    const currentAckDiv = document.getElementById(ackElementId);
                                    if (currentAckDiv) currentAckDiv.innerHTML = ''; 
                                    firstChunkReceived = true;
                                }
                                updateStreamingMessage(ackElementId, parsedData.chunk);
                                accumulatedAckResponse += parsedData.chunk; 
                            } else if (parsedData.error) {
                                // Handle error within the stream
                                console.error("Received error from ack stream:", parsedData.error);
                                const errorText = `\n\n**Error:** ${parsedData.error}`;
                                if (!firstChunkReceived) {
                                     const currentAckDiv = document.getElementById(ackElementId);
                                     if (currentAckDiv) currentAckDiv.innerHTML = '';
                                     firstChunkReceived = true; 
                                }
                                updateStreamingMessage(ackElementId, errorText);
                                accumulatedAckResponse += errorText;
                                // Stop processing further chunks on error? Maybe let it finish?
                            }
                        } catch (e) {
                            console.warn("Could not parse JSON data chunk for ack:", jsonData, e);
                        }
                    } else if (line.startsWith('event: end')) {
                         console.log("Received end event from ack stream.");
                         // The main `done` condition handles finalization now
                    } else if (line.startsWith('event: error')) {
                         console.error("Received explicit error event from ack stream.");
                    }
                });
            } // End while loop

        } catch (error) {
            console.error("Error fetching/streaming acknowledgment:", error);
            // Update placeholder with error message if it exists
            if (ackElementId) {
                const errorText = `*(Sorry, failed to acknowledge: ${error.message})*`;
                // Use finalize function to handle history update correctly even for error
                finalizeAcknowledgmentMessage(ackElementId, errorText, messagePersona);
                // Ensure placeholder is cleared and error shown
                const errorDiv = document.getElementById(ackElementId);
                if (errorDiv) renderBotMessageContent(errorDiv, errorText); 
            } else {
                 // If placeholder wasn't even created, add a new error message
                 addMessage(`*(Sorry, failed to process reaction: ${error.message})*`, 'bot', null, 'default'); // Use default persona for this error
            }
        }
    } else {
        console.log("Not requesting bot reaction for user message or message with unknown persona.");
    }
}

// --- Helper to show reaction button ---
function showReactionButton(messageElementOrId) {
    let messageDiv = null;
    if (typeof messageElementOrId === 'string') {
        messageDiv = document.getElementById(messageElementOrId);
    } else {
        messageDiv = messageElementOrId;
    }
    if (messageDiv) {
        // *** Check if this is an acknowledgment message ***
        if (messageDiv.dataset.messageType === 'acknowledgment') {
            console.log("Skipping reaction button for acknowledgment message:", messageDiv.id);
            return; // Do not show button for acknowledgment messages
        }

        // Find the controls associated with this message
        const controls = messageDiv.closest('.message-content-controls-block')?.querySelector('.message-controls');
        if (controls) {
            const reactBtn = controls.querySelector('.react-btn');
            if (reactBtn) {
                reactBtn.style.display = ''; // Make visible
                 console.log("Showing reaction button for:", messageDiv.id);
            }
        }
    }
}

// Add document listener to close palette on outside click
document.addEventListener('click', (event) => {
    if (currentPaletteTarget && !currentPaletteTarget.contains(event.target)) {
        // Check if click was on a reaction button itself
        let target = event.target;
        let isReactBtn = false;
        while (target != null) {
            if (target.classList && target.classList.contains('react-btn')) {
                isReactBtn = true;
                break;
            }
            target = target.parentElement;
        }
        if (!isReactBtn) {
             closeReactionsPalette();
        }
    }
});

// --- NEW function to finalize acknowledgment message ---
function finalizeAcknowledgmentMessage(elementId, finalAckText, persona) {
    const ackDiv = document.getElementById(elementId);
    if (ackDiv) {
        console.log(`Acknowledgment streaming finished for ${elementId}: ${finalAckText}`);
        // Use the accumulated text from the dataset, or the final text if dataset is empty
        const completeRawText = ackDiv.dataset.rawText || finalAckText;
        renderBotMessageContent(ackDiv, completeRawText); // Ensure final rendering without cursor
        
        // Add acknowledgment to history (no preceding user message)
        chatHistory.push(["assistant", completeRawText, elementId, persona]); // Use complete text for history
        console.log("History updated with acknowledgment:", chatHistory);
        showReactionButton(ackDiv); // Ensure buttons are visible for the ack msg
    } else {
        console.error("Could not find acknowledgment element to finalize:", elementId);
    }
}

// --- NEW: Render Pokedex Entry HTML (Add Evolves Into Section) ---
function renderPokedexEntry(messageDiv, data) {
    console.log("[renderPokedexEntry] Appending to messageDiv:", messageDiv.id);
    console.log("[renderPokedexEntry] Received data:", data);
    // Removed clear: messageDiv.innerHTML = '';

    if (!data || !data.name || !data.id || !data.types || !data.abilities || !data.stats || !data.flavor_text || data.height_m === undefined || data.weight_kg === undefined || !data.next_evolutions) {
        console.error("[renderPokedexEntry] Invalid or incomplete data received (check next_evolutions):", data);
        const errorP = document.createElement('p');
        errorP.innerHTML = "<em>Error displaying Pokédex data for one form.</em>";
        messageDiv.appendChild(errorP);
        return;
    }

    const container = document.createElement('div');
    container.className = 'pokedex-container';
    container.style.marginBottom = '15px'; 

    // --- Header (Name, ID) --- 
    const header = document.createElement('div');
    header.className = 'pokedex-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'pokedex-name';
    nameSpan.textContent = data.name;
    const idSpan = document.createElement('span');
    idSpan.className = 'pokedex-id';
    idSpan.textContent = `#${data.id.toString().padStart(4, '0')}`;
    header.appendChild(nameSpan);
    header.appendChild(idSpan);
    container.appendChild(header);

    // --- Image Container (Now separate) --- 
    const imageContainer = document.createElement('div');
    imageContainer.className = 'pokedex-image-container';
    if (data.sprite_url) {
        const image = document.createElement('img');
        image.className = 'pokedex-image';
        image.src = data.sprite_url;
        image.alt = data.name;
        imageContainer.appendChild(image);
    } else {
        imageContainer.textContent = '(No Image)';
    }
    container.appendChild(imageContainer); // Append image container directly

    // --- Height/Weight Section (Now below image) ---
    const heightWeightSection = document.createElement('div');
    heightWeightSection.className = 'pokedex-section pokedex-height-weight'; // Re-use section class
    heightWeightSection.innerHTML = `
         <div><span class="hw-label">Height:</span><span class="hw-value">${data.height_m} m</span></div>
         <div><span class="hw-label">Weight:</span><span class="hw-value">${data.weight_kg} kg</span></div>
    `;
    container.appendChild(heightWeightSection);

    // --- Sections grid (Type/Abilities) --- 
    const sections = document.createElement('div');
    sections.className = 'pokedex-sections';
    // Types Section
    const typesSection = document.createElement('div');
    typesSection.className = 'pokedex-section type-section';
    const typesLabel = document.createElement('div');
    typesLabel.className = 'pokedex-section-label';
    typesLabel.textContent = 'Type';
    typesSection.appendChild(typesLabel);
    const typesBox = document.createElement('div');
    typesBox.className = 'pokedex-section-content type-box';
    data.types.forEach(type => {
        const typeTag = document.createElement('span');
        typeTag.className = `type-tag type-tag-${type.toLowerCase()}`;
        typeTag.textContent = type; 
        typesBox.appendChild(typeTag);
    });
    typesSection.appendChild(typesBox);
    sections.appendChild(typesSection);
    // Abilities Section
    const abilitiesSection = document.createElement('div');
    abilitiesSection.className = 'pokedex-section ability-section';
    const abilitiesLabel = document.createElement('div');
    abilitiesLabel.className = 'pokedex-section-label';
    abilitiesLabel.textContent = 'Abilities';
    abilitiesSection.appendChild(abilitiesLabel);
    const abilitiesBox = document.createElement('div');
    abilitiesBox.className = 'pokedex-section-content ability-box';
    data.abilities.forEach(ability => {
        const abilitySpan = document.createElement('span');
        abilitySpan.className = 'ability-name';
        abilitySpan.textContent = ability.name;
        if (ability.is_hidden) {
            const hiddenTag = document.createElement('span');
            hiddenTag.className = 'hidden-ability-tag';
            hiddenTag.textContent = '(Hidden)';
            abilitySpan.appendChild(hiddenTag);
        }
         abilitiesBox.appendChild(abilitySpan);
    });
    abilitiesSection.appendChild(abilitiesBox);
    sections.appendChild(abilitiesSection);
    container.appendChild(sections);

    // --- Stats Section --- 
    const statsSection = document.createElement('div');
    statsSection.className = 'pokedex-section stats-section';
    const statsLabel = document.createElement('div');
    statsLabel.className = 'pokedex-section-label';
    statsLabel.textContent = 'Base Stats';
    statsSection.appendChild(statsLabel);
    const statsBox = document.createElement('div');
    statsBox.className = 'pokedex-section-content stats-box';
    const maxStatValue = 255;
    data.stats.forEach(stat => {
        const statRow = document.createElement('div');
        statRow.className = 'stat-row';
        const statName = document.createElement('span');
        statName.className = 'stat-name';
        statName.textContent = stat.name;
        const statBarContainer = document.createElement('div');
        statBarContainer.className = 'stat-bar-container';
        const statBar = document.createElement('div');
        statBar.className = 'stat-bar';
        statBar.style.width = `${(stat.base_stat / maxStatValue) * 100}%`;
        if (stat.base_stat >= 100) statBar.classList.add('high-stat');
        else if (stat.base_stat >= 60) statBar.classList.add('mid-stat');
        else statBar.classList.add('low-stat');
        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = stat.base_stat;
        statBarContainer.appendChild(statBar);
        statRow.appendChild(statName);
        statRow.appendChild(statBarContainer);
        statRow.appendChild(statValue);
        statsBox.appendChild(statRow);
    });
    statsSection.appendChild(statsBox);
    container.appendChild(statsSection);

    // --- Flavor Text Section --- 
    const flavorSection = document.createElement('div');
    flavorSection.className = 'pokedex-flavor-section';
    const flavorTextP = document.createElement('p');
    flavorTextP.className = 'pokedex-flavor-text';
    flavorTextP.textContent = data.flavor_text;
    flavorSection.appendChild(flavorTextP);
    container.appendChild(flavorSection);

    // --- Evolves Into Section (Check if data exists) ---
    if (data.next_evolutions && data.next_evolutions.length > 0) {
        const evolvesSection = document.createElement('div');
        evolvesSection.className = 'pokedex-section pokedex-evolves-into';
        
        const evolvesLabel = document.createElement('div');
        evolvesLabel.className = 'pokedex-section-label';
        evolvesLabel.textContent = 'Evolves Into';
        evolvesSection.appendChild(evolvesLabel);

        const evolvesBox = document.createElement('div');
        evolvesBox.className = 'evolves-into-box';
        data.next_evolutions.forEach(evoName => {
            const evoSpan = document.createElement('span');
            evoSpan.className = 'evolution-link';
            evoSpan.textContent = evoName;
            // Ensure name for dataset is lowercase and hyphenated for potential API query
            evoSpan.dataset.pokemonName = evoName.toLowerCase().replace(/ /g, '-'); 
            evolvesBox.appendChild(evoSpan);
        });
        evolvesSection.appendChild(evolvesBox);
        container.appendChild(evolvesSection);
    } else {
        console.log(`[renderPokedexEntry] No next evolutions found for ${data.name}`);
    }

    messageDiv.appendChild(container);
    console.log("[renderPokedexEntry] Successfully appended Pokedex container for:", data.name);
}

// --- Add Click Listener for Evolution Links --- 
document.addEventListener('DOMContentLoaded', () => {
    // ... (existing listeners for theme, settings, etc.)

    // Delegated listener for evolution links
    chatBox.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('evolution-link')) {
            const pokemonName = target.dataset.pokemonName;
            if (pokemonName) {
                console.log(`Evolution link clicked for: ${pokemonName}`);
                userInput.value = `Tell me about ${pokemonName}`; // Set input field
                sendMessage(); // Trigger search for the evolved form
            }
        }
        // --- Add Reaction Button Listener (Existing) ---
        // ... (rest of reaction listener logic) ...
    });

     // --- Existing Send Button Listener --- 
    // sendButton.addEventListener('click', sendMessage); 
    // userInput.addEventListener('keypress', function(e) { ... });
});