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

OPENAI_API_KEY = "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"

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

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
app.config['MAIL_USERNAME'] = 'siddharthsinghpanwar01@gmail.com'      # Replace with your email
app.config['MAIL_PASSWORD'] = 'mkuw gipa gjff eagj'         # Use app-specific password
app.config['MAIL_DEFAULT_SENDER'] = 'siddharthsinghpanwar01@gmail.com'
mail = Mail(app)

@app.route('/process_frame', methods=['POST'])
def process_frame_api():
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

    # Decode image
    try:
        img_array = np.frombuffer(base64.b64decode(img_data), np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({'error': 'Invalid image data'}), 400

    user_state = user_calibrations.get(token)
    if not user_state or not user_state.get("calibrated") or not user_state.get("thresholds"):
        return jsonify({'error': 'Calibration missing for this user'}), 400

    # Per-user frames_state
    frames_state = user_state.get('frames_state')
    if frames_state is None:
        # Default initialization for first frame
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

    # Save updated state for this user
    user_state['frames_state'] = updated_frames_state

    response = {
        "multiple_faces": getattr(detector, "last_multiple_faces", False),
        "head_alert": getattr(detector, "last_head_alert", ""),
        "eye_lr_alert": getattr(detector, "last_eye_lr_alert", ""),
        "eye_ud_alert": getattr(detector, "last_eye_ud_alert", ""),
        "eye_oc_alert": getattr(detector, "last_eye_oc_alert", ""),
    }
    return jsonify(response)

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
    print("Received /save-calibration data:", data)
    token = data.get('token')
    calibration_data = data.get('calibration_data')
    print("Token:", token)
    print("Calibration data:", calibration_data)
    if not token or calibration_data is None:
        return jsonify({'success': False, 'error': 'Missing token or calibration_data'}), 400
    # Store only in user_calibrations, don't need extra dict
    if token not in user_calibrations:
        user_calibrations[token] = {}
    user_calibrations[token]["calibration_data"] = calibration_data
    user_calibrations[token]["calibrated"] = True
    print("\n==== All User Calibrations ====")
    for t, calib in user_calibrations.items():
        if 'thresholds' in calib:
            print(f"User token: {t}, Thresholds: {calib['thresholds']}")
        else:
            print(f"User token: {t}, Calibration Data: {calib}")
    print("==============================\n")

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

@app.route('/show-all-calibrations', methods=['GET'])
def show_all_calibrations():
    return jsonify(user_calibrations)

@app.route('/start_tracking', methods=['POST'])
def start_tracking():
    data = request.get_json()
    token = data.get('token')
    if not token:
        return jsonify({'error': 'Missing token'}), 400

    # Initialize state for this user/test session
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
    detector.clean_images_in_same_folder(folder_path)
    # detector.start_tracking()  # <-- REMOVED; no longer needed in stateless code
    return jsonify({'success': True})

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        print("No audio uploaded!")
        return jsonify({'transcript': '', 'error': 'No audio uploaded!'}), 400
    audio_file = request.files['audio']
    print("Received file:", audio_file.filename)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        audio_file.save(temp_audio)
        temp_audio_path = temp_audio.name

    transcript = ""
    error_msg = ""
    try:
        model = whisper.load_model("base")
        print(f"Transcribing: {temp_audio_path}")
        result = model.transcribe(temp_audio_path)
        print("Transcript:", result["text"])
        transcript = result["text"]
    except Exception as e:
        print("Transcription error:", str(e))
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
    num_questions = data.get('numQuestions', 5)

    if not name or not role:
        return jsonify({"error": "Missing required fields (name/role)."}), 400
    if not num_questions:
        num_questions = 3

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
        print("OpenAI Error:", e)
        return jsonify({"error": f"Failed to generate questions: {e}"}), 500
    return jsonify({"error": "Unknown error occurred"}), 500

@app.route('/save-test-config', methods=['POST'])
def save_test_config():
    data = request.get_json()
    token = str(uuid.uuid4())[:8]
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

    link = f"http://localhost:5173/user-test/{token}"  # Replace with your domain in prod

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
            return jsonify ({ "error": "No test data found"}), 404
        with open(TESTS_JSON, 'r') as f:
            tests = json.load(f)
    except Exception as e:
        print("Error loading tests.json:", e)   
        tests = []
    print("All tokens in tests.json:", [entry["token"] for entry in tests])         
    if not os.path.exists(TESTS_JSON):
        return jsonify({ "error": "No test data found" }), 404
    with open(TESTS_JSON, "r") as f:
        tests = json.load(f)
    test_entry = next((entry for entry in tests if entry["token"] == token), None)
    if not test_entry:
        return jsonify({ "error": "Test not found or expired" }), 404
    return jsonify(test_entry)

@app.route('/save-responses', methods=['POST'])
def save_responses():
    data = request.json
    candidateName = data.get("candidateName")
    role = data.get("role")
    experience = data.get("experience")
    prompt = data.get("prompt")
    responses = data.get("responses")
    safe_name = candidateName.replace(' ', '_')
    candidate_folder = os.path.join("data", "candidates", safe_name)
    os.makedirs(candidate_folder, exist_ok=True)

    if not candidateName or not responses:
        return jsonify({ "error": "Invalid data format" }), 400

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
    return jsonify({ "success": True, "filePath": filepath })

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
    return jsonify({ "success": True })

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
