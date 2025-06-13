from flask import Flask, Response, render_template, jsonify, request, send_file
import cv2
from cheating import CheatingDetector
from flask_cors import CORS
from flask_mail import Mail, Message
import uuid 
import os
import json
import datetime
import openai
import re
from dotenv import load_dotenv
import numpy as np
import base64
import tempfile
import whisper
from flask import send_from_directory

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')


app = Flask(__name__)

app.static_folder = '../client/dist'
app.static_url_path = ''

CORS(app, resources={r"/*": {"origins": ["http://localhost:5000", "http://127.0.0.1:5000"]}}, supports_credentials=True)

DATA_DIR = "data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

user_calibrations = {}   # Holds all per-user state

TESTS_JSON = os.path.join(DATA_DIR, "tests.json")

detector = CheatingDetector()

# Configure Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'siddharthsinghpanwar01@gmail.com'
app.config['MAIL_PASSWORD'] = 'mkuw gipa gjff eagj'
app.config['MAIL_DEFAULT_SENDER'] = 'siddharthsinghpanwar01@gmail.com'
mail = Mail(app)


# Frame Processing
@app.route('/process_frame', methods=['POST'])
def process_frame():
    """Process video frame for cheating detection"""
    data = request.get_json()
    img_data = data.get('image')
    candidate_name = data.get('candidateName')
    token = data.get('token')
    
    print("\n--- /process_frame CALLED ---")
    print("Token from request:", token)
    print("Current user_calibrations dict:")
    for t, val in user_calibrations.items():
        print(f"  {t}: {val}")

    if not img_data or not token:
        return jsonify({'error': 'No image or token provided'}), 400

    if "," in img_data:
        img_data = img_data.split(",")[1]

    try:
        img_array = np.frombuffer(base64.b64decode(img_data), np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({'error': 'Invalid image data'}), 400

    user_state = user_calibrations.get(token)
    if not user_state or not user_state.get("calibrated") or not user_state.get("thresholds"):
        return jsonify({'error': 'Calibration missing for this user'}), 400

    frames_state = user_state.get('frames_state')
    if frames_state is None:
        frames_state = {
            'left_frames_outside': 0,
            'right_frames_outside': 0,
            'frames_no_pupil_ud': 0,
            'cheat_start_time_ud': None,
            'left_eye_closed_start_time': None,
            'right_eye_closed_start_time': None,
            'left_cheating_detected': False,
            'right_cheating_detected': False,
            'warning_timer_start': None,
            'central_message_start': None,
            'warning_active_start': None,
            'warning_count': 0,
        }

    candidate_folder = None
    if candidate_name:
        safe_name = candidate_name.replace(" ", "_")
        candidate_folder = os.path.join("data", "candidates", safe_name)
        os.makedirs(candidate_folder, exist_ok=True)

    processed_frame, updated_frames_state = detector.process_frame(
        frame,
        user_state["calibration_data"],
        user_state["thresholds"],
        frames_state,
        candidate_folder=candidate_folder
    )

    user_state['frames_state'] = updated_frames_state

    response = {
        "multiple_faces": getattr(detector, "last_multiple_faces", False),
        "head_alert": getattr(detector, "last_head_alert", ""),
        "eye_lr_alert": getattr(detector, "last_eye_lr_alert", ""),
        "eye_ud_alert": getattr(detector, "last_eye_ud_alert", ""),
        "eye_oc_alert": getattr(detector, "last_eye_oc_alert", ""),
    }
    return jsonify(response)


@app.route('/get-tab-switch-count', methods=['POST'])
def get_tab_switch_count():
    """Get current tab switch count for a candidate"""
    data = request.get_json()
    candidate_name = data.get('candidateName')
    
    if not candidate_name:
        return jsonify({"error": "Missing candidate name"}), 400
    
    safe_name = candidate_name.replace(' ', '_')
    candidate_folder = os.path.join("data", "candidates", safe_name)
    warning_file = os.path.join(candidate_folder, "warning_count.json")
    
    if os.path.exists(warning_file):
        with open(warning_file, "r") as f:
            counts = json.load(f)
        tab_switch_count = counts.get('tab_switch_count', 0)
    else:
        tab_switch_count = 0
    
    return jsonify({"tab_switch_count": tab_switch_count})

@app.route('/increment-tab-switch', methods=['POST'])
def increment_tab_switch():
    """Increment tab switch count for a candidate"""
    data = request.get_json()
    candidate_name = data.get('candidateName')
    
    if not candidate_name:
        return jsonify({"error": "Missing candidate name"}), 400
    
    safe_name = candidate_name.replace(' ', '_')
    candidate_folder = os.path.join("data", "candidates", safe_name)
    os.makedirs(candidate_folder, exist_ok=True)
    
    warning_file = os.path.join(candidate_folder, "warning_count.json")
    if os.path.exists(warning_file):
        with open(warning_file, "r") as f:
            counts = json.load(f)
    else:
        counts = {"warning_count": 0, "tab_switch_count": 0}
    
    # Increment only tab switch count
    counts['tab_switch_count'] = counts.get('tab_switch_count', 0) + 1
    counts['last_tab_switch'] = datetime.datetime.now().isoformat()
    
    with open(warning_file, "w") as f:
        json.dump(counts, f, indent=2)
    
    # Check if user should be terminated (3 or more tab switches)
    is_terminated = counts['tab_switch_count'] >= 3
    
    return jsonify({
        "tab_switch_count": counts['tab_switch_count'],
        "is_terminated": is_terminated
    })

# Calibration
@app.route('/advance_calibration', methods=['POST'])
def advance_calibration():
    """Advance calibration process"""
    data = request.get_json()
    image_data = data.get('image')
    token = data.get('token')

    if not image_data or not token:
        return jsonify({"status": "error", "message": "Missing Image or token"}), 400

    user_state = user_calibrations.get(token)
    if not user_state:
        return jsonify({"status": "error", "message": "Calibration not started"}), 400

    calibration_step = user_state["calibration_step"]
    calibration_data = user_state["calibration_data"]
    
    # Get candidate name - try multiple sources
    candidate_name = None
    
    # Try to get from user_state first
    candidate_name = user_state.get('candidateName') or user_state.get('name')
    
    # If not found, try to get from test config
    if not candidate_name:
        try:
            if os.path.exists(TESTS_JSON):
                with open(TESTS_JSON, "r") as f:
                    tests = json.load(f)
                test_entry = next((entry for entry in tests if entry["token"] == token), None)
                if test_entry:
                    candidate_name = test_entry.get('name')
        except:
            pass
    
    # Use token as fallback
    if not candidate_name:
        candidate_name = token
    
    # Create candidate folder using candidate name (not token)
    safe_name = candidate_name.replace(" ", "_")
    candidate_folder = os.path.join("data", "candidates", safe_name)
    os.makedirs(candidate_folder, exist_ok=True)

    # Save center.jpg in candidate folder when calibration_step == 0
    if calibration_step == 0:
        if ',' in image_data:
            img_data_clean = image_data.split(',')[1]
        else:
            img_data_clean = image_data
        img_array = np.frombuffer(base64.b64decode(img_data_clean), np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        image_path = os.path.join(candidate_folder, "center.jpg")
        cv2.imwrite(image_path, frame)
        print(f"Saved center calibration image for {candidate_name} at {image_path}")

    (status, current_step, total_steps, steps, instruction, thresholds) = detector.process_calibration_step(
        image_data, calibration_step, calibration_data
    )

    user_state["calibration_step"] = current_step

    if status == "calibration_complete":
        user_state["calibrated"] = True
        user_state["thresholds"] = thresholds
        user_calibrations[token] = user_state
        return jsonify({
            "status": status,
            "current_step": current_step,
            "total_steps": total_steps,
            "steps": steps,
            "instruction": instruction,
            "calibration_data": {
                "calibrated": True,
                "thresholds": thresholds
            }
        })
    else:
        user_calibrations[token] = user_state
        return jsonify({
            "status": status,
            "current_step": current_step,
            "total_steps": total_steps,
            "steps": steps,
            "instruction": instruction
        })

@app.route('/save-calibration', methods=['POST'])
def save_calibration():
    """Save calibration data"""
    data = request.get_json()
    token = data.get('token')
    calibration_data = data.get('calibration_data')
    
    if not token or calibration_data is None:
        return jsonify({'success': False, 'error': 'Missing token or calibration_data'}), 400
        
    if token not in user_calibrations:
        user_calibrations[token] = {}
    user_calibrations[token]["calibration_data"] = calibration_data
    user_calibrations[token]["calibrated"] = True
    
    return jsonify({'success': True})

@app.route('/get-calibration', methods=['POST'])
def get_calibration():
    """Get calibration status"""
    data = request.get_json()
    token = data.get('token')
    user_state = user_calibrations.get(token)
    if not user_state or not user_state.get("calibrated"):
        return jsonify({'calibrated': False})
    return jsonify({'calibrated': True, 'calibration_data': user_state["thresholds"]})

@app.route('/show-all-calibrations', methods=['GET'])
def show_all_calibrations():
    """Show all calibrations (for debugging)"""
    return jsonify(user_calibrations)

# Session Management
@app.route('/clear-session', methods=['POST'])
def clear_session():
    """Clear user session"""
    data = request.get_json()
    token = data.get('token')
    if token in user_calibrations:
        del user_calibrations[token]
    return jsonify({'success': True})

@app.route('/start_tracking', methods=['POST'])
def start_tracking():
    """Start tracking session"""
    data = request.get_json()
    token = data.get('token')
    if not token:
        return jsonify({'error': 'Missing token'}), 400

    user_calibrations[token] = {
        "calibrated": False,
        "calibration_step": 0,
        "calibration_data": {},
        "frames_state": {
            'left_frames_outside': 0,
            'right_frames_outside': 0,
            'frames_no_pupil_ud': 0,
            'cheat_start_time_ud': None,
            'left_eye_closed_start_time': None,
            'right_eye_closed_start_time': None,
            'left_cheating_detected': False,
            'right_cheating_detected': False,
            'warning_timer_start': None,
            'central_message_start': None,
            'warning_active_start': None,
            'warning_count': 0,
        }
    }
    
    # Clean old images in candidate folders
    try:
        detector.clean_candidate_folders(DATA_DIR)
    except Exception as e:
        print(f"Could not clean folders: {e}")
    
    return jsonify({'success': True})

# Audio Processing
@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio to text using Whisper"""
    if 'audio' not in request.files:
        return jsonify({'transcript': '', 'error': 'No audio uploaded!'}), 400
    
    audio_file = request.files['audio']
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        audio_file.save(temp_audio)
        temp_audio_path = temp_audio.name

    transcript = ""
    error_msg = ""
    try:
        model = whisper.load_model("base")
        result = model.transcribe(temp_audio_path)
        transcript = result["text"]
    except Exception as e:
        error_msg = str(e)
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
    return jsonify({'transcript': transcript, 'error': error_msg})

@app.route('/tts', methods=['POST'])
def text_to_speech():
    """Convert text to speech using OpenAI TTS"""
    data = request.json
    text = data.get("text")
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.audio.speech.create(
            model="tts-1",
            voice="onyx",
            input=text
        )
        mp3_data = response.content
        temp_path = "/tmp/tts_output.mp3"
        with open(temp_path, "wb") as f:
            f.write(mp3_data)
        return send_file(temp_path, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Monitoring
@app.route('/tab-switch', methods=['POST'])
def tab_switch():
    """Log tab switch event and check for termination"""
    data = request.get_json()
    candidate_name = data.get('candidateName')
    tab_switch_count = data.get('tabSwitchCount')

    if not candidate_name:
        return jsonify({"error": "Missing candidate name"}), 400

    safe_name = candidate_name.replace(' ', '_')
    candidate_folder = os.path.join("data", "candidates", safe_name)
    os.makedirs(candidate_folder, exist_ok=True)

    warning_file = os.path.join(candidate_folder, "warning_count.json")
    if os.path.exists(warning_file):
        with open(warning_file, "r") as f:
            counts = json.load(f)
    else:
        counts = {}
    
    # Update the tab switch count
    counts['tab_switch_count'] = tab_switch_count
    counts['last_tab_switch'] = datetime.datetime.now().isoformat()
    
    with open(warning_file, "w") as f:
        json.dump(counts, f)

    # Check if user should be terminated (3 or more tab switches)
    is_terminated = tab_switch_count >= 3

    return jsonify({
        "message": "Tab switch count updated",
        "tab_switch_count": tab_switch_count,
        "is_terminated": is_terminated
    })

# Interview Management
@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    """Generate interview questions using AI based on token"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        token = data.get('token')
        if not token:
            return jsonify({"error": "Token is required"}), 400

        # Get candidate data from token
        if not os.path.exists(TESTS_JSON):
            return jsonify({"error": "No test data found"}), 404
            
        with open(TESTS_JSON, 'r') as f:
            tests = json.load(f)
        
        test_entry = next((entry for entry in tests if entry["token"] == token), None)
        if not test_entry:
            return jsonify({"error": "Test not found or expired"}), 404
        
        # Extract data from test configuration
        name = test_entry.get('name')
        role = test_entry.get('role')
        num_questions_raw = test_entry.get('numQuestions')
        difficulty = test_entry.get('difficulty')
        experience = test_entry.get('experience')
        
        try:
            num_questions = int(num_questions_raw) if num_questions_raw else None
        except (ValueError, TypeError):
            num_questions = None    

        print(f"=== GENERATE QUESTIONS DEBUG ===")
        print(f"Token: {token}")
        print(f"Name: {name}")
        print(f"Role: {role}")
        print(f"Num Questions Raw: {num_questions_raw} (type: {type(num_questions_raw)})")
        print(f"Num Questions Converted: {num_questions} (type: {type(num_questions)})")
        print(f"Difficulty: {difficulty}")
        print(f"Experience: {experience}")
        print(f"GROQ_API_KEY exists: {'Yes' if GROQ_API_KEY else 'No'}")
        print("==============================")

        # Strict validation - ALL fields must come from admin form
        if not name or not role:
            print("❌ VALIDATION FAILED: Missing name or role")
            return jsonify({"error": "Missing required fields in test configuration (name/role)."}), 400

        if num_questions is None or not isinstance(num_questions, int) or num_questions < 1:
            print(f"❌ VALIDATION FAILED: Invalid numQuestions - raw: {num_questions_raw}, converted: {num_questions}")
            return jsonify({"error": "Invalid or missing numQuestions in test configuration. Admin must set this."}), 400

        if not difficulty or difficulty not in ['easy', 'medium', 'hard']:
            print(f"❌ VALIDATION FAILED: Invalid difficulty - value: {difficulty}")
            return jsonify({"error": "Invalid or missing difficulty in test configuration. Admin must set this."}), 400

        if not experience:
            print(f"❌ VALIDATION FAILED: Missing experience - value: {experience}")
            return jsonify({"error": "Missing experience level in test configuration. Admin must set this."}), 400

        print("✅ ALL VALIDATIONS PASSED")

        # Create dynamic prompt based on difficulty and role
        difficulty_instructions = {
            'easy': 'Generate basic, entry-level questions suitable for beginners.',
            'medium': 'Generate intermediate-level questions with moderate complexity.',
            'hard': 'Generate advanced, challenging questions for experienced professionals.'
        }
        
        difficulty_instruction = difficulty_instructions.get(difficulty, difficulty_instructions['medium'])

        prompt = (
            f"You are an AI interviewer. Your candidate's name is {name}. "
            f"They are applying for the position of {role} with {experience} experience level.\n"
            f"{difficulty_instruction}\n"
            f"Generate exactly {num_questions} technical interview questions numbered 1 through {num_questions}. "
            f"Do NOT include any introduction or conclusion. "
            f"ONLY provide the numbered questions, one per line, starting with '1. ' and so on. "
            f"All questions must be technical and directly relevant to the {role} role with {difficulty} difficulty level "
            f"and appropriate for someone with {experience} experience."
        )

        # Check if GROQ_API_KEY exists
        if not GROQ_API_KEY:
            return jsonify({"error": "GROQ_API_KEY not configured on server"}), 500

        print(f"Making API call to Groq...")
        
        client = openai.OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=GROQ_API_KEY
        )
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-70b-8192",
        )
        
        response_text = chat_completion.choices[0].message.content
        print(f"API Response: {response_text[:100]}...")
        
        question_regex = re.compile(r"^\s*\d+\.\s+(.+)$", re.MULTILINE)
        questions = question_regex.findall(response_text)
        
        if not questions:
            print(f"No questions found in response: {response_text}")
            return jsonify({"error": "No questions generated", "response_text": response_text}), 500
            
        print(f"Generated {len(questions)} questions")
        return jsonify({"questions": questions, "prompt": prompt})
        
    except Exception as e:
        print(f"❌ ERROR in generate_questions: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate questions: {str(e)}"}), 500

