# Atlas AI: The Neural Navigator - Backend API

This FastAPI backend provides endpoints for the Atlas AI Chrome Extension MVP.

## Endpoints

- `/analyze` (POST):
  - Input: `{ "prompt": "<page content>" }`
  - Output: `{ "result": "<AI summary>" }`

## Environment Variables
- `GEMINI_API_KEY`: Your Gemini 3 API key (set in `.env`)

## Setup
1. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
2. Add your Gemini API key to `.env`:
   ```
   GEMINI_API_KEY=your-key-here
   ```
3. Run the server:
   ```sh
   uvicorn main:app --reload
   ```

## Files
- `main.py`: FastAPI app and Gemini integration
- `prompt.py`: Prompt builder for AI context
- `config.py`: Loads environment variables
- `check_models.py`: Lists available Gemini models
- `requirements.txt`: Python dependencies

## Security
- **Never commit your `.env` file or API keys to public repos.**

## Next Steps
- Integrate with Chrome Extension frontend
- Add endpoints for knowledge graph and personalization features
