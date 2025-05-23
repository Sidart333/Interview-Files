from flask import Flask, Response, render_template, request
import cv2
import mediapipe as mp
import numpy as np
import time
from threading import Lock
from pathlib import Path
from flask_cors import CORS
from flask import jsonify
import base64
import json
from datetime import datetime
from pathlib import Path
import time
import os
import uuid
import re
import openai


WARNING_DIR = Path("warnings")
WARNING_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
CORS(app)

DATA_DIR = "data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

TESTS_JSON = os.path.join(DATA_DIR, "tests.json")
RESPONSES_DIR = os.path.join(DATA_DIR, "responses")
if not os.path.exists(RESPONSES_DIR):
    os.makedirs(RESPONSES_DIR)



# Initialize MediaPipe modules
mp_face_mesh = mp.solutions.face_mesh


last_warnings = {
    "multiple_faces": False,
    "head_alert": "",
    "eye_lr_alert": "",
    "eye_ud_alert": "",
    "eye_oc_alert": "",
}


# Module 1: Head Tracking
face_mesh_head = mp_face_mesh.FaceMesh(
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
    max_num_faces=2
)
NOSE = 1
LEFT_FACE = 234
RIGHT_FACE = 454

# Module 2: Eye Left/Right Detection
face_mesh_eye_lr = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.45,
    min_tracking_confidence=0.5
)
LEFT_EYE_LANDMARKS = [33, 133, 160, 158, 159, 144, 153, 145, 154, 163, 7, 246]
FRAMES_THRESHOLD_LR = 5

# Module 3: Right Eye Up/Down Detection
face_mesh_eye_ud = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.45,
    min_tracking_confidence=0.5
)
RIGHT_EYE_LANDMARKS = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387]
FRAMES_THRESHOLD_UD = 5
CHEAT_TIME_THRESHOLD_UD = 1  # seconds

# Module 4: Eye Open/Close Detection
face_mesh_oc = mp_face_mesh.FaceMesh(refine_landmarks=True)
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
EAR_THRESHOLD = 0.25
CLOSED_EYE_TIME_LIMIT = 0.5  # seconds

# Calibration variables
calibration_lock = Lock()
calibrated = False
calibration_step = 0
calibration_data = {}
capture_calibration = False
tracking_started = False


calibration_steps = [
    "Look at the CENTER and click 'Capture'",
    "Look at the LEFT edge and click 'Capture'",
    "Look at the RIGHT edge and click 'Capture'",
    "Look at the TOP edge and click 'Capture'",
    "Look at the BOTTOM edge and click 'Capture'"
]




# Thresholds (computed after calibration)
head_movement_tolerance = None
face_rotation_threshold_left = None
face_rotation_threshold_right = None
face_rotation_threshold_up = None
face_rotation_threshold_down = None

# Tracking variables
left_frames_outside = 0
right_frames_outside = 0
frames_no_pupil_ud = 0
cheat_start_time_ud = None
left_eye_closed_start_time = None
right_eye_closed_start_time = None
left_cheating_detected = False
right_cheating_detected = False
warning_timer_start = None
central_message_start = None

cap = cv2.VideoCapture(0)

def compute_EAR(eye_points, landmarks):
    p2_minus_p6 = np.linalg.norm(np.array(landmarks[eye_points[1]]) - np.array(landmarks[eye_points[5]]))
    p3_minus_p5 = np.linalg.norm(np.array(landmarks[eye_points[2]]) - np.array(landmarks[eye_points[4]]))
    p1_minus_p4 = np.linalg.norm(np.array(landmarks[eye_points[0]]) - np.array(landmarks[eye_points[3]]))
    EAR = (p2_minus_p6 + p3_minus_p5) / (2.0 * p1_minus_p4)
    return EAR

