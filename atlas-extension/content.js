// PDF Extraction via Backend
async function extractPdfContent() {
  try {
    console.log("[Atlas AI] Downloading PDF for backend extraction...");

    // Fetch the PDF natively (uses browser cookies/auth so paywalled papers work!)
    const response = await fetch(window.location.href);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    const blob = await response.blob();

    console.log("[Atlas AI] Sending PDF to backend...");
    const formData = new FormData();
    const filename = document.title || "document.pdf";
    // Clean filename as some titles contain illegal chars
    formData.append("file", blob, filename.replace(/[/\\?%*:|"<>]/g, '-'));

    const bgResponse = await fetch("http://localhost:8000/analyze-pdf", {
      method: "POST",
      body: formData // Note: Do NOT set Content-Type header when using FormData
    });

    if (!bgResponse.ok) {
      throw new Error(`Backend PDF extraction failed: ${bgResponse.status}`);
    }

    const result = await bgResponse.json();

    console.log(`[Atlas AI] Extracted ${result.text.length} characters from PDF.`);

    return {
      title: result.title || document.title || "PDF Document",
      url: window.location.href,
      text: result.text,
      timestamp: Date.now(),
      type: "pdf"
    };

  } catch (e) {
    console.error("[Atlas AI] PDF Extraction failed:", e);
    return {
      title: document.title || "PDF Document",
      url: window.location.href,
      text: "Error extracting PDF text: " + e.message + "\n\nMake sure the backend is running and the PDF is accessible.",
      timestamp: Date.now(),
      type: "pdf" // So frontend logic handles it
    };
  }
}

async function extractContent() {
  // Check if PDF
  if (document.contentType === "application/pdf" || window.location.href.toLowerCase().endsWith(".pdf")) {
    console.log("[Atlas AI] Detected PDF. Extracting text via backend...");
    return await extractPdfContent();
  }

  const content = {
    title: document.title,
    url: window.location.href,
    text: document.body.innerText.slice(0, 8000),
    timestamp: Date.now()
  };

  console.log("[Atlas AI] Content extracted:", content);

  // Store in sessionStorage
  try {
    sessionStorage.setItem("atlas_content_" + window.location.href, JSON.stringify(content));
  } catch (e) { }

  return content;
}

// Initial Extract (async wrapper)
(async () => {
  await extractContent();
})();

// Re-extract on load is trickier with async, so we mostly rely on messages
window.addEventListener('load', () => extractContent());

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_CONTENT" || msg.type === "GET_CURRENT_CONTENT") {
    extractContent().then(data => {
      console.log("[Atlas AI] Sending extracted content:", data);
      sendResponse(data);
    });
    return true; // Keep channel open for async response
  }
});

// ===== STRUGGLE-SENSE FEATURE =====
// SIMPLE and WORKING version

async function analyzeStruggle(data) {
  console.log("[WHISPER] Analyzing struggle:", data.trigger);

  try {
    // Get page title only - super simple
    const title = document.title || "Learning";

    // Quick hardcoded hints (no backend call needed)
    const hints = {
      "rage_click": {
        text: "The element might be broken or unresponsive. Try refreshing the page.",
        confidence: 0.85
      },
      "erratic_scroll": {
        text: "Use the search or navigation menu to find what you're looking for.",
        confidence: 0.72
      },
      "tab_thrash": {
        text: "Keep the documentation open while coding for quick reference.",
        confidence: 0.80
      },
      "error_hover": {
        text: "Read the error message carefully - it tells you exactly what's wrong.",
        confidence: 0.90
      }
    };

    const hint = hints[data.trigger] || {
      text: "Take a moment and try a different approach.",
      confidence: 0.60
    };

    // Try to get backend hint (optional - don't block if fails)
    try {
      const response = await fetch("http://localhost:8000/analyze-struggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: data.trigger,
          page_title: title,
          page_text: "User learning content"
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("[WHISPER] Backend hint received:", result.hint);
        showWhisper(result.hint, result.confidence, data.trigger);
        return;
      }
    } catch (e) {
      console.log("[WHISPER] Backend unavailable, using fallback");
    }

    // Use hardcoded hint
    showWhisper(hint.text, hint.confidence, data.trigger);

  } catch (error) {
    console.error("[WHISPER] Error:", error);
    showWhisper("You seem stuck. Try a different approach.", 0.5, data.trigger);
  }
}

function showWhisper(hint, confidence, trigger) {
  console.log("[WHISPER] Showing toast with hint");

  // Remove old whisper
  const old = document.getElementById("atlas-whisper-toast");
  if (old) old.remove();

  // Create whisper
  const whisper = document.createElement("div");
  whisper.id = "atlas-whisper-toast";
  whisper.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
      padding: 16px;
      max-width: 300px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.3);
      font-family: Arial, sans-serif;
      animation: atlas-toast-in 0.4s ease-out;
    ">
      <div style="font-size: 20px; margin-bottom: 8px;">💡 Looks like you're stuck</div>
      <div style="font-size: 13px; line-height: 1.4; margin-bottom: 8px;">${hint}</div>
      <div style="font-size: 11px; opacity: 0.8;">Confidence: ${(confidence * 100).toFixed(0)}%</div>
    </div>
    <style>
      @keyframes atlas-toast-in {
        from { opacity: 0; transform: translateY(20px) scale(0.9); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes atlas-toast-out {
        to { opacity: 0; transform: translateY(10px); }
      }
    </style>
  `;

  document.body.appendChild(whisper);
  console.log("[WHISPER] Toast added to DOM");

  // Auto-remove after 7 seconds
  setTimeout(() => {
    whisper.style.animation = "atlas-toast-out 0.4s ease-out forwards";
    setTimeout(() => whisper.remove(), 400);
  }, 7000);
}

// LISTEN FOR STRUGGLE EVENTS
window.addEventListener('STRUGGLE_DETECTED', (event) => {
  console.log("[WHISPER] Event received:", event.detail);
  analyzeStruggle(event.detail);
});
