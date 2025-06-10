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
import numpy as np
import base64
import tempfile
import whisper
import zipfile
import io

OPENAI_API_KEY = "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"

app = Flask(__name__)

# Fixed CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["https://2325-103-159-68-90.ngrok-free.app", "*"],  # Frontend URL
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
        "supports_credentials": True
    }
})

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

DATA_DIR = "data"
INTERVIEWS_DIR = os.path.join(DATA_DIR, "interviews")
CANDIDATES_DIR = os.path.join(DATA_DIR, "candidates")

# Ensure directories exist
for directory in [DATA_DIR, INTERVIEWS_DIR, CANDIDATES_DIR]:
    os.makedirs(directory, exist_ok=True)

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

# Helper functions
def get_interview_data(token):
    """Get interview data by token from interviews directory"""
    interview_file = os.path.join(INTERVIEWS_DIR, f"{token}.json")
    if not os.path.exists(interview_file):
        return None
    
    with open(interview_file, 'r') as f:
        return json.load(f)

def save_interview_data(token, data):
    """Save interview data to interviews directory"""
    interview_file = os.path.join(INTERVIEWS_DIR, f"{token}.json")
    with open(interview_file, 'w') as f:
        json.dump(data, f, indent=2)

def get_candidate_folder(token):
    """Get candidate folder path"""
    interview_data = get_interview_data(token)
    if not interview_data:
        return None
    
    candidate_name = interview_data['candidate']['name']
    safe_name = candidate_name.replace(' ', '_')
    return os.path.join(CANDIDATES_DIR, safe_name)

