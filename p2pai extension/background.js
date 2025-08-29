console.log("Background service worker started.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check for the message type
  if (message.type === "SHARE_PROMPT") {
    console.log("Received prompt from content script:");
    console.log(`Tab ID: ${sender.tab.id}`);
    console.log(`Prompt Text: ${message.text}`);

    // You can now process this prompt, e.g., save it to storage,
    // send it to another service, or display it in the popup.
  }
});