def process_frame(frame):
    global calibrated, calibration_step, calibration_data, capture_calibration, tracking_started
    global head_movement_tolerance, face_rotation_threshold_left, face_rotation_threshold_right
    global face_rotation_threshold_up, face_rotation_threshold_down
    global left_frames_outside, right_frames_outside, frames_no_pupil_ud, cheat_start_time_ud
    global left_eye_closed_start_time, right_eye_closed_start_time, left_cheating_detected, right_cheating_detected
    global warning_timer_start, central_message_start

    frame_h, frame_w, _ = frame.shape
    any_alert = False

    # Module 1: Head Tracking
    head_alert = ""
    rgb_head = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    head_results = face_mesh_head.process(rgb_head)
    
    if head_results.multi_face_landmarks and len(head_results.multi_face_landmarks) > 1:
        cv2.putText(frame, "WARNING: More than one person detected!", (50, frame_h - 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = WARNING_DIR / f"multi_person_{timestamp}.jpg"
        cv2.imwrite(str(filename), frame)
        

    if head_results.multi_face_landmarks:
        for face_landmarks in head_results.multi_face_landmarks:
            landmarks_dict = {idx: (int(lm.x * frame_w), int(lm.y * frame_h))
                              for idx, lm in enumerate(face_landmarks.landmark)}
            head_x, head_y = landmarks_dict[NOSE]
            face_width = abs(landmarks_dict[LEFT_FACE][0] - landmarks_dict[RIGHT_FACE][0])

            if not calibrated:
                with calibration_lock:
                    if capture_calibration and calibration_step < len(calibration_steps):
                        calibration_data[calibration_step] = {"head": (head_x, head_y), "face_width": face_width}
                        calibration_step += 1
                        if calibration_step >= len(calibration_steps):
                            # Compute thresholds once all steps captured
                            head_center = calibration_data[0]["head"]
                            ref_face_width = calibration_data[0]["face_width"]
                            head_movement_tolerance = abs(calibration_data[2]["head"][0] - calibration_data[1]["head"][0]) // 2
                            face_rotation_threshold_left = abs(calibration_data[2]["face_width"] - ref_face_width) // 2
                            face_rotation_threshold_right = face_rotation_threshold_left
                            face_rotation_threshold_up = abs(calibration_data[3]["head"][1] - head_center[1]) // 2
                            face_rotation_threshold_down = abs(calibration_data[4]["head"][1] - head_center[1]) // 2
                            calibrated = True
                        capture_calibration = False
                # Show calibration instructions or completion message
                if calibration_step < len(calibration_steps):
                    instruction = calibration_steps[calibration_step]
                else:
                    instruction = "Calibration complete. Click 'Start Tracking'"
                cv2.putText(frame, instruction, (50, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            elif not tracking_started:
                cv2.putText(frame, "Click 'Start Tracking' to begin", (50, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
            else:
                # Tracking logic omitted for brevity
                head_center = calibration_data[0]["head"]
                ref_face_width = calibration_data[0]["face_width"]
                head_movement_allowed = ((head_center[0] - head_movement_tolerance) < head_x < (head_center[0] + head_movement_tolerance)) and \
                                        ((head_center[1] - head_movement_tolerance) < head_y < (head_center[1] + head_movement_tolerance))
                face_rotation_left = (face_width - ref_face_width) > face_rotation_threshold_left
                face_rotation_right = (ref_face_width - face_width) > face_rotation_threshold_right
                face_rotation_up = (head_center[1] - head_y) > face_rotation_threshold_up
                face_rotation_down = (head_y - head_center[1]) > face_rotation_threshold_down
                if not head_movement_allowed and (face_rotation_left or face_rotation_right or face_rotation_up or face_rotation_down):
                    head_alert = "HEAD CHEATING ALERT!"
                    any_alert = True
                else:
                    head_alert = "Head OK"
            break

    # Module 2: Eye Left/Right Detection
    eye_lr_alert = ""
    rgb_eye_lr = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    eye_lr_results = face_mesh_eye_lr.process(rgb_eye_lr)
    if eye_lr_results.multi_face_landmarks and tracking_started:
        face_landmarks = eye_lr_results.multi_face_landmarks[0]
        left_eye_points = [(int(lm.x * frame_w), int(lm.y * frame_h))
                           for idx, lm in enumerate(face_landmarks.landmark) if idx in LEFT_EYE_LANDMARKS]
        if left_eye_points:
            x_coords, y_coords = zip(*left_eye_points)
            min_x, max_x = min(x_coords), max(x_coords)
            min_y, max_y = min(y_coords), max(y_coords)
            padding = 5
            roi = frame[max(0, min_y - padding):min(frame_h, max_y + padding),
                        max(0, min_x - padding):min(frame_w, max_x + padding)]
            if roi.size != 0:
                gray_eye = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                _, thresh_eye = cv2.threshold(gray_eye, 50, 255, cv2.THRESH_BINARY_INV)
                contours, _ = cv2.findContours(thresh_eye, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    c = max(contours, key=cv2.contourArea)
                    M = cv2.moments(c)
                    if M["m00"] != 0:
                        pupil_x_roi = int(M["m10"] / M["m00"])
                        pupil_x_global = min_x - padding + pupil_x_roi
                        eye_center_x = (min_x + max_x) // 2
                        eye_width = max_x - min_x
                        EXTREME_THRESHOLD_LR = 0.2 * (eye_width / 2)
                        if abs(pupil_x_global - eye_center_x) > EXTREME_THRESHOLD_LR:
                            left_frames_outside += 1
                        else:
                            left_frames_outside = 0
                        if left_frames_outside > FRAMES_THRESHOLD_LR:
                            eye_lr_alert = "EYE LR CHEATING ALERT!"
                            any_alert = True
                        else:
                            eye_lr_alert = "Eye LR OK"

    # Module 3: Right Eye Up/Down Detection
    eye_ud_alert = ""
    rgb_eye_ud = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    eye_ud_results = face_mesh_eye_ud.process(rgb_eye_ud)
    if eye_ud_results.multi_face_landmarks and tracking_started:
        face_landmarks = eye_ud_results.multi_face_landmarks[0]
        right_eye_points = [(int(lm.x * frame_w), int(lm.y * frame_h))
                            for idx, lm in enumerate(face_landmarks.landmark) if idx in RIGHT_EYE_LANDMARKS]
        if right_eye_points:
            x_coords, y_coords = zip(*right_eye_points)
            min_y, max_y = min(y_coords), max(y_coords)
            eye_height = max_y - min_y
            EXTREME_THRESHOLD_UD = eye_height * 0.25
            padding = 5
            roi = frame[max(0, min_y - padding):min(frame_h, max_y + padding),
                        max(0, min(x_coords) - padding):min(frame_w, max(x_coords) + padding)]
            pupil_detected = False
            if roi.size != 0:
                gray_eye_ud = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                _, thresh_eye_ud = cv2.threshold(gray_eye_ud, 50, 255, cv2.THRESH_BINARY_INV)
                contours, _ = cv2.findContours(thresh_eye_ud, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    c = max(contours, key=cv2.contourArea)
                    M = cv2.moments(c)
                    if M["m00"] != 0:
                        pupil_y_roi = int(M["m01"] / M["m00"])
                        pupil_y_global = min_y - padding + pupil_y_roi
                        eye_center_y = (min_y + max_y) // 2
                        dist_from_center_ud = abs(pupil_y_global - eye_center_y)
                        pupil_detected = True
                        if dist_from_center_ud > EXTREME_THRESHOLD_UD:
                            right_frames_outside += 1
                        else:
                            right_frames_outside = 0
            if not pupil_detected:
                frames_no_pupil_ud += 1
            else:
                frames_no_pupil_ud = 0
            if right_frames_outside > FRAMES_THRESHOLD_UD or frames_no_pupil_ud > FRAMES_THRESHOLD_UD:
                if cheat_start_time_ud is None:
                    cheat_start_time_ud = time.time()
                elif time.time() - cheat_start_time_ud >= CHEAT_TIME_THRESHOLD_UD:
                    eye_ud_alert = "EYE UD CHEATING ALERT!"
                    any_alert = True
            else:
                cheat_start_time_ud = None
                eye_ud_alert = "Eye UD OK"

    # Module 4: Eye Open/Close Detection
    eye_oc_alert = ""
    rgb_oc = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    oc_results = face_mesh_oc.process(rgb_oc)
    if oc_results.multi_face_landmarks and tracking_started:
        landmarks_oc = [(int(lm.x * frame_w), int(lm.y * frame_h))
                        for lm in oc_results.multi_face_landmarks[0].landmark]
        left_EAR = compute_EAR(LEFT_EYE_INDICES, landmarks_oc)
        right_EAR = compute_EAR(RIGHT_EYE_INDICES, landmarks_oc)
        if left_EAR < EAR_THRESHOLD:
            if left_eye_closed_start_time is None:
                left_eye_closed_start_time = time.time()
            elif time.time() - left_eye_closed_start_time > CLOSED_EYE_TIME_LIMIT:
                left_cheating_detected = True
        else:
            left_eye_closed_start_time = None
            left_cheating_detected = False
        if right_EAR < EAR_THRESHOLD:
            if right_eye_closed_start_time is None:
                right_eye_closed_start_time = time.time()
            elif time.time() - right_eye_closed_start_time > CLOSED_EYE_TIME_LIMIT:
                right_cheating_detected = True
        else:
            right_eye_closed_start_time = None
            right_cheating_detected = False
        if left_cheating_detected or right_cheating_detected:
            eye_oc_alert = "EYE OC CHEATING ALERT!"
            any_alert = True
        else:
            eye_oc_alert = "Eye OC OK"

    # Display Alerts
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.0
    thickness = 0
    text_color_good = (0, 255, 0)
    text_color_bad = (0, 0, 255)
    alerts = [
        ("Head: " + head_alert, text_color_bad if "ALERT" in head_alert else text_color_good),
        ("Eye LR: " + eye_lr_alert, text_color_bad if "ALERT" in eye_lr_alert else text_color_good),
        ("Eye UD: " + eye_ud_alert, text_color_bad if "ALERT" in eye_ud_alert else text_color_good),
        ("Eye OC: " + eye_oc_alert, text_color_bad if "ALERT" in eye_oc_alert else text_color_good),
    ]
    start_y = 30
    for i, (txt, clr) in enumerate(alerts):
        (w_txt, _), _ = cv2.getTextSize(txt, font, font_scale, thickness)
        pos = (frame_w - w_txt - 10, start_y + i * 30)
        cv2.putText(frame, txt, pos, font, font_scale, clr, thickness)

    # Central Warning
    now = time.time()
    if any_alert:
        if warning_timer_start is None:
            warning_timer_start = now
        elif now - warning_timer_start > 2 and central_message_start is None:
            central_message_start = now
    else:
        warning_timer_start = None
        central_message_start = None
    if central_message_start and now - central_message_start <= 2:
        warning_text = "WARNING"
        wf, wt = 1.5, 3
        (w, h), _ = cv2.getTextSize(warning_text, font, wf, wt)
        cx, cy = (frame_w - w) // 2, (frame_h + h) // 2
        cv2.putText(frame, warning_text, (cx, cy), font, wf, (0, 0, 255), wt)
        
        last_warnings["multiple_faces"] = head_results.multi_face_landmarks and len(head_results.multi_face_landmarks) > 1
        last_warnings["head_alert"] = head_alert
        last_warnings["eye_lr_alert"] = eye_lr_alert
        last_warnings["eye_ud_alert"] = eye_ud_alert
        last_warnings["eye_oc_alert"] = eye_oc_alert


    return frame

def clean_images_in_same_folder(folder_path):
    # Get sorted list of image files
    image_files = sorted([
        f for f in os.listdir(folder_path)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif'))
    ])

    total_images = len(image_files)

    # Determine which images to keep
    if total_images < 25:
        keep_indices = [0]
    else:
        keep_indices = [0, 25]  # index 0 is first image, 25 is 26th image

    keep_filenames = [
        image_files[i] for i in keep_indices if i < total_images
    ]

    # Delete all other images
    for filename in image_files:
        if filename not in keep_filenames:
            file_path = os.path.join(folder_path, filename)
            os.remove(file_path)
            print(f"Deleted: {filename}")
        else:
            print(f"Kept: {filename}")

# Example usage
folder_path = './warnings'  # replace with your folder path
clean_images_in_same_folder(folder_path)



def generate_frames():
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        frame = process_frame(frame)
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/advance_calibration', methods=['POST'])
def advance_calibration():
    global calibration_step, calibration_data, calibrated

    # Get the image from the request
    data = request.get_json()
    img_data = data.get("image")
    if not img_data:
        return jsonify({"status": "error", "message": "No image provided"}), 400

    # Decode base64 image
    try:
        encoded_data = img_data.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Invalid image data: {e}"}), 400

    frame_h, frame_w, _ = frame.shape

    # Find face landmarks
    rgb_head = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    head_results = face_mesh_head.process(rgb_head)

    if not head_results.multi_face_landmarks:
        return jsonify({
            "status": "error",
            "message": "No face detected. Please ensure your face is visible and try again.",
            "current_step": calibration_step,
            "steps": calibration_steps,
            "total_steps": len(calibration_steps),
        })

    # Only process the first face found
    face_landmarks = head_results.multi_face_landmarks[0]
    landmarks_dict = {idx: (int(lm.x * frame_w), int(lm.y * frame_h))
                      for idx, lm in enumerate(face_landmarks.landmark)}
    head_x, head_y = landmarks_dict[NOSE]
    face_width = abs(landmarks_dict[LEFT_FACE][0] - landmarks_dict[RIGHT_FACE][0])

    # Save this step
    calibration_data[calibration_step] = {
        "head": (head_x, head_y),
        "face_width": face_width,
    }
    calibration_step += 1

    if calibration_step >= len(calibration_steps):
        # Finalize calibration thresholds
        head_center = calibration_data[0]["head"]
        ref_face_width = calibration_data[0]["face_width"]
        global head_movement_tolerance, face_rotation_threshold_left, face_rotation_threshold_right
        global face_rotation_threshold_up, face_rotation_threshold_down

        head_movement_tolerance = abs(calibration_data[2]["head"][0] - calibration_data[1]["head"][0]) // 2
        face_rotation_threshold_left = abs(calibration_data[2]["face_width"] - ref_face_width) // 2
        face_rotation_threshold_right = face_rotation_threshold_left
        face_rotation_threshold_up = abs(calibration_data[3]["head"][1] - head_center[1]) // 2
        face_rotation_threshold_down = abs(calibration_data[4]["head"][1] - head_center[1]) // 2
        calibrated = True

        return jsonify({
            "status": "calibration_complete",
            "steps": calibration_steps,
            "current_step": calibration_step,
            "total_steps": len(calibration_steps),
        })

    return jsonify({
        "status": "calibration_in_progress",
        "steps": calibration_steps,
        "current_step": calibration_step,
        "total_steps": len(calibration_steps),
    })


@app.route('/start_tracking', methods=['POST'])
def start_tracking():
    global tracking_started, calibration_data
    print(calibration_data)
    tracking_started = True
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

# @app.route('/')
# def index():
#     return render_template('index.html')

@app.route('/warnings')
def get_warnings():
    return jsonify(last_warnings)


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, threaded=True)