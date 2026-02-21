// sidebar.js - ULTRA FAST BOOT
// Optimized for instant load times
console.log("[Atlas AI] Sidebar script loaded");

// Ultra-fast caching
const analysisCache = {};
let currentTabUrl = null;
let currentContent = null;
let analysisInProgress = false;



/**
 * Initialize or retrieve chat history from chrome.storage.local
 */
async function initializeChatHistory() {
	return new Promise((resolve) => {
		chrome.storage.local.get(["atlas_chat_history"], (result) => {
			const history = result.atlas_chat_history || [];
			resolve(history);
		});
	});
}

/**
 * Save message to chat history
 */
async function saveChatMessage(role, content) {
	return new Promise((resolve) => {
		chrome.storage.local.get(["atlas_chat_history"], (result) => {
			const history = result.atlas_chat_history || [];
			history.push({
				role,
				content,
				timestamp: new Date().toISOString()
			});
			// Keep only last 50 messages
			const trimmedHistory = history.slice(-50);
			chrome.storage.local.set({ "atlas_chat_history": trimmedHistory }, () => {
				resolve(trimmedHistory);
			});
		});
	});
}

/**
 * Clear chat history
 */
async function clearChatHistory() {
	return new Promise((resolve) => {
		chrome.storage.local.set({ "atlas_chat_history": [] }, () => {
			resolve([]);
		});
	});
}





/**
 * Render chat messages from history (NON-BLOCKING)
 */
async function renderChatMessages() {
	const chatMessages = document.getElementById('chat-messages');

	if (!chatMessages) return;

	// Show default state immediately
	if (chatMessages.children.length === 0) {
		chatMessages.innerHTML = '<div class="chat-message system"><div class="chat-bubble">💬 Ask questions about this page...</div></div>';
	}

	// Load history in background
	return new Promise((resolve) => {
		chrome.storage.local.get(["atlas_chat_history"], (result) => {
			const history = result.atlas_chat_history || [];

			if (history.length === 0) {
				resolve();
				return;
			}

			chatMessages.innerHTML = '';
			history.forEach(msg => {
				const messageDiv = document.createElement('div');
				messageDiv.className = `chat-message ${msg.role}`;
				const bubble = document.createElement('div');
				bubble.className = 'chat-bubble';
				bubble.textContent = msg.content;
				messageDiv.appendChild(bubble);
				chatMessages.appendChild(messageDiv);
			});

			// Auto-scroll to bottom
			chatMessages.scrollTop = chatMessages.scrollHeight;
			resolve();
		});
	});
}

/**
 * Send message to backend and get response
 */
async function sendChatMessage(userMessage, pageContent) {
	const chatMessages = document.getElementById('chat-messages');
	const chatInput = document.getElementById('chat-input');
	const chatSend = document.getElementById('chat-send');

	if (!chatMessages || !chatInput || !chatSend) {
		console.error("[Atlas AI] Chat DOM elements not found");
		return;
	}

	if (!userMessage.trim()) return;

	// Save user message
	await saveChatMessage('user', userMessage);

	// Add user message to UI
	const userDiv = document.createElement('div');
	userDiv.className = 'chat-message user';
	const userBubble = document.createElement('div');
	userBubble.className = 'chat-bubble';
	userBubble.textContent = userMessage;
	userDiv.appendChild(userBubble);
	chatMessages.appendChild(userDiv);

	// Clear input
	chatInput.value = '';
	chatInput.focus();

	// Show loading indicator
	const loadingDiv = document.createElement('div');
	loadingDiv.className = 'chat-message assistant';
	const loadingBubble = document.createElement('div');
	loadingBubble.className = 'chat-bubble';
	loadingBubble.textContent = 'Thinking...';
	loadingDiv.appendChild(loadingBubble);
	loadingDiv.id = 'loading-message';
	chatMessages.appendChild(loadingDiv);
	chatMessages.scrollTop = chatMessages.scrollHeight;

	// Disable send button
	chatSend.disabled = true;

	try {
		// Call backend chat API
		const response = await fetch("http://localhost:8000/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				page_title: pageContent?.title || 'Chat',
				page_text: pageContent?.text || 'General Query',
				chat_query: userMessage
			})
		});

		if (!response.ok) throw new Error(`Backend error: ${response.status}`);
		const data = await response.json();

		let assistantMessage = data.result || "I'm not sure how to respond to that.";

		// Chat endpoint returns plain text, not JSON
		assistantMessage = assistantMessage.trim();

		// Remove loading indicator
		const loadingMsg = document.getElementById('loading-message');
		if (loadingMsg) loadingMsg.remove();

		// Save and display assistant response
		await saveChatMessage('assistant', assistantMessage);

		const assistantDiv = document.createElement('div');
		assistantDiv.className = 'chat-message assistant';
		const assistantBubble = document.createElement('div');
		assistantBubble.className = 'chat-bubble';
		assistantBubble.textContent = assistantMessage;
		assistantDiv.appendChild(assistantBubble);
		chatMessages.appendChild(assistantDiv);

		chatMessages.scrollTop = chatMessages.scrollHeight;
	} catch (e) {
		// Remove loading indicator
		const loadingMsg = document.getElementById('loading-message');
		if (loadingMsg) loadingMsg.remove();

		// Save and display error
		const errorMsg = "Error: " + e.message;
		await saveChatMessage('assistant', errorMsg);

		const errorDiv = document.createElement('div');
		errorDiv.className = 'chat-message assistant';
		const errorBubble = document.createElement('div');
		errorBubble.className = 'chat-bubble';
		errorBubble.textContent = errorMsg;
		errorDiv.appendChild(errorBubble);
		chatMessages.appendChild(errorDiv);

		chatMessages.scrollTop = chatMessages.scrollHeight;

		console.error("[Atlas AI] Chat error:", e);
	} finally {
		// Re-enable send button
		chatSend.disabled = false;
	}
}

/**
 * Initialize chat event listeners
 */
