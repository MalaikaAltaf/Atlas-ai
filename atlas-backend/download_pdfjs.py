import os
import requests

LIB_DIR = "../atlas-extension/lib"
PDF_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

def download_file(url, dest_path):
    print(f"Downloading {url}...")
    response = requests.get(url)
    if response.status_code == 200:
        with open(dest_path, "wb") as f:
            f.write(response.content)
        print(f"Saved to {dest_path}")
    else:
        print(f"Failed to download {url}: {response.status_code}")

def main():
    if not os.path.exists(LIB_DIR):
        os.makedirs(LIB_DIR)
        print(f"Created directory {LIB_DIR}")

    download_file(PDF_JS_URL, os.path.join(LIB_DIR, "pdf.min.js"))
    download_file(PDF_WORKER_URL, os.path.join(LIB_DIR, "pdf.worker.min.js"))

if __name__ == "__main__":
    main()
