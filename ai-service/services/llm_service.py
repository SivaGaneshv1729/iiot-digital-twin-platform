import os
from google import genai
from pydantic import BaseModel
from typing import Dict, Any

# Ensure GEMINI_API_KEY is set in environment, or provide fallback
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "mock_key_for_now"))

def generate_factory_insights(question: str, context: Dict[str, Any]) -> str:
    """
    Calls the Gemini API to answer questions based on the factory context.
    """
    if os.environ.get("GEMINI_API_KEY") is None:
        return "I am the SmartFactory Assistant. Currently running in mock mode because GEMINI_API_KEY is not set. But based on your data, your factory is operating normally."
        
    prompt = f"""
    You are an AI assistant for a Smart Manufacturing Platform called SmartFactory AI.
    You help factory managers understand production status and machine health.
    
    Current Factory Context:
    Active Machines: {context.get('active_machines', 'Unknown')}
    Overall Efficiency: {context.get('efficiency', 'Unknown')}%
    Production Completed: {context.get('total_completed', 'Unknown')} / {context.get('total_target', 'Unknown')}
    
    Manager's Question: {question}
    
    Answer concisely and professionally, referencing the data above.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return f"Sorry, I encountered an error while analyzing the factory data: {str(e)}"