function initializeChatListeners(pageContent) {
	const chatSend = document.getElementById('chat-send');
	const chatInput = document.getElementById('chat-input');

	if (!chatSend || !chatInput) {
		return; // Not ready
	}

	// Remove old listeners by cloning
	const newChatSend = chatSend.cloneNode(true);
	chatSend.parentNode.replaceChild(newChatSend, chatSend);

	newChatSend.addEventListener('click', () => {
		if (chatInput.value.trim()) {
			sendChatMessage(chatInput.value, pageContent);
		}
	});

	chatInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (chatInput.value.trim()) {
				sendChatMessage(chatInput.value, pageContent);
			}
		}
	});
}

async function fetchAnalysis() {
	// INSTANT: Show loading state (SYNCHRONOUS)
	showLoadingState();

	// Get current tab (quick callback, don't block)
	chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
		if (!tabs || tabs.length === 0) return;

		const tabUrl = tabs[0].url;
		const tabId = tabs[0].id;

		// Tab changed?
		if (tabUrl !== currentTabUrl) {
			currentTabUrl = tabUrl;
			currentContent = null;
			analysisInProgress = false;
			// Clear old chat for new tab
			const chatMessages = document.getElementById('chat-messages');
			if (chatMessages) chatMessages.innerHTML = '<div class="chat-message system"><div class="chat-bubble">💬 Ask questions about this page...</div></div>';
		}

		// Check storage (PERSISTENT CACHE)
		const storageKey = "atlas_cache_" + tabUrl;

		chrome.storage.local.get([storageKey], async (result) => {
			if (result[storageKey]) {
				console.log("[Atlas AI] Using persistent cache for", tabUrl);
				// Display cached data
				const cached = result[storageKey];

				// 1. Show cached results
				displayAnalysis(cached, null);

				// 2. Load progress (REMOVED)
				// const progress = await initializeLearningProgress();
				// renderLearningGraph(progress);


				// 3. Init chat
				initializeChatListeners(currentContent);
				// DEFER: Load chat history after UI renders
				requestAnimationFrame(() => {
					renderChatMessages().catch(e => console.error(e));
				});

				// RESOURCE SAVING: Do NOT refresh in background if we have a cache.
				// Only fetch if explicitly requested or cache is missing.
				return;
			}

			// No cache - fetch fresh data
			if (!analysisInProgress) {
				analysisInProgress = true;
				await fetchAndDisplay(tabUrl, tabId);
			}
		});
	});
}

let rateLimitUntil = 0;
function isRateLimited() {
	return Date.now() < rateLimitUntil;
}

function setRateLimited(seconds) {
	rateLimitUntil = Date.now() + (seconds * 1000);
	console.log(`[Atlas AI] Rate limited for ${seconds} seconds`);
}

/**
 * Extract PDF Content Directly (Bypasses content script limitations)
 */
async function extractPdfDirectly(url) {
	try {
		console.log("[Atlas AI] Sidebar fetching PDF blob...");

		const response = await fetch(url);
		if (!response.ok) {
			if (url.startsWith("file://")) {
				throw new Error("Cannot access local file. Ensure 'Allow access to file URLs' is enabled in Extension Settings.");
			}
			throw new Error(`Failed to fetch PDF: ${response.status}`);
		}

		const blob = await response.blob();
		const formData = new FormData();

		// Determine a filename
		let filename = "document.pdf";
		try {
			const urlObj = new URL(url);
			filename = urlObj.pathname.split('/').pop() || "document.pdf";
		} catch (e) { }

		formData.append("file", blob, filename);

		console.log("[Atlas AI] Sending PDF to backend from sidebar...");
		const bgResponse = await fetch("http://localhost:8000/analyze-pdf", {
			method: "POST",
			body: formData
		});

		if (!bgResponse.ok) {
			throw new Error(`PDF extraction failed: ${bgResponse.status}`);
		}

		const result = await bgResponse.json();
		return {
			title: filename,
			url: url,
			text: result.text,
			type: "pdf"
		};

	} catch (e) {
		console.error("[Atlas AI] Sidebar PDF extraction error:", e);
		throw e;
	}
}

async function fetchAndDisplay(tabUrl, tabId) {
	try {
		// Get page content
		let content;

		// PDF DETECTION (Direct fetching from sidebar)
		if (tabUrl.toLowerCase().endsWith(".pdf") || tabUrl.toLowerCase().includes(".pdf?")) {
			console.log("[Atlas AI] PDF detected via URL. Extracting directly from sidebar...");
			content = await extractPdfDirectly(tabUrl);
		} else {
			// Regular page content extraction
			try {
				content = await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => reject(new Error("Content timeout")), 5000);
					chrome.tabs.sendMessage(tabId, { type: "GET_CURRENT_CONTENT" }, (response) => {
						clearTimeout(timeout);
						if (chrome.runtime.lastError) {
							reject(new Error("Cannot access page via message"));
						} else {
							resolve(response);
						}
					});
				});
			} catch (msgError) {
				console.warn("[Atlas AI] Messaging failed, trying direct injection:", msgError);
				// Fallback: Execute script directly
				const results = await chrome.scripting.executeScript({
					target: { tabId: tabId },
					func: () => {
						return {
							title: document.title,
							text: document.body.innerText.slice(0, 8000),
							url: window.location.href
						};
					}
				});
				if (results && results[0] && results[0].result) {
					content = results[0].result;
				} else {
					throw new Error("Failed to extract content via injection");
				}
			}
		}

		if (!content || !content.text) {
			throw new Error("No content extracted from page");
		}

		currentContent = content;

		// Show fetching status
		const summaryEl = document.getElementById("summary");
		if (summaryEl) summaryEl.textContent = "🔄 Analyzing with AI...";

		// Fetch analysis from backend
		const response = await fetch("http://localhost:8000/analyze", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				page_title: content.title || "Page",
				page_text: content.text || "",
				level: document.getElementById("difficulty-level")?.value || "student"
			}),
			timeout: 30000
		});

		if (!response.ok) {
			const error = await response.text();
			console.error("[ATLAS] Backend error:", error);

			// Check for rate limiting
			if (error.includes("429") || error.includes("RESOURCE_EXHAUSTED") || error.includes("quota")) {
				setRateLimited(60); // Rate limited for 60 seconds
				throw new Error("⏳ API rate limit reached. Please wait a moment before analyzing another page.");
			}
			throw new Error(`Backend error: ${response.status}`);
		}

		const data = await response.json();

		if (!data.result) {
			throw new Error("No result from backend");
		}

		let parsed = parseAnalysisResponse(data);

		// CACHE IT (Persistent)
		const storageKey = "atlas_cache_" + tabUrl;
		chrome.storage.local.set({ [storageKey]: parsed });

		// DISPLAY
		displayAnalysis(parsed, null);

		// Load progress and update (REMOVED)
		// const progress = await initializeLearningProgress();
		// renderLearningGraph(progress);
		// updateXP(parsed.stage_xp, parsed.curriculum).then(p => renderLearningGraph(p)).catch(e => console.error(e));


		// Init chat listeners
		initializeChatListeners(currentContent);
		// DEFER: Load chat history after UI renders
		requestAnimationFrame(() => {
			renderChatMessages().catch(e => console.error(e));
		});

	} catch (e) {
		console.error("[Atlas AI] Fetch error:", e);
		const summaryEl = document.getElementById("summary");
		if (summaryEl) summaryEl.textContent = e.message || "❌ Error loading analysis";
		const nextStepEl = document.getElementById("next-step");
		if (nextStepEl) nextStepEl.textContent = "Check your connection and try again";
	} finally {
		analysisInProgress = false;
	}
}

