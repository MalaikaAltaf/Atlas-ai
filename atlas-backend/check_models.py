import google.generativeai as genai
from config import GEMINI_API_KEY

# Configure the SDK
genai.configure(api_key=GEMINI_API_KEY)

# List available models
models = genai.list_models()

print("Available models for your account:\n")
for m in models:
    print(m)