# Simple documentation route
@app.route('/docs')
def docs():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>AI Interview Proctoring System API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { font-weight: bold; color: #fff; padding: 5px 10px; border-radius: 3px; }
            .get { background: #61affe; }
            .post { background: #49cc90; }
            .delete { background: #f93e3e; }
            code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>AI Interview Proctoring System API</h1>
        <p>Complete API for managing AI-powered interview sessions with proctoring capabilities</p>
        
        <h2>🎯 Interview Management</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/interviews</code>
            <p>Get all interview sessions</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/interviews/{token}</code>
            <p>Get specific interview session by token</p>
        </div>
        
        <div class="endpoint">
            <span class="method delete">DELETE</span> <code>/api/interviews/{token}</code>
            <p>Delete interview session and all associated data</p>
        </div>
        
        <h2>👤 Candidate Management</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/candidates/{token}</code>
            <p>Get candidate information by token</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/candidates/{token}/images</code>
            <p>Get list of all captured images for candidate</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/candidates/{token}/images/{filename}</code>
            <p>Download specific captured image</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/candidates/{token}/images/download-all</code>
            <p>Download all captured images as ZIP file</p>
        </div>
        
        <h2>🔍 Proctoring Reports</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/proctoring/{token}/alerts</code>
            <p>Get all proctoring alerts for a session</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/proctoring/{token}/report</code>
            <p>Get comprehensive proctoring report for a session</p>
        </div>
        
        <h2>📊 System Reports</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/reports/summary</code>
            <p>Get overall system summary and statistics</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/reports/export/{token}</code>
            <p>Export complete session report as JSON file</p>
        </div>
        
        <h2>🧪 Test Endpoints</h2>
        <p>Try these endpoints:</p>
        <ul>
            <li><a href="/api/interviews" target="_blank">View All Interviews</a></li>
            <li><a href="/api/reports/summary" target="_blank">System Summary</a></li>
        </ul>
    </body>
    </html>
    '''

# ===== NEW API ENDPOINTS =====

@app.route('/api/interviews', methods=['GET'])
def get_interviews():
    """Get all interview sessions"""
    interviews = []
    if os.path.exists(INTERVIEWS_DIR):
        for filename in os.listdir(INTERVIEWS_DIR):
            if filename.endswith('.json'):
                token = filename[:-5]  # Remove .json extension
                interview_data = get_interview_data(token)
                if interview_data:
                    interviews.append(interview_data)
    return jsonify(interviews)

@app.route('/api/interviews/<string:token>', methods=['GET'])
def get_interview(token):
    """Get specific interview session by token"""
    interview_data = get_interview_data(token)
    if not interview_data:
        return jsonify({'error': f'Interview with token {token} not found'}), 404
    return jsonify(interview_data)

@app.route('/api/interviews/<string:token>', methods=['DELETE'])
def delete_interview(token):
    """Delete interview session and all associated data"""
    interview_file = os.path.join(INTERVIEWS_DIR, f"{token}.json")
    if not os.path.exists(interview_file):
        return jsonify({'error': f'Interview with token {token} not found'}), 404
    
    # Also delete candidate folder if exists
    candidate_folder = get_candidate_folder(token)
    if candidate_folder and os.path.exists(candidate_folder):
        import shutil
        shutil.rmtree(candidate_folder)
    
    os.remove(interview_file)
    return jsonify({'message': f'Interview {token} and all associated data deleted successfully'}), 200

@app.route('/api/candidates/<string:token>', methods=['GET'])
def get_candidate(token):
    """Get candidate information by token"""
    interview_data = get_interview_data(token)
    if not interview_data or 'candidate' not in interview_data:
        return jsonify({'error': f'Candidate with token {token} not found'}), 404
    return jsonify(interview_data['candidate'])

@app.route('/api/candidates/<string:token>/images', methods=['GET'])
def get_candidate_images(token):
    """Get list of all captured images for candidate"""
    candidate_folder = get_candidate_folder(token)
    if not candidate_folder or not os.path.exists(candidate_folder):
        return jsonify({'error': f'No images found for token {token}'}), 404
    
    images = []
    for filename in os.listdir(candidate_folder):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            file_path = os.path.join(candidate_folder, filename)
            file_stats = os.stat(file_path)
            images.append({
                'filename': filename,
                'size': file_stats.st_size,
                'created_at': datetime.datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                'download_url': f'/api/candidates/{token}/images/{filename}'
            })
    
    return jsonify({
        'token': token,
        'total_images': len(images),
        'images': images
    })

@app.route('/api/candidates/<string:token>/images/<string:filename>', methods=['GET'])
def download_candidate_image(token, filename):
    """Download specific captured image"""
    candidate_folder = get_candidate_folder(token)
    if not candidate_folder:
        return jsonify({'error': f'Candidate with token {token} not found'}), 404
    
    file_path = os.path.join(candidate_folder, filename)
    if not os.path.exists(file_path):
        return jsonify({'error': f'Image {filename} not found'}), 404
    
    return send_file(file_path, as_attachment=True)

@app.route('/api/candidates/<string:token>/images/download-all', methods=['GET'])
def download_all_images(token):
    """Download all captured images as ZIP file"""
    candidate_folder = get_candidate_folder(token)
    if not candidate_folder or not os.path.exists(candidate_folder):
        return jsonify({'error': f'No images found for token {token}'}), 404
    
    # Create ZIP file in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for filename in os.listdir(candidate_folder):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                file_path = os.path.join(candidate_folder, filename)
                zip_file.write(file_path, filename)
    
    zip_buffer.seek(0)
    
    return send_file(
        io.BytesIO(zip_buffer.read()),
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'candidate_{token}_images.zip'
    )

@app.route('/api/proctoring/<string:token>/alerts', methods=['GET'])
def get_proctoring_alerts(token):
    """Get all proctoring alerts for a session"""
    candidate_folder = get_candidate_folder(token)
    if not candidate_folder:
        return jsonify({'error': f'Session with token {token} not found'}), 404
    
    alerts = []
    warning_file = os.path.join(candidate_folder, "warning_count.json")
    
    if os.path.exists(warning_file):
        with open(warning_file, 'r') as f:
            warning_data = json.load(f)
        
        for alert_type, count in warning_data.items():
            if count > 0:
                alerts.append({
                    'timestamp': datetime.datetime.now().isoformat(),
                    'alert_type': alert_type,
                    'count': count,
                    'severity': 'high' if count > 5 else 'medium' if count > 2 else 'low'
                })
    
    return jsonify({
        'token': token,
        'total_alerts': len(alerts),
        'alerts': alerts
    })

@app.route('/api/proctoring/<string:token>/report', methods=['GET'])
def get_proctoring_report(token):
    """Get comprehensive proctoring report for a session"""
    candidate_folder = get_candidate_folder(token)
    if not candidate_folder:
        return jsonify({'error': f'Session with token {token} not found'}), 404
    
    # Get warning data
    warning_file = os.path.join(candidate_folder, "warning_count.json")
    alert_breakdown = {}
    total_alerts = 0
    
    if os.path.exists(warning_file):
        with open(warning_file, 'r') as f:
            alert_breakdown = json.load(f)
            total_alerts = sum(alert_breakdown.values())
    
    # Count captured images
    captured_images_count = 0
    if os.path.exists(candidate_folder):
        captured_images_count = len([f for f in os.listdir(candidate_folder) 
                                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    
    # Calculate suspicion score (0-100)
    suspicion_score = min(100, (total_alerts * 10) + (alert_breakdown.get('tab_switch_count', 0) * 5))
    
    return jsonify({
        'token': token,
        'total_alerts': total_alerts,
        'alert_breakdown': alert_breakdown,
        'tab_switches': alert_breakdown.get('tab_switch_count', 0),
        'suspicious_score': suspicion_score,
        'captured_images_count': captured_images_count
    })

@app.route('/api/reports/summary', methods=['GET'])
def get_reports_summary():
    """Get overall system summary and statistics"""
    total_interviews = 0
    total_candidates = 0
    total_alerts = 0
    
    if os.path.exists(INTERVIEWS_DIR):
        total_interviews = len([f for f in os.listdir(INTERVIEWS_DIR) if f.endswith('.json')])
    
    if os.path.exists(CANDIDATES_DIR):
        total_candidates = len(os.listdir(CANDIDATES_DIR))
        
        # Count total alerts across all candidates
        for candidate_folder in os.listdir(CANDIDATES_DIR):
            warning_file = os.path.join(CANDIDATES_DIR, candidate_folder, "warning_count.json")
            if os.path.exists(warning_file):
                with open(warning_file, 'r') as f:
                    warning_data = json.load(f)
                    total_alerts += sum(warning_data.values())
    
    return jsonify({
        'total_interviews': total_interviews,
        'total_candidates': total_candidates,
        'total_alerts': total_alerts,
        'system_status': 'operational',
        'last_updated': datetime.datetime.now().isoformat()
    })

@app.route('/api/reports/export/<string:token>', methods=['GET'])
def export_report(token):
    """Export complete session report as JSON file"""
    interview_data = get_interview_data(token)
    if not interview_data:
        return jsonify({'error': f'Session with token {token} not found'}), 404
    
    # Get proctoring data
    candidate_folder = get_candidate_folder(token)
    proctoring_data = {}
    
    if candidate_folder:
        warning_file = os.path.join(candidate_folder, "warning_count.json")
        if os.path.exists(warning_file):
            with open(warning_file, 'r') as f:
                proctoring_data = json.load(f)
    
    # Combine all data
    complete_report = {
        **interview_data,
        'proctoring_summary': proctoring_data,
        'exported_at': datetime.datetime.now().isoformat()
    }
    
    # Return as downloadable JSON file
    return send_file(
        io.BytesIO(json.dumps(complete_report, indent=2).encode()),
        mimetype='application/json',
        as_attachment=True,
        download_name=f'interview_report_{token}.json'
    )

# ===== ALL YOUR EXISTING ENDPOINTS =====

@app.route('/process_frame', methods=['POST'])
def process_frame_api():
    data = request.get_json()
    img_data = data.get('image')
    candidate_name = data.get('candidateName')
    token = data.get('token')
    
    print("\n--- /process_frame CALLED ---")
    print("Token from request:", token)

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

@app.route('/save-responses', methods=['POST'])
def save_responses():
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
    
    # Save to candidate folder (existing behavior)
    with open(filepath, "w") as f:
        json.dump(interview_data, f, indent=2)
    
    # ALSO save to interviews directory for API access
    # Try to find token from existing tests.json
    token = None
    if os.path.exists(TESTS_JSON):
        with open(TESTS_JSON, "r") as f:
            tests = json.load(f)
        for test in tests:
            if test.get('name') == candidateName:
                token = test.get('token')
                break
    
    if token:
        interview_data['token'] = token
        interview_data['status'] = 'completed'
        save_interview_data(token, interview_data)
    
    return jsonify({"success": True, "filePath": filepath})

@app.route('/advance_calibration', methods=['POST'])
def advance_calibration():
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
    
    candidateName = user_state.get('candidateName') or user_state.get('name')
    safe_name = candidateName.replace(" ", "_") if candidateName else token
    candidate_folder = os.path.join("data", "candidates", safe_name)
    os.makedirs(candidate_folder, exist_ok=True)

    if calibration_step == 0:
        if ',' in image_data:
            img_data_clean = image_data.split(',')[1]
        else:
            img_data_clean = image_data
        img_array = np.frombuffer(base64.b64decode(img_data_clean), np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        image_path = os.path.join(candidate_folder, "center.jpg")
        cv2.imwrite(image_path, frame)
        print(f"Saved center calibration image for {token} at {image_path}")

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
    data = request.get_json()
    token = data.get('token')
    user_state = user_calibrations.get(token)
    if not user_state or not user_state.get("calibrated"):
        return jsonify({'calibrated': False})
    return jsonify({'calibrated': True, 'calibration_data': user_state["thresholds"]})

@app.route('/clear-session', methods=['POST'])
def clear_session():
    data = request.get_json()
    token = data.get('token')
    if token in user_calibrations:
        del user_calibrations[token]
    return jsonify({'success': True})

@app.route('/start_tracking', methods=['POST'])
def start_tracking():
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
    folder_path = './warnings'
    if os.path.exists(folder_path):
        detector.clean_images_in_same_folder(folder_path)
    return jsonify({'success': True})

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
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

@app.route('/tab-switch', methods=['POST'])
def tab_switch():
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
    counts['tab_switch_count'] = tab_switch_count
    with open(warning_file, "w") as f:
        json.dump(counts, f)

    return jsonify({"message": "Tab switch count updated"})

@app.route('/tts', methods=['POST'])
def tts():
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
        print("TTS error:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    data = request.get_json()
    name = data.get('name')
    role = data.get('role')
    num_questions = data.get('numQuestions', 3)

    if not name or not role:
        return jsonify({"error": "Missing required fields (name/role)."}), 400

    prompt = (
        f"You are an AI interviewer. Your candidate's name is {name}. "
        f"They are applying for the position of {role}.\n"
        f"Generate exactly {num_questions} technical interview questions numbered 1 through {num_questions}. "
        f"Do NOT include any introduction or conclusion. "
        f"ONLY provide the numbered questions, one per line, starting with '1. ' and so on. "
        f"All questions must be technical and directly relevant to the {role} role."
    )

    try:
        client = openai.OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key="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"
        )
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-70b-8192",
        )
        response_text = chat_completion.choices[0].message.content
        question_regex = re.compile(r"^\s*\d+\.\s+(.+)$", re.MULTILINE)
        questions = question_regex.findall(response_text)
        
        if not questions:
            return jsonify({"error": "No questions generated", "response_text": response_text}), 500
        
        return jsonify({"questions": questions, "prompt": prompt})
    except Exception as e:
        return jsonify({"error": f"Failed to generate questions: {e}"}), 500

@app.route('/save-test-config', methods=['POST'])
def save_test_config():
    data = request.get_json()
    token = str(uuid.uuid4())[:8]
    
    print(f"Generated token: {token}")
    
    candidate_name = data.get('name')
    candidate_email = data.get('email')
    test_entry = {"token": token, **data}

    if os.path.exists(TESTS_JSON):
        with open(TESTS_JSON, "r") as f:
            tests = json.load(f)
    else:
        tests = []
    tests.append(test_entry)
    with open(TESTS_JSON, "w") as f:
        json.dump(tests, f, indent=2)

  
    link = f"https://2325-103-159-68-90.ngrok-free.app/user-test/{token}"  
    
    print(f"Generated link: {link}")

    email_sent = False
    try:
        msg = Message(
            subject="Your Interview Test Link",
            recipients=[candidate_email],
            html=f"""
                <p>Hi {candidate_name},</p>
                <p>Thank you for your interest. Please click the link below to begin your interview test:</p>
                <p><a href="{link}">{link}</a></p>
                <p>Good luck!</p>
            """
        )
        mail.send(msg)
        email_sent = True
    except Exception as e:
        print("Failed to send email:", e)
    return jsonify({"link": link, "emailSent": email_sent})

@app.route('/get-test-config/<token>', methods=['GET'])
def get_test_config(token):
    try: 
        if not os.path.exists(TESTS_JSON):
            return jsonify({"error": "No test data found"}), 404
        with open(TESTS_JSON, 'r') as f:
            tests = json.load(f)
    except Exception as e:
        print("Error loading tests.json:", e)   
        tests = []
    
    print("All tokens in tests.json:", [entry["token"] for entry in tests])         
    if not os.path.exists(TESTS_JSON):
        return jsonify({"error": "No test data found"}), 404
    
    with open(TESTS_JSON, "r") as f:
        tests = json.load(f)
    
    test_entry = next((entry for entry in tests if entry["token"] == token), None)
    if not test_entry:
        return jsonify({"error": "Test not found or expired"}), 404
    
    return jsonify(test_entry)

@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
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

@app.route('/show-all-calibrations', methods=['GET'])
def show_all_calibrations():
    return jsonify(user_calibrations)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)