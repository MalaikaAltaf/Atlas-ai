
try:
    from main import app, AnalyzeRequest
    from prompt import build_prompt
    
    print("Import successful")
    
    # Test AnalyzeRequest
    req = AnalyzeRequest(page_title="Test", page_text="Content", level="beginner")
    print(f"Model created: {req}")
    
    # Test prompt generation
    p = build_prompt("Title", "Content", "expert")
    if "PhD" in p:
        print("Expert prompt correct")
    else:
        print("Expert prompt check failed")
        
    p2 = build_prompt("Title", "Content", "beginner")
    if "ELI5" in p2:
        print("Beginner prompt correct")
    else:
        print("Beginner prompt check failed")

    # Verify absence of curriculum/quiz
    if "Dynamic Curriculum" in p:
        print("FAILURE: 'Dynamic Curriculum' still present in prompt!")
    else:
        print("SUCCESS: 'Dynamic Curriculum' removed from prompt.")

    if "XP Score" in p:
        print("FAILURE: 'XP Score' still present in prompt!")
    else:
        print("SUCCESS: 'XP Score' removed from prompt.")

    try:
        from main import QuizRequest
        print("FAILURE: QuizRequest class still exists in main.py!")
    except ImportError:
        print("SUCCESS: QuizRequest class correctly removed.")
        
    try:
        from main import generate_quiz
        print("FAILURE: generate_quiz endpoint still exists in main.py!")
    except ImportError:
        print("SUCCESS: generate_quiz endpoint correctly removed.")

    try:
        from prompt import build_quiz_prompt
        print("FAILURE: build_quiz_prompt still exists in prompt.py!")
    except ImportError:
        print("SUCCESS: build_quiz_prompt correctly removed.")

except Exception as e:
    print(f"Error: {e}")