async function refreshAnalysisInBackground(tabUrl, tabId) {
	try {
		// Get fresh content
		let content;
		try {
			content = await new Promise((resolve, reject) => {
				const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);
				chrome.tabs.sendMessage(tabId, { type: "GET_CURRENT_CONTENT" }, (response) => {
					clearTimeout(timeout);
					if (chrome.runtime.lastError) reject(new Error("No access"));
					else resolve(response);
				});
			});
		} catch (e) {
			// Fallback injection
			const results = await chrome.scripting.executeScript({
				target: { tabId: tabId },
				func: () => {
					return {
						title: document.title,
						text: document.body.innerText.slice(0, 8000)
					};
				}
			});
			if (results && results[0]) content = results[0].result;
		}

		currentContent = content;

		// Fetch fresh analysis
		const response = await fetch("http://localhost:8000/analyze", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				page_title: content.title,
				page_text: content.text
			})
		});

		if (!response.ok) throw new Error(`Error: ${response.status}`);
		const data = await response.json();
		let parsed = parseAnalysisResponse(data);

		// Update cache
		analysisCache[tabUrl] = parsed;

		// Update UI
		displayAnalysis(parsed, null);
		// const progress = await initializeLearningProgress();
		// renderLearningGraph(progress);
		// updateXP(parsed.stage_xp, parsed.curriculum).then(p => renderLearningGraph(p)).catch(e => console.error(e));


		initializeChatListeners(currentContent);
		// DEFER: Load chat history after UI renders
		requestAnimationFrame(() => {
			renderChatMessages().catch(e => console.error(e));
		});

	} catch (e) {
		console.error("[Atlas AI] Background refresh error:", e);
	} finally {
		analysisInProgress = false;
	}
}

function parseAnalysisResponse(data) {
	try {
		if (!data || !data.result) {
			console.error("[Atlas AI] Invalid data structure:", data);
			return { summary: "Invalid response format", key_concepts: [], next_step: "" };
		}

		let result = data.result.trim();

		// Remove markdown if present
		if (result.startsWith('```json')) {
			result = result.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
		} else if (result.startsWith('```')) {
			result = result.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
		}

		console.log("[Atlas AI] Parsing result:", result.substring(0, 200));
		const parsed = JSON.parse(result);

		// Validate structure
		if (!parsed.summary) parsed.summary = "Unable to summarize";
		if (!Array.isArray(parsed.key_concepts)) parsed.key_concepts = [];
		if (!parsed.next_step) parsed.next_step = "Continue learning";
		// Ensure mindmap and resources are present
		if (!parsed.mindmap) parsed.mindmap = { name: "Topic", children: [] };
		if (!parsed.resources) parsed.resources = [];

		return parsed;
	} catch (e) {
		console.error("[Atlas AI] Parse error:", e, "Raw data:", data);
		return {
			summary: "Analysis completed but format is unexpected",
			key_concepts: ["See browser console for raw response"],
			next_step: "Try refreshing the page"
		};
	}
}

function showLoadingState() {
	const summary = document.getElementById("summary");
	const concepts = document.getElementById("key-concepts");
	const nextStep = document.getElementById("next-step");

	if (summary) summary.innerHTML = '<span style="opacity: 0.6;">⏳ Loading...</span>';
	if (concepts) concepts.innerHTML = '<li style="opacity: 0.6;">Analyzing page...</li>';
	if (nextStep) nextStep.innerHTML = '<span style="opacity: 0.6;">⏳ Loading...</span>';
}