@app.route('/save-responses', methods=['POST'])
def save_responses():
    """Save interview responses to JSON file"""
    data = request.json
    candidateName = data.get("candidateName")
    role = data.get("role")
    experience = data.get("experience")
    prompt = data.get("prompt")
    responses = data.get("responses")
    
    if not candidateName or not responses:
        return jsonify({"error": "Invalid data format"}), 400

    safe_name = candidateName.replace(' ', '_')
    candidate_folder = os.path.join("data", "candidates", safe_name)
    os.makedirs(candidate_folder, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"interview_{safe_name}_{timestamp}.json"
    filepath = os.path.join(candidate_folder, filename)

    interview_data = {
        "candidate": {
            "name": candidateName,
            "role": role or "Not specified",
            "experience": experience or "Not specified",
        },
        "timestamp": timestamp,
        "prompt": prompt or "",
        "responses": responses
    }
    with open(filepath, "w") as f:
        json.dump(interview_data, f, indent=2)
    return jsonify({"success": True, "filePath": filepath})

def create_email_template(candidate_name, role, duration, num_questions, test_link):
    """Create a beautiful HTML email template for test invitations"""
    
    template = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Test Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <div style="background-color: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                    </svg>
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    Interview Test Invitation
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">
                    You're invited to complete your technical assessment
                </p>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #2d3748; margin: 0 0 10px; font-size: 24px; font-weight: 600;">
                        Hello, {candidate_name}! 👋
                    </h2>
                    <p style="color: #718096; margin: 0; font-size: 16px; line-height: 1.6;">
                        We're excited to move forward with your application for the <strong style="color: #4a5568;">{role}</strong> position.
                    </p>
                </div>

                <!-- Test Details Card -->
                <div style="background-color: #f7fafc; border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #667eea;">
                    <h3 style="color: #2d3748; margin: 0 0 15px; font-size: 18px; font-weight: 600;">
                        📋 Test Details
                    </h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        <div style="flex: 1; min-width: 200px;">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <span style="background-color: #667eea; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">⏱</span>
                                <span style="color: #4a5568; font-weight: 500;">Duration: {duration} minutes</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <span style="background-color: #48bb78; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">📝</span>
                                <span style="color: #4a5568; font-weight: 500;">Questions: {num_questions}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Instructions -->
                <div style="background-color: #fff5f5; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #fed7d7;">
                    <h3 style="color: #c53030; margin: 0 0 15px; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
                        <span style="margin-right: 8px;">⚠️</span> Important Instructions
                    </h3>
                    <ul style="color: #742a2a; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Ensure you have a stable internet connection</li>
                        <li>Use a desktop/laptop with a working camera and microphone</li>
                        <li>Find a quiet, well-lit environment</li>
                        <li>Keep your ID document ready for verification</li>
                        <li>Do not close the browser tab during the test</li>
                    </ul>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{test_link}" style="background-color: #667eea; color: white !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif; border: 2px solid #667eea;">
                        🚀Start Your Test Now
                    </a>
                    <p style="color: #718096; margin: 15px 0 0; font-size: 14px;">
                        Click the button above or copy this link: <br>
                        <code style="background-color: #edf2f7; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #4a5568;">{test_link}</code>
                    </p>
                </div>

                <!-- Support -->
                <div style="background-color: #edf2f7; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0;">
                    <h3 style="color: #2d3748; margin: 0 0 10px; font-size: 16px; font-weight: 600;">
                        Need Help? 🤝
                    </h3>
                    <p style="color: #718096; margin: 0; line-height: 1.6;">
                        If you encounter any technical issues, please contact us at:<br>
                        <a href="mailto:support@company.com" style="color: #667eea; text-decoration: none; font-weight: 500;">support@company.com</a> or 
                        <a href="tel:+1234567890" style="color: #667eea; text-decoration: none; font-weight: 500;">+1 (234) 567-890</a>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #2d3748; padding: 25px 30px; text-align: center;">
                <p style="color: #a0aec0; margin: 0 0 10px; font-size: 14px;">
                    This is an automated message from <strong style="color: white;">Your Company Name</strong>
                </p>
                <p style="color: #718096; margin: 0; font-size: 12px;">
                    © 2025 Your Company. All rights reserved.
                </p>
                <div style="margin-top: 15px;">
                    <a href="#" style="color: #667eea; text-decoration: none; margin: 0 10px; font-size: 12px;">Privacy Policy</a>
                    <a href="#" style="color: #667eea; text-decoration: none; margin: 0 10px; font-size: 12px;">Terms of Service</a>
                    <a href="#" style="color: #667eea; text-decoration: none; margin: 0 10px; font-size: 12px;">Contact Us</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return template.format(
        candidate_name=candidate_name,
        role=role,
        duration=duration,
        num_questions=num_questions,
        test_link=test_link
    )

# Test Management
@app.route('/save-test-config', methods=['POST'])
def save_test_config():
    """Create new test configuration and send invitation email"""
    data = request.get_json()
    token = str(uuid.uuid4())[:8]
    candidate_name = data.get('name')
    candidate_email = data.get('email')
    role = data.get('role', 'Software Developer')
    duration = data.get('duration', 60)  # Get duration from form
    num_questions = data.get('numQuestions', 5)
    
    test_entry = {"token": token, **data}

    if os.path.exists(TESTS_JSON):
        with open(TESTS_JSON, "r") as f:
            tests = json.load(f)
    else:
        tests = []
    tests.append(test_entry)
    with open(TESTS_JSON, "w") as f:
        json.dump(tests, f, indent=2)

    # Create the test link
    BASE_URL = os.getenv('BASE_URL', '')
    link = f"{BASE_URL}/user-test/{token}"

    email_sent = False
    try:
        # Use the beautiful email template with all data
        html_content = create_email_template(
            candidate_name=candidate_name,
            role=role,
            duration=duration,  # Use form duration
            num_questions=num_questions,
            test_link=link
        )
        
        msg = Message(
            subject=f"🎯 Interview Test Invitation - {role} Position",
            recipients=[candidate_email],
            html=html_content
        )
        mail.send(msg)
        email_sent = True
    except Exception as e:
        print("Failed to send email:", e)
        
    return jsonify({"link": link, "emailSent": email_sent})

@app.route('/get-test-config/<string:token>', methods=['GET'])
def get_test_config(token):
    """Get test configuration by token"""
    try: 
        if not os.path.exists(TESTS_JSON):
            return jsonify({"error": "No test data found"}), 404
        with open(TESTS_JSON, 'r') as f:
            tests = json.load(f)
    except Exception as e:
        print("Error loading tests.json:", e)   
        tests = []
        
    test_entry = next((entry for entry in tests if entry["token"] == token), None)
    if not test_entry:
        return jsonify({"error": "Test not found or expired"}), 404
    return jsonify(test_entry)

# Feedback
@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    """Submit user feedback about the system"""
    data = request.json
    rating = data.get("rating")
    comment = data.get("comment")
    feedback_file = os.path.join(DATA_DIR, "feedback.json")

    if os.path.exists(feedback_file):
        with open(feedback_file, "r") as f:
            feedback_list = json.load(f)
    else:
        feedback_list = []
    
    feedback_entry = {
        "rating": rating,
        "comment": comment,
        "timestamp": datetime.datetime.now().isoformat()
    }
    feedback_list.append(feedback_entry)
    with open(feedback_file, "w") as f:
        json.dump(feedback_list, f, indent=2)
    return jsonify({"success": True})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    """Serve React app for all routes"""
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)

