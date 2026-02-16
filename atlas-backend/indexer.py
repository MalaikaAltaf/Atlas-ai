import os
import glob
import ast
import chromadb
from chromadb.utils import embedding_functions

# Configuration
REPO_PATH = "./test_repo"  # Path to the repo you want to index
DB_PATH = "./vector_db"
COLLECTION_NAME = "code_snippets"

def get_functions_from_file(file_path):
    """
    Parses a Python file and returns a list of (function_name, docstring, code_snippet, line_start, line_end).
    """
    with open(file_path, "r", encoding="utf-8") as f:
        source = f.read()

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    functions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            start = node.lineno
            end = node.end_lineno
            code_lines = source.splitlines()[start-1:end]
            snippet = "\n".join(code_lines)
            
            # Simple metadata
            name = node.name
            docstring = ast.get_docstring(node) or ""
            
            functions.append({
                "name": name,
                "docstring": docstring,
                "snippet": snippet,
                "start": start,
                "end": end,
                "file": file_path,
                "type": type(node).__name__
            })
    return functions

def main():
    # 1. Initialize ChromaDB
    client = chromadb.PersistentClient(path=DB_PATH)
    
    # Use default embedding (all-MiniLM-L6-v2)
    # Note: In production you might want a stronger CodeBERT model
    ef = embedding_functions.DefaultEmbeddingFunction()
    
    # Get or create collection
    try:
        collection = client.get_collection(name=COLLECTION_NAME, embedding_function=ef)
        print(f"Loaded existing collection '{COLLECTION_NAME}'")
    except:
        collection = client.create_collection(name=COLLECTION_NAME, embedding_function=ef)
        print(f"Created new collection '{COLLECTION_NAME}'")

    # 2. Scan Files
    print(f"Scanning {REPO_PATH}...")
    py_files = glob.glob(os.path.join(REPO_PATH, "**/*.py"), recursive=True)
    
    all_docs = []
    all_metadatas = []
    all_ids = []

    count = 0
    for file_path in py_files:
        funcs = get_functions_from_file(file_path)
        for func in funcs:
            # Create a rich text representation for embedding
            # "Function: train_model | Doc: Train key logic... | Code: def train..."
            embedding_text = f"{func['type']}: {func['name']}\nDocstring: {func['docstring']}\nCode:\n{func['snippet']}"
            
            all_docs.append(embedding_text)
            all_metadatas.append({
                "name": func['name'],
                "file_path": func['file'],
                "line_start": func['start'],
                "line_end": func['end'],
                "type": func['type']
            })
            all_ids.append(f"{file_path}:{func['name']}:{func['start']}")
            count += 1

    # 3. Add to DB
    if all_docs:
        print(f"Indexing {len(all_docs)} snippets...")
        # Chroma handles batching automatically usually, but let's be safe with small batches if needed
        collection.upsert(
            documents=all_docs,
            metadatas=all_metadatas,
            ids=all_ids
        )
        print("Indexing complete!")
    else:
        print("No Python snippets found to index.")

if __name__ == "__main__":
    main()