function displayAnalysis(analysisData, progress) {
	const summaryEl = document.getElementById("summary");
	const nextStepEl = document.getElementById("next-step");
	const keyConceptsEl = document.getElementById("key-concepts");

	if (summaryEl) summaryEl.textContent = analysisData.summary || "No summary.";

	if (keyConceptsEl) {
		keyConceptsEl.innerHTML = "";
		if (Array.isArray(analysisData.key_concepts) && analysisData.key_concepts.length > 0) {
			analysisData.key_concepts.forEach(concept => {
				const li = document.createElement("li");
				li.textContent = concept;
				keyConceptsEl.appendChild(li);
			});
		} else {
			const li = document.createElement("li");
			li.textContent = "No key concepts found.";
			keyConceptsEl.appendChild(li);
		}
	}

	if (nextStepEl) nextStepEl.textContent = analysisData.next_step && analysisData.next_step !== "No suggestion." ? analysisData.next_step : "No next step found.";

	// Update graph if progress available (REMOVED)
	// if (progress) renderLearningGraph(progress);


	// Updated: Render Logic Flow
	const flowSection = document.getElementById('logic-flow-section');
	const flowContainer = document.getElementById('logic-flow-container');
	if (analysisData.flowchart && flowSection && flowContainer) {
		flowSection.classList.remove('hidden');
		renderFlowchart(analysisData.flowchart, flowContainer);
	} else if (flowSection) {
		flowSection.classList.add('hidden');
	}

	// Updated: Render Playground
	const playSection = document.getElementById('playground-section');
	const editor = document.getElementById('python-editor');
	if (analysisData.python_code && playSection && editor) {
		playSection.classList.remove('hidden');
		// Unescape \\n sequences that the AI may return as literal text
		editor.value = analysisData.python_code.replace(/\\n/g, '\n');
	} else if (playSection) {
		playSection.classList.add('hidden');
	}

	// Updated: Render Mindmap - DEFER to avoid blocking UI
	if (analysisData.mindmap) {
		requestAnimationFrame(() => {
			renderMindmap(analysisData.mindmap);
		});
	}

	// Updated: Render Resources
	if (analysisData.resources) {
		renderResources(analysisData.resources);
	}

	// Ensure Logic Flow section is visible if data exists, but content remains collapsed by default
	if (analysisData.flowchart && flowSection) {
		const flowContent = document.getElementById('logic-flow-content');
		if (flowContent) {
			flowContent.classList.add('collapsed');
			flowContent.classList.remove('expanded');
		}
	}
}

/**
 * Render Mindmap using SVG
 */
/**
 * Render Mindmap using Force-Directed Graph (Physics)
 */
let simulation = null; // Store simulation instance

function renderMindmap(mindmapData) {
	const svg = document.getElementById('mindmap-svg');
	if (!svg) return;

	svg.innerHTML = '';

	// STOP previous simulation if any
	if (simulation) {
		simulation.stop();
	}

	// Dynamic height based on node count (approximate)
	// But since we have fixed CSS height, we'll just use that.
	const width = svg.clientWidth || 400;
	const height = svg.clientHeight || 400;

	// 1. Flatten Data (Recursive)
	const nodes = [];
	const links = [];

	function processNode(node, parent, level) {
		const flatNode = {
			id: `n_${nodes.length}`,
			name: node.isRoot && node.name.length > 30 ? node.name.substring(0, 27) + "..." : node.name,
			// Initial Placement: Star Burst
			x: parent ? parent.x + (Math.random() - 0.5) * 50 : width / 2,
			y: parent ? parent.y + (Math.random() - 0.5) * 50 : height / 2,
			level: level,
			isRoot: level === 0,
			mass: level === 0 ? 10 : 2 // Root is heavier
		};
		nodes.push(flatNode);

		if (parent) {
			links.push({ source: parent, target: flatNode });
		}

		if (node.children && node.children.length > 0) {
			node.children.forEach(child => processNode(child, flatNode, level + 1));
		}
	}

	processNode(mindmapData, null, 0);

	// 2. Setup rendering elements
	const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	svg.appendChild(linkGroup);
	const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	svg.appendChild(nodeGroup);

	// Create visual elements
	links.forEach(link => {
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		line.setAttribute('stroke', 'rgba(139, 92, 246, 0.2)');
		line.setAttribute('stroke-width', '1.5');
		line.setAttribute('fill', 'none');
		link.el = line;
		linkGroup.appendChild(line);
	});

	nodes.forEach(node => {
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.style.cursor = 'grab';

		// Pro-Consumer Colors
		const color = node.isRoot ? '#8B5CF6' : 'rgba(139, 92, 246, 0.1)';
		const textColor = node.isRoot ? '#FFFFFF' : '#D1D5DB';
		const strokeColor = node.isRoot ? '#7C3AED' : 'rgba(139, 92, 246, 0.3)';

		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('fill', textColor);
		text.setAttribute('font-size', '11px');
		text.setAttribute('font-family', 'Inter, sans-serif');
		text.setAttribute('dy', '0.35em');
		text.setAttribute('pointer-events', 'none');

		// Text Wrapping (Simple)
		const words = node.name.split(' ');
		if (words.length > 3 && !node.isRoot) {
			text.textContent = words.slice(0, 3).join(' ') + '...';
		} else {
			text.textContent = node.name;
		}

		// Measure text
		const fontSize = 11;
		const charWidth = fontSize * 0.6;
		const textWidth = Math.max(80, text.textContent.length * charWidth + 32);

		node.width = textWidth;
		node.height = 32;

		node.radius = Math.max(node.width, node.height) / 2;

		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('rx', '16'); // Fully rounded pill
		rect.setAttribute('ry', '16');
		rect.setAttribute('fill', color);
		rect.setAttribute('stroke', strokeColor);
		rect.setAttribute('stroke-width', '1');
		rect.setAttribute('width', node.width);
		rect.setAttribute('height', node.height);
		rect.style.transition = 'all 0.2s ease';

		g.appendChild(rect);
		g.appendChild(text);

		node.el = g;
		node.rect = rect;
		node.text = text;
		nodeGroup.appendChild(g);

		// Interactivity
		g.addEventListener('mousedown', (e) => onDragStart(e, node, svg));
		g.addEventListener('mouseenter', () => {
			rect.setAttribute('stroke-width', '2');
			rect.setAttribute('fill', node.isRoot ? '#7C3AED' : 'rgba(139, 92, 246, 0.2)');
		});
		g.addEventListener('mouseleave', () => {
			rect.setAttribute('stroke-width', '1');
			rect.setAttribute('fill', color);
		});
	});

	// 3. Start Simulation
	simulation = new SimpleForceSimulation(nodes, links, width, height);
	simulation.start();
}

