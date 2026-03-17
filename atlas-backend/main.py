from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.genai as genai
import json
from config import GEMINI_API_KEY
from prompt import SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, build_prompt, build_chat_prompt
import uvicorn
import fitz
import requests

# Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

# Add CORS middleware to allow requests from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Chrome extension)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Atlas AI"}

class AnalyzeRequest(BaseModel):
    page_title: str
    page_text: str
    level: str = "student"



class ChatRequest(BaseModel):
    page_title: str
    page_text: str
    chat_query: str


class StruggleAnalysisRequest(BaseModel):
    """Request model for struggle detection analysis"""
    trigger: str  # "rage_click", "erratic_scroll", "tab_thrash", "error_hover"
    page_title: str
    page_text: str
    image: str = None  # Base64 encoded screenshot (optional)
    timestamp: int = None


# --- GitHub Repo Search Endpoint ---
class GithubSearchRequest(BaseModel):
    query: str

@app.post("/search-github")
async def search_github(request: GithubSearchRequest):
    url = "https://api.github.com/search/repositories"
    params = {"q": request.query, "sort": "stars", "order": "desc", "per_page": 3}
    headers = {"Accept": "application/vnd.github.v3+json"}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        results = []
        for item in data.get("items", []):
            results.append({
                "name": item.get("full_name"),
                "description": item.get("description"),
                "url": item.get("html_url")
            })
        return {"results": results}
    except Exception as e:
        print(f"[ATLAS] GitHub search error: {e}")
        return {"error": str(e)}


@app.post("/analyze")
async def analyze_page(request: AnalyzeRequest):
    try:
        print(f"[ATLAS] Analyzing: {request.page_title} (Level: {request.level})")
        
        prompt = build_prompt(request.page_title, request.page_text, request.level)
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite", 
            contents=[SYSTEM_PROMPT, prompt]
        )
        print(f"[ATLAS] Response received. Length: {len(response.text)}")
        result_text = response.text.strip()
        
        # Clean up potential markdown formatting from AI response
        if result_text.startswith('```json'):
            result_text = result_text.split('```json')[1].split('```')[0].strip()
        elif result_text.startswith('```'):
            result_text = result_text.split('```')[1].strip()
            
        # Parse and validate JSON
        try:
            parsed = json.loads(result_text)
        except json.JSONDecodeError:
            print(f"[ATLAS] Failed to parse JSON. Raw text: {result_text}")
            parsed = {
                "summary": "The assistant had trouble formatting the analysis for this page.",
                "key_concepts": ["Content Processing"],
                "next_step": "Try refreshing the page or asking a specific question in chat."
            }
        
        # Ensure schema compliance for the frontend
        final_data = {
            "summary": parsed.get("summary", "No summary available"),
            "key_concepts": parsed.get("key_concepts", ["Topic Analysis"]),
            "next_step": parsed.get("next_step", "Continue exploring this topic"),
            "mindmap": parsed.get("mindmap", {"name": "Topic", "children": []}),
            "resources": parsed.get("resources", []),
            "flowchart": parsed.get("flowchart", None)
        }
        
        # Ensure key_concepts is always a list
        if not isinstance(final_data["key_concepts"], list):
            final_data["key_concepts"] = [str(final_data["key_concepts"])]

        print(f"[ATLAS] Success: {request.page_title}")
        return {"result": json.dumps(final_data)}
        
    except Exception as e:
        error_msg = str(e)
        print(f"[ATLAS] ERROR: {type(e).__name__}: {error_msg}")
        
        # Handle rate limiting gracefully
        if any(code in error_msg for code in ["429", "RESOURCE_EXHAUSTED", "quota"]):
            return {"result": json.dumps({
                "summary": "API rate limit reached. Atlas is taking a short break.",
                "key_concepts": ["Rate Limiting"],
                "next_step": "Please wait a moment before analyzing another page."
            }), "rate_limited": True}
        
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File
import fitz  # PyMuPDF

