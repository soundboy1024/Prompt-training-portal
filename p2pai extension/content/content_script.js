/**
 * This script is injected into Gemini and ChatGPT pages.
 * It finds the chat input area and adds "Share Prompt" and "Share Chat" buttons.
 * Uses a MutationObserver for dynamic web pages.
 */

const BUTTON_PROMPT_ID = "p2pai-share-prompt-button";
const BUTTON_CHAT_ID = "p2pai-share-chat-button";

const siteConfigs = {
	"chat.openai.com": {
		findTarget: (doc) => {
			let container = doc.querySelector('div[class*="min-h-14"]');
			if (!container) return null;
			let inputEl = container.querySelector('div#prompt-textarea[contenteditable="true"]');
			let anchor = container.querySelector('button[data-testid="send-button"]');
			if (container && anchor) {
				return { container, anchor };
			}
			if (container && inputEl) {
				return { container, anchor: inputEl.nextElementSibling };
			}
			return null;
		},
		getText: (doc) => {
			let inputEl = doc.querySelector('div#prompt-textarea[contenteditable="true"]');
			return inputEl ? inputEl.textContent : "";
		},
		getChat: (doc) => {
			// Collect all user and assistant messages
			const messages = Array.from(doc.querySelectorAll('[data-message-author-role]'));
			return messages.map(m => m.textContent.trim()).filter(Boolean).join('\n---\n');
		}
	},
	"chatgpt.com": {
		// Same structure as chat.openai.com
		findTarget: (doc) => {
			let container = doc.querySelector('div[class*="min-h-14"]');
			if (!container) return null;
			let inputEl = container.querySelector('div#prompt-textarea[contenteditable="true"]');
			let anchor = container.querySelector('button[data-testid="send-button"]');
			if (container && anchor) {
				return { container, anchor };
			}
			if (container && inputEl) {
				return { container, anchor: inputEl.nextElementSibling };
			}
			return null;
		},
		getText: (doc) => {
			let inputEl = doc.querySelector('div#prompt-textarea[contenteditable="true"]');
			return inputEl ? inputEl.textContent : "";
		},
		getChat: (doc) => {
			const messages = Array.from(doc.querySelectorAll('[data-message-author-role]'));
			return messages.map(m => m.textContent.trim()).filter(Boolean).join('\n---\n');
		}
	},
	"gemini.google.com": {
		findTarget: (doc) => {
			const container = doc.querySelector('.input-area');
			const anchor = container?.querySelector('button[aria-label="Send message"]');
			if (container && anchor) {
				return { container, anchor };
			}
			return null;
		},
		getText: (doc) => {
			const inputEl = doc.querySelector('rich-textarea > div[contenteditable=true]');
			return inputEl ? inputEl.textContent : "";
		},
		getChat: (doc) => {
			// Gemini: try to get all message bubbles
			const messages = Array.from(doc.querySelectorAll('.message-content, .user-message'));
			return messages.map(m => m.textContent.trim()).filter(Boolean).join('\n---\n');
		}
	}
};

function injectButtons(container, anchor, config) {
		// Remove any existing buttons
		[BUTTON_PROMPT_ID, BUTTON_CHAT_ID].forEach(id => {
			const oldBtn = document.getElementById(id);
			if (oldBtn) oldBtn.remove();
		});

		// Share Prompt button
		const btnPrompt = document.createElement("button");
		btnPrompt.id = BUTTON_PROMPT_ID;
		btnPrompt.textContent = "Share Prompt";
		btnPrompt.style.marginRight = "8px";
		btnPrompt.addEventListener("click", (event) => {
			event.preventDefault();
			const promptText = config.getText(document).trim();
			if (promptText) {
				chrome.runtime.sendMessage({ type: "SHARE_PROMPT", text: promptText });
				btnPrompt.textContent = "Shared!";
				btnPrompt.disabled = true;
				setTimeout(() => {
					btnPrompt.textContent = "Share Prompt";
					btnPrompt.disabled = false;
				}, 2000);
			}
		});

		// Share Chat button
		const btnChat = document.createElement("button");
		btnChat.id = BUTTON_CHAT_ID;
		btnChat.textContent = "Share Chat";
		btnChat.addEventListener("click", (event) => {
			event.preventDefault();
			const chatText = config.getChat(document).trim();
			if (chatText) {
				chrome.runtime.sendMessage({ type: "SHARE_CHAT", text: chatText });
				btnChat.textContent = "Shared!";
				btnChat.disabled = true;
				setTimeout(() => {
					btnChat.textContent = "Share Chat";
					btnChat.disabled = false;
				}, 2000);
			}
		});

						// Create a flex group for both buttons
						const btnGroup = document.createElement('div');
						btnGroup.className = 'p2pai-btn-group';
						btnGroup.appendChild(btnPrompt);
						btnGroup.appendChild(btnChat);

						try {
							if (container && btnGroup) {
								if (
									anchor &&
									anchor.parentNode === container &&
									document.contains(container) &&
									document.contains(anchor)
								) {
									if (anchor.parentNode === container) {
										container.insertBefore(btnGroup, anchor);
									} else {
										container.appendChild(btnGroup);
									}
								} else {
									container.appendChild(btnGroup);
								}
							}
						} catch (e) {
							console.error('[P2PAI] Button injection error:', e, {container, anchor});
						}
}

function init() {
	const currentHostname = window.location.hostname;
	let config = siteConfigs[currentHostname];
	// Support chatgpt.com as well
	if (!config && currentHostname.includes("chatgpt.com")) config = siteConfigs["chatgpt.com"];
	if (!config) return;

	let injectionTimeout = null;
	const attemptInjection = () => {
		// If buttons already exist, do nothing
		if (document.getElementById(BUTTON_PROMPT_ID) || document.getElementById(BUTTON_CHAT_ID)) return;

		// Debounce rapid calls
		if (injectionTimeout) clearTimeout(injectionTimeout);
		injectionTimeout = setTimeout(() => {
			[BUTTON_PROMPT_ID, BUTTON_CHAT_ID].forEach(id => {
				const oldBtn = document.getElementById(id);
				if (oldBtn) oldBtn.remove();
			});
			const target = config.findTarget(document);
			if (target) {
				injectButtons(target.container, target.anchor, config);
			}
		}, 100); // 100ms debounce
	};

	const observer = new MutationObserver(attemptInjection);
	observer.observe(document.body, { childList: true, subtree: true });
	attemptInjection();
}

init();