/**
 * Improved Physics Engine with Collision Detection
 */
class SimpleForceSimulation {
	constructor(nodes, links, width, height) {
		this.nodes = nodes;
		this.links = links;
		this.width = width;
		this.height = height;
		this.running = false;
		this.animationId = null;

		// Initialize velocities
		this.nodes.forEach(n => { n.vx = 0; n.vy = 0; });
	}

	start() {
		this.running = true;
		const tick = () => {
			if (!this.running) return;
			this.update();
			this.draw();
			this.animationId = requestAnimationFrame(tick);
		};
		tick();
	}

	stop() {
		this.running = false;
		if (this.animationId) cancelAnimationFrame(this.animationId);
	}

	update() {
		const k = 0.05; // Spring constant (weaker spring for more spread)
		const repulsion = 5000; // Stronger Repulsion
		const centerForce = 0.02; // Weak center pull
		const damping = 0.75;

		// 1. Repulsion (Nodes push apart)
		for (let i = 0; i < this.nodes.length; i++) {
			for (let j = i + 1; j < this.nodes.length; j++) {
				const a = this.nodes[i];
				const b = this.nodes[j];
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				let distSq = dx * dx + dy * dy;
				if (distSq === 0) { dx = 0.1; dy = 0.1; distSq = 0.02; }

				const dist = Math.sqrt(distSq);

				// Repulsion force
				const force = repulsion / (distSq + 100);

				const fx = (dx / dist) * force;
				const fy = (dy / dist) * force;

				if (!a.isDragging && !a.isRoot) { a.vx -= fx; a.vy -= fy; }
				if (!b.isDragging && !b.isRoot) { b.vx += fx; b.vy += fy; }

				// COLLISION DETECTION (Bounding Box / Radius Approximation)
				// We treat nodes as circles for simple physics collision
				const minDist = (a.width + b.width) / 2 * 0.8; // 0.8 factor to allow slight overlap for pill shapes
				if (dist < minDist) {
					// Push apart efficiently
					const overlap = minDist - dist;
					const pushX = (dx / dist) * overlap * 0.1;
					const pushY = (dy / dist) * overlap * 0.1;

					if (!a.isDragging) { a.vx -= pushX; a.vy -= pushY; }
					if (!b.isDragging) { b.vx += pushX; b.vy += pushY; }
				}
			}
		}

		// 2. Spring Force (Hooke's Law)
		this.links.forEach(link => {
			const a = link.source;
			const b = link.target;
			// Dynamic target length based on node sizes
			const targetLength = (a.width + b.width) / 1.5 + 40;

			let dx = b.x - a.x;
			let dy = b.y - a.y;
			const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;

			const displacement = dist - targetLength;
			const force = displacement * k;

			const fx = (dx / dist) * force;
			const fy = (dy / dist) * force;

			if (!a.isDragging) { a.vx += fx; a.vy += fy; }
			if (!b.isDragging) { b.vx -= fx; b.vy -= fy; }
		});

		// 3. Center Gravity & Update
		this.nodes.forEach(node => {
			if (node.isDragging) return;

			// Pull to center
			if (!node.isRoot) {
				node.vx += (this.width / 2 - node.x) * centerForce;
				node.vy += (this.height / 2 - node.y) * centerForce;
			} else {
				// Root stays center strongly
				node.x += (this.width / 2 - node.x) * 0.1;
				node.y += (this.height / 2 - node.y) * 0.1;
			}

			// Apply Damping
			node.vx *= damping;
			node.vy *= damping;

			// Update Position
			node.x += node.vx;
			node.y += node.vy;

			// Keep in bounds
			const marginX = node.width / 2;
			const marginY = node.height / 2;
			node.x = Math.max(marginX, Math.min(this.width - marginX, node.x));
			node.y = Math.max(marginY, Math.min(this.height - marginY, node.y));
		});
	}

	draw() {
		this.links.forEach(link => {
			const s = link.source;
			const t = link.target;
			// Smooth Bezier Curve Connectors
			const dx = t.x - s.x;
			const dy = t.y - s.y;
			const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
			link.el.setAttribute('d', `M${s.x},${s.y}A${dr},${dr} 0 0,1 ${t.x},${t.y}`);
		});

		this.nodes.forEach(node => {
			// Update Rect (Pill) - Center on coordinate
			if (node.rect) {
				node.rect.setAttribute('x', node.x - node.width / 2);
				node.rect.setAttribute('y', node.y - node.height / 2);
			}

			// Update Text - Center
			if (node.text) {
				node.text.setAttribute('x', node.x);
				node.text.setAttribute('y', node.y + 1); // Slight adjustment
			}
		});
	}
}

// Drag State
let dragNode = null;

function onDragStart(e, node, svg) {
	dragNode = node;
	node.isDragging = true;
	node.el.style.cursor = 'grabbing';

	node.vx = 0;
	node.vy = 0;

	const onDrag = (e) => {
		const rect = svg.getBoundingClientRect();
		// Convert mouse pos to SVG pos
		node.x = e.clientX - rect.left;
		node.y = e.clientY - rect.top;

		// Keep in bounds
		node.x = Math.max(node.width / 2, Math.min(svg.clientWidth - node.width / 2, node.x));
		node.y = Math.max(node.height / 2, Math.min(svg.clientHeight - node.height / 2, node.y));

		// Wake up simulation
		if (!simulation.running) simulation.start();
	};

	const onDragEnd = () => {
		node.isDragging = false;
		window.removeEventListener('mousemove', onDrag);
		window.removeEventListener('mouseup', onDragEnd);
	};

	window.addEventListener('mousemove', onDrag);
	window.addEventListener('mouseup', onDragEnd);
}

/**
 * Render Resources List
 */
