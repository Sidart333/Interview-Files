from flask import Flask, Response, render_template, jsonify, request
import cv2
from cheating import CheatingDetector
from flask_cors import CORS
import uuid 
import os
import json
import datetime
import openai
import re
import numpy as np
import base64

app = Flask(__name__)
CORS(app)

DATA_DIR = "data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

TESTS_JSON = os.path.join(DATA_DIR, "tests.json")
RESPONSES_DIR = os.path.join(DATA_DIR, "responses")
if not os.path.exists(RESPONSES_DIR):
    os.makedirs(RESPONSES_DIR)

# Instantiate the CheatingDetector
detector = CheatingDetector()

# Initialize video capture
# cap = cv2.VideoCapture(0)

# def generate_frames():
#     while cap.isOpened():
#         ret, frame = cap.read()
#         if not ret:
#             break
#         frame = cv2.flip(frame, 1)
#         frame = detector.process_frame(frame)
#         ret, buffer = cv2.imencode('.jpg', frame)
#         frame = buffer.tobytes()
#         yield (b'--frame\r\n'
#                b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

# @app.route('/video_feed')
# def video_feed():
#     return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/process_frame', methods=['POST'])
def process_frame_api():
    data = request.get_json()
    print("Incoming JSON:", data)
    img_data = None
    if data:
        img_data = data.get('image')
    print("Received image (first 100 chars):", img_data[:100] if img_data else None)
    if not img_data:
        return jsonify({'error': 'No image provided'}), 400
    img_data = data.get('image') # The base64 image string sent from the frontend
    
    
    

    if not img_data:
        return jsonify({'error': 'No image provided'}), 400

    if "," in img_data:
        img_data = img_data.split(",")[1]

    # Decode base64 to numpy array, then to OpenCV frame
    try:
        img_array = np.frombuffer(base64.b64decode(img_data), np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({'error': 'Invalid image data'}), 400

    # Process frame with your detector
    processed_frame = detector.process_frame(frame)

    # Prepare the response using last_* attributes set by your detection code
    response = {
        "multiple_faces": getattr(detector, "last_multiple_faces", False),
        "head_alert": getattr(detector, "last_head_alert", ""),
        "eye_lr_alert": getattr(detector, "last_eye_lr_alert", ""),
        "eye_ud_alert": getattr(detector, "last_eye_ud_alert", ""),
        "eye_oc_alert": getattr(detector, "last_eye_oc_alert", ""),
    }

    # Optional: send processed frame back as base64 if you want to display overlays
    # _, buffer = cv2.imencode('.jpg', processed_frame)
    # response["annotated_frame"] = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    return jsonify(response)

@app.route('/advance_calibration', methods=['POST'])
def advance_calibration():
    detector.advance_calibration()
    data = request.get_json()
    image_data = data.get('image')
    if not image_data:
        return jsonify({"status": "error", "message": "No image data provided"}), 400
    
    status, current_step, total_steps, steps, instruction = detector.process_calibration_step(image_data)
    return jsonify({
        "status": status,
        "current_step": current_step,
        "total_steps": total_steps,
        "steps": steps,
        "instruction": instruction
    })

@app.route('/start_tracking', methods=['POST'])
def start_tracking():
    folder_path = './warnings'
    detector.clean_images_in_same_folder(folder_path)
    detector.start_tracking()
    return 'OK'



@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    data = request.get_json()
    name = data.get('name')
    role = data.get('role')
    experience = data.get('experience')
    num_questions = data.get('numQuestions', 3)

    if not name or not role or not experience or not num_questions:
        return jsonify({"error": "Missing required fields."}), 400

    prompt = (
        f"You are an AI interviewer conducting a structured technical interview at CapsiTech for {name}, "
        f"who is applying for a {role} position with {experience} of experience.\n\n"
        f"Generate exactly {num_questions} interview questions numbered 1 through {num_questions}. \n"
        f"DO NOT include ANY introductory text or explanations.\n"
        f"DO NOT include ANY conclusion or summary.\n"
        f"ONLY provide the numbered questions, one per line, starting with '1. ' and so on.\n"
        f"Each question should be technical and relevant to the {role} role."
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

    # Just in case - unreachable, but prevents 'missing return' warning
    return jsonify({"error": "Unknown error occurred"}), 500



@app.route('/save-test-config', methods=['POST'])
def save_test_config():
    test_data = request.json
    token = str(uuid.uuid4())[:8]
    test_entry = { "token": token, **test_data }
    # Save to tests.json (list of all tests)
    if os.path.exists(TESTS_JSON):
        with open(TESTS_JSON, "r") as f:
            tests = json.load(f)
    else:
        tests = []
    tests.append(test_entry)
    with open(TESTS_JSON, "w") as f:
        json.dump(tests, f, indent=2)
    return jsonify({ "message": "Test config saved", "token": token })

@app.route('/get-test-config/<token>', methods=['GET'])
def get_test_config(token):
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

    if not candidateName or not responses:
        return jsonify({ "error": "Invalid data format" }), 400

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"interview_{candidateName.replace(' ', '_')}_{timestamp}.json"
    filepath = os.path.join(RESPONSES_DIR, filename)

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

@app.route('/get_warning', methods=['GET'])
def get_warning():
    warning_data = {
        "multiple_faces": detector.last_multiple_faces,
        "head_alert": detector.last_head_alert,
        "eye_lr_alert": detector.last_eye_lr_alert,
        "eye_ud_alert": detector.last_eye_ud_alert,
        "eye_oc_alert": detector.last_eye_oc_alert,
    }
    return jsonify(warning_data)

# -- Other endpoints for generating questions, saving config, etc. -- #
# (unchanged from your code above, can copy as needed)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port = 5000, debug=True, threaded=True)
