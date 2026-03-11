from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:19006", "http://10.0.2.2:3000"])

# Configure Groq API
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

# Model to use
GROQ_MODEL = "llama-3.3-70b-versatile"

# Store chat sessions in memory (use database for production)
chat_sessions = {}


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "message": "AI Backend is running"
    })


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Simple chat endpoint - single message/response

    Request body:
    {
        "message": "Your question here",
        "context": "Optional context about the course/topic"
    }
    """
    try:
        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({"error": "Message is required"}), 400

        user_message = data.get('message')
        context = data.get('context', '')

        # Build the prompt
        if context:
            system_content = f"""You are a helpful learning assistant for SkillSphere, an online learning platform.

Context: {context}

Please provide a helpful, educational response."""
        else:
            system_content = """You are a helpful learning assistant for SkillSphere, an online learning platform.

Please provide a helpful, educational response."""

        # Generate response using Groq
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1024
        )

        return jsonify({
            "success": True,
            "response": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/chat/session', methods=['POST'])
def create_session():
    """
    Create a new chat session

    Request body:
    {
        "session_id": "unique_session_id",
        "system_prompt": "Optional custom system prompt"
    }
    """
    try:
        data = request.get_json()

        if not data or 'session_id' not in data:
            return jsonify({"error": "session_id is required"}), 400

        session_id = data.get('session_id')
        system_prompt = data.get('system_prompt',
            "You are a helpful learning assistant for SkillSphere, an online learning platform. "
            "Help students understand concepts, answer questions, and guide them through their learning journey."
        )

        # Store the session with message history
        chat_sessions[session_id] = {
            "system_prompt": system_prompt,
            "messages": [{"role": "system", "content": system_prompt}],
            "history": []
        }

        return jsonify({
            "success": True,
            "message": "Chat session created",
            "session_id": session_id
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/chat/session/<session_id>/message', methods=['POST'])
def send_message(session_id):
    """
    Send a message in an existing chat session

    Request body:
    {
        "message": "Your message here"
    }
    """
    try:
        if session_id not in chat_sessions:
            return jsonify({"error": "Session not found. Create a session first."}), 404

        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({"error": "Message is required"}), 400

        user_message = data.get('message')
        session = chat_sessions[session_id]

        # Add user message to conversation
        session['messages'].append({"role": "user", "content": user_message})

        # Send message and get response using Groq
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=session['messages'],
            temperature=0.7,
            max_tokens=1024
        )

        assistant_message = response.choices[0].message.content

        # Add assistant response to conversation
        session['messages'].append({"role": "assistant", "content": assistant_message})

        # Store in history
        session['history'].append({
            "role": "user",
            "content": user_message
        })
        session['history'].append({
            "role": "assistant",
            "content": assistant_message
        })

        return jsonify({
            "success": True,
            "response": assistant_message,
            "session_id": session_id
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/chat/session/<session_id>/history', methods=['GET'])
def get_history(session_id):
    """Get chat history for a session"""
    try:
        if session_id not in chat_sessions:
            return jsonify({"error": "Session not found"}), 404

        return jsonify({
            "success": True,
            "session_id": session_id,
            "history": chat_sessions[session_id]['history']
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/chat/session/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a chat session"""
    try:
        if session_id not in chat_sessions:
            return jsonify({"error": "Session not found"}), 404

        del chat_sessions[session_id]

        return jsonify({
            "success": True,
            "message": "Session deleted"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/explain', methods=['POST'])
def explain_topic():
    """
    Explain a topic in simple terms

    Request body:
    {
        "topic": "Topic to explain",
        "level": "beginner/intermediate/advanced"
    }
    """
    try:
        data = request.get_json()

        if not data or 'topic' not in data:
            return jsonify({"error": "Topic is required"}), 400

        topic = data.get('topic')
        level = data.get('level', 'beginner')

        prompt = f"""Explain the following topic for a {level} level student:

Topic: {topic}

Please provide:
1. A clear explanation
2. Key points to remember
3. A simple example if applicable

Make it easy to understand and educational."""

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1024
        )

        return jsonify({
            "success": True,
            "topic": topic,
            "level": level,
            "explanation": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/quiz/generate', methods=['POST'])
def generate_quiz():
    """
    Generate quiz questions for a topic

    Request body:
    {
        "topic": "Topic for quiz",
        "num_questions": 5,
        "difficulty": "easy/medium/hard"
    }
    """
    try:
        data = request.get_json()

        if not data or 'topic' not in data:
            return jsonify({"error": "Topic is required"}), 400

        topic = data.get('topic')
        num_questions = data.get('num_questions', 5)
        difficulty = data.get('difficulty', 'medium')

        prompt = f"""Generate {num_questions} multiple choice quiz questions about: {topic}

Difficulty level: {difficulty}

For each question, provide:
1. The question
2. Four options (A, B, C, D)
3. The correct answer
4. A brief explanation

Format the response as JSON like this:
{{
    "questions": [
        {{
            "question": "Question text",
            "options": {{
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
            }},
            "correct_answer": "A",
            "explanation": "Why this is correct"
        }}
    ]
}}"""

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2048
        )

        response_text = response.choices[0].message.content

        # Try to parse as JSON, otherwise return as text
        try:
            import json
            # Find JSON in response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                quiz_data = json.loads(json_str)
                return jsonify({
                    "success": True,
                    "topic": topic,
                    "difficulty": difficulty,
                    "quiz": quiz_data
                })
        except:
            pass

        return jsonify({
            "success": True,
            "topic": topic,
            "difficulty": difficulty,
            "quiz_raw": response_text
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/summarize', methods=['POST'])
def summarize_content():
    """
    Summarize learning content

    Request body:
    {
        "content": "Content to summarize",
        "max_points": 5
    }
    """
    try:
        data = request.get_json()

        if not data or 'content' not in data:
            return jsonify({"error": "Content is required"}), 400

        content = data.get('content')
        max_points = data.get('max_points', 5)

        prompt = f"""Summarize the following learning content into {max_points} key points:

Content:
{content}

Provide:
1. A brief summary (2-3 sentences)
2. {max_points} key bullet points
3. Main takeaway"""

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1024
        )

        return jsonify({
            "success": True,
            "summary": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == '__main__':
    print("=" * 50)
    print("SkillSphere AI Backend (Groq)")
    print("=" * 50)
    print(f"Server running on http://localhost:5001")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  POST /api/chat - Simple chat")
    print("  POST /api/chat/session - Create chat session")
    print("  POST /api/chat/session/<id>/message - Send message")
    print("  GET  /api/chat/session/<id>/history - Get history")
    print("  DELETE /api/chat/session/<id> - Delete session")
    print("  POST /api/explain - Explain a topic")
    print("  POST /api/quiz/generate - Generate quiz")
    print("  POST /api/summarize - Summarize content")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5001, debug=True)