function renderResources(resources) {
	const list = document.getElementById('resources-list');
	if (!list) return;

	list.innerHTML = '';

	if (!resources || resources.length === 0) {
		const li = document.createElement('li');
		li.textContent = "No resources found.";
		li.style.color = "#718096";
		list.appendChild(li);
		return;
	}

	resources.forEach(res => {
		const link = document.createElement('a');
		link.href = res.url;
		link.target = "_blank";
		link.className = "resource-item";

		let iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
		if (res.type === 'Video') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
		if (res.type === 'Course') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>';

		const iconSpan = document.createElement('span');
		iconSpan.className = "resource-icon";
		iconSpan.innerHTML = iconSvg;

		const titleSpan = document.createElement('span');
		titleSpan.className = "resource-title";
		titleSpan.textContent = res.title;

		link.appendChild(iconSpan);
		link.appendChild(titleSpan);
		list.appendChild(link);
	});
}

/**
 * Launch Quiz
 */
async function launchQuiz(progress) {
	const modal = document.getElementById('quiz-modal');
	const qQuestion = document.getElementById('quiz-question');
	const qOptions = document.getElementById('quiz-options');

	if (!modal) return;

	modal.classList.remove('hidden');
	qQuestion.textContent = "Generating a unique challenge for you...";
	qOptions.innerHTML = '';

	try {
		// Fetch Quiz
		const response = await fetch("http://localhost:8000/generate-quiz", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				page_title: "Quiz: " + progress.currentTopic,
				page_text: currentContent?.text || "",
				current_stage: progress.currentTopic
			})
		});

		const data = await response.json();
		const quizData = JSON.parse(data.result);

		if (!Array.isArray(quizData) || quizData.length === 0) throw new Error("Invalid quiz data");

		// Render First Question (Simplified for MVP: Just 1 question or sequence)
		// Let's do a sequence of 3.
		let currentQIndex = 0;
		let score = 0;

		const renderQuestion = (index) => {
			if (index >= quizData.length) {
				// Finish
				if (score === quizData.length) {
					qQuestion.textContent = "🎉 Perfect Score! Leveling Up...";
					qOptions.innerHTML = '';
					setTimeout(() => {
						completeLevelUp(progress);
						modal.classList.add('hidden');
					}, 2000);
				} else {
					qQuestion.textContent = `Score: ${score}/${quizData.length}. Keep reviewing to master this stage!`;
					qOptions.innerHTML = '<button onclick="document.getElementById(\'quiz-modal\').classList.add(\'hidden\')" class="quiz-option" style="text-align:center">Try Later</button>';
				}
				return;
			}

			const q = quizData[index];
			qQuestion.textContent = `${index + 1}. ${q.question}`;
			qOptions.innerHTML = '';

			q.options.forEach((opt, optIndex) => {
				const btn = document.createElement('button');
				btn.className = 'quiz-option';
				btn.textContent = opt;
				btn.onclick = () => {
					// Check answer
					const allOpts = document.querySelectorAll('.quiz-option');
					allOpts.forEach(b => b.disabled = true);

					if (optIndex === q.correct_index) {
						btn.classList.add('correct');
						score++;
					} else {
						btn.classList.add('wrong');
						allOpts[q.correct_index].classList.add('correct');
					}

					setTimeout(() => {
						renderQuestion(index + 1);
					}, 1500);
				};
				qOptions.appendChild(btn);
			});
		};

		renderQuestion(0);

	} catch (e) {
		console.error("Quiz Error", e);
		qQuestion.textContent = "Error generating quiz. Please try again.";
		setTimeout(() => modal.classList.add('hidden'), 2000);
	}
}

/**
 * Sanitize Mermaid Syntax
 */