@app.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    """Extract text and a high-quality title from an uploaded PDF file."""
    try:
        print(f"[ATLAS] Extracting PDF: {file.filename}")
        
        # Read file contents into memory
        pdf_bytes = await file.read()
        
        # Open PDF from memory bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # --- TITLE HEURISTIC HIERARCHY ---
        title = ""
        
        # 1. Try Metadata
        if doc.metadata and doc.metadata.get("title"):
            title = doc.metadata.get("title").strip()
        
        # 2. Heuristic: Largest font on first page
        if not title and len(doc) > 0:
            try:
                page = doc[0]
                blocks = page.get_text("dict")["blocks"]
                max_size = 0
                candidate = ""
                for b in blocks:
                    if "lines" in b:
                        for l in b["lines"]:
                            for s in l["spans"]:
                                if s["size"] > max_size:
                                    max_size = s["size"]
                                    candidate = s["text"].strip()
                if candidate and len(candidate) > 5: # Threshold to avoid random large numbers
                    title = candidate
            except Exception as e:
                print(f"[ATLAS] Heuristic Title Error: {e}")

        # 3. Fallback: Clean Filename
        if not title:
            import urllib.parse
            import re
            raw_name = urllib.parse.unquote(file.filename)
            # Remove long numeric strings (hashes/IDs) and .pdf extension
            clean_name = re.sub(r'\b\d{5,}\b', '', raw_name)
            clean_name = clean_name.replace('.pdf', '').replace('.PDF', '')
            # Clean up extra dashes/underscores
            clean_name = re.sub(r'[-_]{2,}', ' ', clean_name).replace('_', ' ').replace('-', ' ').strip()
            title = clean_name if clean_name else "PDF Document"

        text = ""
        # Limit extraction to first 20 pages to avoid overwhelming the AI
        max_pages = min(len(doc), 20)
        
        for page_num in range(max_pages):
            page = doc[page_num]
            page_text = page.get_text()
            text += f"[Page {page_num + 1}]\n{page_text}\n\n"
            
        doc.close()
        
        print(f"[ATLAS] Successfully extracted {len(text)} characters. Final Title: {title}")
        
        return {
            "title": title,
            "text": text[:25000], 
        }
        
    except Exception as e:
        print(f"[ATLAS] PDF Extraction Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract PDF text: {str(e)}")



@app.post("/chat")
async def chat_with_page(request: ChatRequest):
    try:
        print(f"[ATLAS] Chat query on: {request.page_title}")
        prompt = build_chat_prompt(request.page_title, request.page_text, request.chat_query)
        
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[CHAT_SYSTEM_PROMPT, prompt]
        )
        
        return {"result": response.text.strip()}
        
    except Exception as e:
        print(f"[ATLAS] Chat error: {e}")
        return {"result": "Sorry, I encountered an error while processing your question. Please try again."}


@app.post("/analyze-struggle")
async def analyze_struggle(request: StruggleAnalysisRequest):
    """Quick struggle analysis endpoint - returns immediately"""
    try:
        print(f"[ATLAS] Struggle: {request.trigger}")
        
        # Fast hardcoded hints
        hints = {
            "rage_click": "The element might be broken or unresponsive. Try refreshing.",
            "erratic_scroll": "Use search or navigation to find what you need.",
            "tab_thrash": "Keep documentation visible while coding.",
            "error_hover": "Read the error carefully - it tells you the fix."
        }
        
        hint = hints.get(request.trigger, "Try a different approach.")
        confidence = 0.8 if request.trigger in hints else 0.5
        
        return {
            "hint": hint,
            "confidence": confidence,
            "topic": "Troubleshooting",
            "trigger": request.trigger
        }
        
    except Exception as e:
        print(f"[ATLAS] Error: {e}")
        return {"hint": "You seem stuck. Try breaking this into smaller steps.", "confidence": 0.5}

# --- GitHub RAG Search ---
# Make chromadb optional due to pydantic v1 compatibility issues
collection = None
try:
    import chromadb
    from chromadb.utils import embedding_functions
    
    # Initialize Chroma Client (Persistent)
    try:
        chroma_client = chromadb.PersistentClient(path="./vector_db")
        # Use same embedding function as indexer
        ef = embedding_functions.DefaultEmbeddingFunction()
        collection = chroma_client.get_collection(name="code_snippets", embedding_function=ef)
        print("[ATLAS] Vector DB loaded.")
    except Exception as e:
        print(f"[ATLAS] Vector DB not found or error: {e}")
        collection = None
except Exception as e:
    # Catch ALL errors including ConfigError from pydantic v1 compatibility
    print(f"[ATLAS] Chromadb skipped (compatibility issue): {type(e).__name__}")
    collection = None

class SearchRequest(BaseModel):
    query: str

@app.post("/search-code")
async def search_code(request: SearchRequest):
    if not collection:
        return {"error": "Vector DB not initialized. Run indexer.py first."}
    
    try:
        results = collection.query(
            query_texts=[request.query],
            n_results=3
        )
        
        # Format results
        formatted = []
        if results['documents']:
            for i in range(len(results['documents'][0])):
                doc = results['documents'][0][i]
                meta = results['metadatas'][0][i]
                
                # Show local file path (no fake GitHub URL)
                file_info = f"{meta['file_path']} (L{meta['line_start']}-L{meta['line_end']})"
                
                formatted.append({
                    "name": meta['name'],
                    "type": meta['type'],
                    "snippet": doc, # The doc contains the full rich text
                    "file_info": file_info,
                    "url": None
                })
        
        return {"results": formatted}
    except Exception as e:
        print(f"[ATLAS] Search error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    print("[ATLAS] Starting Atlas AI Backend on [http://0.0.0.0:8001](http://0.0.0.0:8001)")
    uvicorn.run(app, host="0.0.0.0", port=8001)