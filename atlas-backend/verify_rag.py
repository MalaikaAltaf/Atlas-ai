import requests
import json

def test_search():
    print("Testing /search-code endpoint...")
    try:
        response = requests.post(
            "http://localhost:8000/search-code",
            json={"query": "Adam Optimizer"}
        )
        data = response.json()
        
        if "results" in data:
            print(f"SUCCESS: Found {len(data['results'])} results.")
            for res in data['results']:
                print(f" - {res['name']} ({res['type']})")
        else:
            print("FAILURE: No results found or error returned.")
            print(data)
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_search()