function sanitizeMermaid(def) {
	if (!def) return '';
	let sanitized = def.replace(/\\n/g, '\n');

	// Fix common AI syntax errors for Kroki/Mermaid
	// 1. Ensure node labels with special characters are quoted
	// Matches: A[Some (Text) Here] -> A["Some (Text) Here"]
	sanitized = sanitized.replace(/([A-Za-z0-9_-]+)\[([^"\]]+)\]/g, (match, id, label) => {
		if (label.includes('(') || label.includes(')') || label.includes('[') || label.includes(']') || label.includes(',') || label.includes('.')) {
			return `${id}["${label}"]`;
		}
		return match;
	});

	// 2. Remove any markdown code blocks if the AI ignored the prompt
	sanitized = sanitized.replace(/```mermaid/g, '').replace(/```/g, '');

	return sanitized.trim();
}

/**
 * Render Flowchart with Retry and Fallback
 */
function renderFlowchart(graphDef, container, retryCount = 0) {
	if (!graphDef || !container) return;

	container.innerHTML = '<p style="opacity:0.6">Loading flowchart...</p>';
	const sanitized = sanitizeMermaid(graphDef);

	fetch('https://kroki.io/mermaid/svg', {
		method: 'POST',
		headers: { 'Content-Type': 'text/plain' },
		body: sanitized
	})
		.then(res => {
			if (!res.ok) throw new Error('Kroki error: ' + res.status);
			return res.text();
		})
		.then(svg => {
			container.innerHTML = svg;
		})
		.catch(err => {
			console.error(`[Atlas AI] Flowchart attempt ${retryCount + 1} failed:`, err);
			if (retryCount < 1) {
				// Retry once after 200ms
				setTimeout(() => renderFlowchart(graphDef, container, retryCount + 1), 200);
			} else {
				renderFlowchartFallback(sanitized, container);
			}
		});
}

/**
 * Fallback UI for Flowchart (Step-by-Step list)
 */
function renderFlowchartFallback(def, container) {
	console.log("[Atlas AI] Rendering flowchart fallback list");
	// Simple parser for "A --> B" patterns
	const steps = [];
	const lines = def.split('\n');

	lines.forEach(line => {
		// Extract labels from A[Label] or A["Label"]
		const match = line.match(/\["?(.*?)"?\]/);
		if (match && match[1]) {
			if (!steps.includes(match[1])) steps.push(match[1]);
		}
	});

	if (steps.length > 0) {
		container.innerHTML = `
			<div style="padding: 1rem; border-left: 2px solid var(--primary); background: rgba(139, 92, 246, 0.05);">
				<p style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Simplified Process Flow</p>
				<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
					${steps.map((step, i) => `
						<li style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-main);">
							<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0;">${i + 1}</span>
							${step}
						</li>
					`).join('')}
				</ul>
			</div>
		`;
	} else {
		container.innerHTML = '<p style="color:#f56565; padding: 1rem; font-size: 13px;">Logic Flow unavailable for this content.</p>';
	}
}

function completeLevelUp(progress) {
	const currentIndex = progress.curriculum.indexOf(progress.currentTopic);
	if (currentIndex < progress.curriculum.length - 1) {
		const nextTopic = progress.curriculum[currentIndex + 1];

		// Update storage
		chrome.storage.local.get(["atlas_learning_progress"], (result) => {
			const p = result.atlas_learning_progress;
			if (!p.completedTopics.includes(p.currentTopic)) {
				p.completedTopics.push(p.currentTopic);
			}
			p.currentTopic = nextTopic;
			p.currentXP = 0; // Reset XP
			p.level = (p.level || 1) + 1;

			chrome.storage.local.set({ "atlas_learning_progress": p }, () => {
				// Refresh UI
				renderLearningGraph(p);
				// Confetti or visual effect here
			});
		});
	}
}

/**
 * Cleanup Python Code (Fix common quoting issues)
 */
function cleanupPythonCode(code) {
	if (!code) return '';
	let clean = code;

	const lines = clean.split('\n');
	const fixedLines = lines.map(line => {
		const fDoubleMatch = (line.match(/f"/g) || []).length;
		if (fDoubleMatch > 0) {
			const dQuoteCount = (line.match(/"/g) || []).length;
			if ((dQuoteCount - fDoubleMatch) % 2 !== 0) {
				return line + '"';
			}
		}
		const fSingleMatch = (line.match(/f'/g) || []).length;
		if (fSingleMatch > 0) {
			const sQuoteCount = (line.match(/'/g) || []).length;
			if ((sQuoteCount - fSingleMatch) % 2 !== 0) {
				return line + "'";
			}
		}
		return line;
	});

	return fixedLines.join('\n');
}

/**
 * Safe Clean Python Code (Aggressive fix for SyntaxErrors in PDF data)
 */
function safeCleanPythonCode(code) {
	if (!code) return '';
	let clean = code;

	// 1. Strip trailing backslashes before quotes to prevent escaping the closer
	// Matches: text = """...\" or text = rf"""...\"
	// We replace \ before """ with \\
	clean = clean.replace(/\\+(\"\"\"|\'\'\')/g, (match, quotes) => {
		const slashes = match.slice(0, -3);
		if (slashes.length % 2 !== 0) {
			return slashes + '\\' + quotes;
		}
		return match;
	});

	// 2. Aggressive char removal if the above fails (handled by the caller's retry logic if needed)
	// For the initial "Safe Clean", we'll just focus on the backslash issue and quoting balance

	const tripleQuoteCount = (clean.match(/(\"\"\"|\'\'\')/g) || []).length;
	if (tripleQuoteCount % 2 !== 0) {
		clean += '\n"""';
	}

	return clean;
}

/**
 * Balance Brackets & Parentheses
 */
function balanceBrackets(code) {
	if (!code) return '';
	let clean = code;
	const pairs = { '(': ')', '[': ']', '{': '}' };
	const stack = [];

	for (let char of clean) {
		if (pairs[char]) {
			stack.push(char);
		} else if (Object.values(pairs).includes(char)) {
			const last = stack[stack.length - 1];
			if (pairs[last] === char) {
				stack.pop();
			}
		}
	}

	// Close unclosed brackets in reverse order
	while (stack.length > 0) {
		const open = stack.pop();
		clean += pairs[open];
	}

	return clean;
}

/**
 * Safe Correct Python Code (Stripping last line on SyntaxError)
 */
function safeCorrectPythonCode(code) {
	if (!code) return '';
	const lines = code.trimEnd().split('\n');
	if (lines.length <= 1) return code;

	console.log("[Atlas AI] Safe Correction: Stripping last potentially incomplete line");
	// Remove the last line (likely incomplete math or call)
	const stripped = lines.slice(0, -1).join('\n');

	// Ensure we close any leftover triple quotes or brackets
	return balanceBrackets(safeCleanPythonCode(stripped));
}

/**
 * Initialize Difficulty Toggle
 */
function initializeDifficultyToggle() {
	const levelSelect = document.getElementById("difficulty-level");
	if (!levelSelect) return;

	levelSelect.addEventListener("change", () => {
		const newLevel = levelSelect.value;
		console.log(`[Atlas AI] Difficulty changed to: ${newLevel}`);

		// Clear cache for current URL to force re-fetch
		if (currentTabUrl) {
			const storageKey = "atlas_cache_" + currentTabUrl;
			chrome.storage.local.remove([storageKey], () => {
				console.log("[Atlas AI] Cache cleared for level change");
				// Force fresh analysis
				analysisInProgress = false; // Reset lock
				fetchAnalysis();
			});
		}
	});
}


window.addEventListener("DOMContentLoaded", () => {
	// INSTANT: Show default UI immediately
	const summary = document.getElementById("summary");
	const concepts = document.getElementById("key-concepts");
	const nextStep = document.getElementById("next-step");
	const graph = document.getElementById("learning-graph");

	if (summary) summary.textContent = "💬 Ready!";
	if (concepts) concepts.innerHTML = '<li style="opacity:0.6">Loading page analysis...</li>';
	if (nextStep) nextStep.textContent = "📚 Open a coding page to get started";
	// DEFER: Don't render learning graph on init - too heavy. Only render when user clicks the graph tab.
	if (graph) graph.innerHTML = '<p style="opacity:0.6; text-align:center; padding:20px;">Click tab to load learning progress...</p>';

	// Chat ready immediately
	const chatMessages = document.getElementById('chat-messages');
	if (chatMessages) chatMessages.innerHTML = '<div class="chat-message system"><div class="chat-bubble">💬 Ask questions...</div></div>';

	// Playground Run Button
	const runBtn = document.getElementById('run-code-btn');
	if (runBtn) {
		runBtn.addEventListener('click', async () => {
			const editor = document.getElementById('python-editor');
			const output = document.getElementById('code-output');
			if (!editor || !output) return;

			output.textContent = "Running...";
			output.classList.remove('hidden');

			let codeToRun = editor.value;

			try {
				let response = await fetch("http://localhost:8000/run", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ code: codeToRun })
				});
				let data = await response.json();

				// AUTOMATIC CODE CLEANUP on SyntaxError
				if (data.error && (data.error.includes("SyntaxError") || data.error.includes("unterminated") || data.error.includes("EOF") || data.error.includes("never closed"))) {
					console.log("[Atlas AI] Syntax error detected, attempting safe-cleanup...");

					let cleanedCode = cleanupPythonCode(codeToRun);

					if (cleanedCode === codeToRun || data.error.includes("unterminated")) {
						cleanedCode = safeCleanPythonCode(codeToRun);
					}

					// BRACKET BALANCING PASS
					cleanedCode = balanceBrackets(cleanedCode);

					// AGGRESSIVE FALLBACK (Self-Correction) if standard fix fails to change code
					if (cleanedCode === codeToRun && data.error.includes("never closed")) {
						cleanedCode = safeCorrectPythonCode(codeToRun);
					}

					if (cleanedCode !== codeToRun) {
						codeToRun = cleanedCode;
						editor.value = codeToRun;

						response = await fetch("http://localhost:8000/run", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ code: codeToRun })
						});
						data = await response.json();
					}
				}

				output.textContent = data.result || data.error || "No output";
			} catch (e) {
				output.textContent = "Error: " + e.message;
			}
		});
	}

	// Copy Playground Logic
	const copyBtn = document.getElementById('copy-playground-btn');
	if (copyBtn) {
		copyBtn.addEventListener('click', () => {
			const editor = document.getElementById('python-editor');
			if (editor) {
				navigator.clipboard.writeText(editor.value).then(() => {
					copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
					setTimeout(() => {
						copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
					}, 2000);
				});
			}
		});
	}

	// Logic Flow Toggle
	const toggleFlowBtn = document.getElementById('toggle-flow-btn');
	const flowContent = document.getElementById('logic-flow-content');
	if (toggleFlowBtn && flowContent) {
		toggleFlowBtn.addEventListener('click', () => {
			const isCollapsed = flowContent.classList.toggle('collapsed');
			flowContent.classList.toggle('expanded', !isCollapsed);
			toggleFlowBtn.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
		});
	}

	const viewFullBtn = document.getElementById('view-full-diagram');
	if (viewFullBtn) {
		viewFullBtn.addEventListener('click', () => {
			// Open the SVG in a new tab for "Full View"
			const svg = document.querySelector('#logic-flow-container svg');
			if (svg) {
				const svgData = new XMLSerializer().serializeToString(svg);
				const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
				const url = URL.createObjectURL(svgBlob);
				window.open(url, '_blank');
			}
		});
	}


	// GitHub Repo Search Button (NEW)
	const ghSearchBtn = document.getElementById('github-search-btn');
	if (ghSearchBtn) {
		ghSearchBtn.addEventListener('click', async () => {
			const input = document.getElementById('github-search-input');
			const resultsContainer = document.getElementById('github-results');
			if (!input || !resultsContainer) return;

			const query = input.value.trim();
			if (!query) return;

			resultsContainer.innerHTML = '<div class="result-item">Searching GitHub repositories...</div>';
			resultsContainer.classList.remove('hidden');

			try {
				const response = await fetch("http://localhost:8000/search-github", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query: query })
				});
				const data = await response.json();

				resultsContainer.innerHTML = '';

				if (data.results && data.results.length > 0) {
					data.results.forEach(repo => {
						// Only render if the URL is a real GitHub repo link
						if (repo.url && repo.url.startsWith('https://github.com/')) {
							const div = document.createElement('div');
							div.className = 'result-item';
							div.innerHTML = `
								<div class="result-header">
									<a href="${repo.url}" target="_blank" style="font-weight:bold; color:#2b6cb0; text-decoration:underline;">${repo.name}</a>
								</div>
								<div class="result-snippet">${repo.description ? repo.description : ''}</div>
							`;
							resultsContainer.appendChild(div);
						}
					});
					// Force all GitHub links to open in a new tab (not in the sidebar)
					resultsContainer.querySelectorAll('a[target="_blank"]').forEach(link => {
						link.addEventListener('click', function (e) {
							e.preventDefault();
							window.open(this.href, '_blank');
						});
					});
					// If no valid GitHub links were rendered
					if (!resultsContainer.hasChildNodes()) {
						resultsContainer.innerHTML = '<div class="result-item">No valid GitHub repositories found.</div>';
					}
				} else {
					resultsContainer.innerHTML = '<div class="result-item">No GitHub repositories found.</div>';
				}

			} catch (e) {
				resultsContainer.innerHTML = '<div class="result-item">Error searching GitHub. Please try again.</div>';
			}
		});
	}

	// Initialize difficulty toggle (lightweight, doesn't block)
	initializeDifficultyToggle();

	// DEFER: Use requestAnimationFrame to defer analysis to next frame
	// This makes sidebar UI appear instantly instead of waiting for backend
	requestAnimationFrame(() => {
		fetchAnalysis();
	});
});

// Fast tab switching
chrome.tabs.onActivated.addListener(() => {
	// Quick show of loading state
	const summary = document.getElementById("summary");
	if (summary) summary.textContent = "⏳ Loading...";
	fetchAnalysis();
});

