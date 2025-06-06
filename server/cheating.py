import cv2
import mediapipe as mp
import numpy as np
import time
import base64
import datetime
import os
import json

class CheatingDetector:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh_head = self.mp_face_mesh.FaceMesh(
            refine_landmarks=True,
            min_detection_confidence=0.65,
            min_tracking_confidence=0.5,
            max_num_faces=2
        )
        self.NOSE = 1
        self.LEFT_FACE = 234
        self.RIGHT_FACE = 454

        self.face_mesh_eye_lr = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.45,
            min_tracking_confidence=0.5
        )
        self.LEFT_EYE_LANDMARKS = [33, 133, 160, 158, 159, 144, 153, 145, 154, 163, 7, 246]
        self.FRAMES_THRESHOLD_LR = 5

        self.face_mesh_eye_ud = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.45,
            min_tracking_confidence=0.5
        )
        self.RIGHT_EYE_LANDMARKS = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387]
        self.FRAMES_THRESHOLD_UD = 5
        self.CHEAT_TIME_THRESHOLD_UD = 1

        self.face_mesh_oc = self.mp_face_mesh.FaceMesh(refine_landmarks=True)
        self.LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
        self.EAR_THRESHOLD = 0.17
        self.CLOSED_EYE_TIME_LIMIT = 0.5

        # Only for holding last result to frontend, not session/user specific!
        self.last_multiple_faces = False
        self.last_head_alert = ""
        self.last_eye_lr_alert = ""
        self.last_eye_ud_alert = ""
        self.last_eye_oc_alert = ""

    def process_calibration_step(self, image_data, calibration_step, calibration_data):
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        frame_h, frame_w, _ = frame.shape

        rgb_head = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        head_results = self.face_mesh_head.process(rgb_head)

        steps_list = [
            "Look at the CENTER and click 'Capture'",
            "Look at the LEFT edge and click 'Capture'",
            "Look at the RIGHT edge and click 'Capture'",
            "Look at the TOP edge and click 'Capture'",
            "Look at the BOTTOM edge and click 'Capture'"
        ]

        if calibration_step < len(steps_list):
            if head_results.multi_face_landmarks:
                face_landmarks = head_results.multi_face_landmarks[0]
                landmarks_dict = {idx: (int(lm.x * frame_w), int(lm.y * frame_h))
                                  for idx, lm in enumerate(face_landmarks.landmark)}
                head_x, head_y = landmarks_dict[self.NOSE]
                face_width = abs(landmarks_dict[self.LEFT_FACE][0] - landmarks_dict[self.RIGHT_FACE][0])
                calibration_data[calibration_step] = {"head": (head_x, head_y), "face_width": face_width}
                calibration_step += 1

                if calibration_step >= len(steps_list):
                    head_center = calibration_data[0]["head"]
                    ref_face_width = calibration_data[0]["face_width"]
                    center_tolerance = abs(calibration_data[2]["head"][0] - calibration_data[1]["head"][0]) // 2
                    left = abs(calibration_data[2]["face_width"] - ref_face_width) // 2
                    right = left
                    up = abs(calibration_data[3]["head"][1] - head_center[1]) // 2
                    down = abs(calibration_data[4]["head"][1] - head_center[1]) // 2
                    thresholds = {
                        "left": left,
                        "right": right,
                        "up": up,
                        "down": down,
                        "center_tolerance": center_tolerance
                    }
                    # Store head_center and ref_face_width for process_frame
                    calibration_data["head_center"] = head_center
                    calibration_data["ref_face_width"] = ref_face_width
                    
                    return (
                        "calibration_complete",
                        calibration_step,
                        len(steps_list),
                        steps_list,
                        "Calibration complete!",
                        thresholds
                    )
                else:
                    instruction = steps_list[calibration_step]
                    return (
                        "calibration_in_progress",
                        calibration_step,
                        len(steps_list),
                        steps_list,
                        instruction,
                        None
                    )
            else:
                instruction = steps_list[calibration_step]
                return (
                    "calibration_in_progress",
                    calibration_step,
                    len(steps_list),
                    steps_list,
                    "No face detected! Please retry.",
                    None
                )
        else:
            head_center = calibration_data[0]["head"]
            ref_face_width = calibration_data[0]["face_width"]
            center_tolerance = abs(calibration_data[2]["head"][0] - calibration_data[1]["head"][0]) // 2
            left = abs(calibration_data[2]["face_width"] - ref_face_width) // 2
            right = left
            up = abs(calibration_data[3]["head"][1] - head_center[1]) // 2
            down = abs(calibration_data[4]["head"][1] - head_center[1]) // 2
            thresholds = {
                "left": left,
                "right": right,
                "up": up,
                "down": down,
                "center_tolerance": center_tolerance
            }
            # Store head_center and ref_face_width for process_frame
            calibration_data["head_center"] = head_center
            calibration_data["ref_face_width"] = ref_face_width
            
            return (
                "calibration_complete",
                calibration_step,
                len(steps_list),
                steps_list,
                "Calibration complete!",
                thresholds
            )

    def compute_EAR(self, eye_points, landmarks):
        p2_minus_p6 = np.linalg.norm(np.array(landmarks[eye_points[1]]) - np.array(landmarks[eye_points[5]]))
        p3_minus_p5 = np.linalg.norm(np.array(landmarks[eye_points[2]]) - np.array(landmarks[eye_points[4]]))
        p1_minus_p4 = np.linalg.norm(np.array(landmarks[eye_points[0]]) - np.array(landmarks[eye_points[3]]))
        EAR = (p2_minus_p6 + p3_minus_p5) / (2.0 * p1_minus_p4)
        return EAR

    def clean_images_in_same_folder(self, folder_path):
        image_files = sorted([
            f for f in os.listdir(folder_path)
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif'))
        ])
        total_images = len(image_files)
        if total_images < 25:
            keep_indices = [0]
        else:
            keep_indices = [0, 25]
        keep_filenames = [image_files[i] for i in keep_indices if i < total_images]
        for filename in image_files:
            if filename not in keep_filenames:
                file_path = os.path.join(folder_path, filename)
                os.remove(file_path)
                print(f"Deleted: {filename}")
            else:
                print(f"Kept: {filename}")

    def process_frame(self, frame, calibration_data, thresholds, frames_state, candidate_folder=None):
        # ---- Use dict-based structure for calibration_data ----
        if not calibration_data or "thresholds" not in calibration_data:
            raise ValueError("Calibration not completed: missing calibration_data['thresholds']")

        # Get thresholds from calibration_data
        ct = calibration_data["thresholds"]["center_tolerance"]
        left_thresh = calibration_data["thresholds"]["left"]
        right_thresh = calibration_data["thresholds"]["right"]
        up_thresh = calibration_data["thresholds"]["up"]
        down_thresh = calibration_data["thresholds"]["down"]

        # Get stored calibration values
        head_center = calibration_data.get("head_center", None)
        ref_face_width = calibration_data.get("ref_face_width", None)

        frame_h, frame_w, _ = frame.shape
        any_alert = False

        # 1. Get all user/session state from frames_state dict
        left_frames_outside = frames_state.get('left_frames_outside', 0)
        right_frames_outside = frames_state.get('right_frames_outside', 0)
        frames_no_pupil_ud = frames_state.get('frames_no_pupil_ud', 0)
        cheat_start_time_ud = frames_state.get('cheat_start_time_ud', None)
        left_eye_closed_start_time = frames_state.get('left_eye_closed_start_time', None)
        right_eye_closed_start_time = frames_state.get('right_eye_closed_start_time', None)
        left_cheating_detected = frames_state.get('left_cheating_detected', False)
        right_cheating_detected = frames_state.get('right_cheating_detected', False)
        warning_timer_start = frames_state.get('warning_timer_start', None)
        central_message_start = frames_state.get('central_message_start', None)
        warning_active_start = frames_state.get('warning_active_start', None)
        warning_count = frames_state.get('warning_count', 0)

        # --- Head Tracking ---
        head_alert = ""
        rgb_head = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        head_results = self.face_mesh_head.process(rgb_head)
        if head_results.multi_face_landmarks and len(head_results.multi_face_landmarks) > 1:
            self.last_multiple_faces = True
            cv2.putText(frame, "WARNING: More than one person detected!", (50, frame_h - 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            if candidate_folder:
                filename = os.path.join(candidate_folder, f"multi_person_{timestamp}.jpg")
                cv2.imwrite(filename, frame)
        else:
            self.last_multiple_faces = False

        if head_results.multi_face_landmarks:
            for face_landmarks in head_results.multi_face_landmarks:
                landmarks_dict = {idx: (int(lm.x * frame_w), int(lm.y * frame_h))
                                  for idx, lm in enumerate(face_landmarks.landmark)}
                head_x, head_y = landmarks_dict[self.NOSE]
                face_width = abs(landmarks_dict[self.LEFT_FACE][0] - landmarks_dict[self.RIGHT_FACE][0])

                # Only run the rest if head_center and ref_face_width are available
                if head_center is not None and ref_face_width is not None:
                    head_movement_allowed = ((head_center[0] - ct) < head_x < (head_center[0] + ct)) and \
                                            ((head_center[1] - ct) < head_y < (head_center[1] + ct))
                    face_rotation_left = (face_width - ref_face_width) > left_thresh
                    face_rotation_right = (ref_face_width - face_width) > right_thresh
                    face_rotation_up = (head_center[1] - head_y) > up_thresh
                    face_rotation_down = (head_y - head_center[1]) > down_thresh

                    if not head_movement_allowed and (face_rotation_left or face_rotation_right or face_rotation_up or face_rotation_down):
                        head_alert = "HEAD CHEATING ALERT!"
                        any_alert = True
                    else:
                        head_alert = "Head OK"
                else:
                    head_alert = "Calibration error: head_center or ref_face_width not set"
                    any_alert = True
                self.last_head_alert = head_alert
                break

        # --- Eye LR Detection ---
        eye_lr_alert = ""
        rgb_eye_lr = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        eye_lr_results = self.face_mesh_eye_lr.process(rgb_eye_lr)
        if eye_lr_results.multi_face_landmarks:
            face_landmarks = eye_lr_results.multi_face_landmarks[0]
            left_eye_points = [(int(lm.x * frame_w), int(lm.y * frame_h))
                               for idx, lm in enumerate(face_landmarks.landmark) if idx in self.LEFT_EYE_LANDMARKS]
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
                            if left_frames_outside > self.FRAMES_THRESHOLD_LR:
                                eye_lr_alert = "EYE LR CHEATING ALERT!"
                                any_alert = True
                            else:
                                eye_lr_alert = "Eye LR OK"
        self.last_eye_lr_alert = eye_lr_alert

        # --- Eye UD Detection ---
        eye_ud_alert = ""
        rgb_eye_ud = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        eye_ud_results = self.face_mesh_eye_ud.process(rgb_eye_ud)
        if eye_ud_results.multi_face_landmarks:
            face_landmarks = eye_ud_results.multi_face_landmarks[0]
            right_eye_points = [(int(lm.x * frame_w), int(lm.y * frame_h))
                                for idx, lm in enumerate(face_landmarks.landmark) if idx in self.RIGHT_EYE_LANDMARKS]
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
                if right_frames_outside > self.FRAMES_THRESHOLD_UD or frames_no_pupil_ud > self.FRAMES_THRESHOLD_UD:
                    if cheat_start_time_ud is None:
                        cheat_start_time_ud = time.time()
                    elif time.time() - cheat_start_time_ud >= self.CHEAT_TIME_THRESHOLD_UD:
                        eye_ud_alert = "EYE UD CHEATING ALERT!"
                        any_alert = True
                else:
                    cheat_start_time_ud = None
                    eye_ud_alert = "Eye UD OK"
        self.last_eye_ud_alert = eye_ud_alert

        # --- Eye Open/Close Detection ---
        eye_oc_alert = ""
        rgb_oc = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        oc_results = self.face_mesh_oc.process(rgb_oc)
        if oc_results.multi_face_landmarks:
            landmarks_oc = [(int(lm.x * frame_w), int(lm.y * frame_h))
                            for lm in oc_results.multi_face_landmarks[0].landmark]
            left_EAR = self.compute_EAR(self.LEFT_EYE_INDICES, landmarks_oc)
            right_EAR = self.compute_EAR(self.RIGHT_EYE_INDICES, landmarks_oc)
            if left_EAR < self.EAR_THRESHOLD:
                if left_eye_closed_start_time is None:
                    left_eye_closed_start_time = time.time()
                elif time.time() - left_eye_closed_start_time > self.CLOSED_EYE_TIME_LIMIT:
                    left_cheating_detected = True
            else:
                left_eye_closed_start_time = None
                left_cheating_detected = False
            if right_EAR < self.EAR_THRESHOLD:
                if right_eye_closed_start_time is None:
                    right_eye_closed_start_time = time.time()
                elif time.time() - right_eye_closed_start_time > self.CLOSED_EYE_TIME_LIMIT:
                    right_cheating_detected = True
            else:
                right_eye_closed_start_time = None
                right_cheating_detected = False
            if left_cheating_detected or right_cheating_detected:
                eye_oc_alert = "EYE OC CHEATING ALERT!"
                any_alert = True
            else:
                eye_oc_alert = "Eye OC OK"
        self.last_eye_oc_alert = eye_oc_alert

        # --- Central Warning State ---
        now = time.time()
        if any_alert:
            if warning_timer_start is None:
                warning_timer_start = now
            elif now - warning_timer_start > 2 and central_message_start is None:
                central_message_start = now
        else:
            warning_timer_start = None
            central_message_start = None

        if any_alert:
            if warning_active_start is None:
                warning_active_start = now
            elif now - warning_active_start >= 3:
                warning_count += 1
                warning_active_start = None
                if candidate_folder:
                    warning_file = os.path.join(candidate_folder, "warning_count.json")
                    with open(warning_file, "w") as f:
                        json.dump({"warning_count": warning_count}, f)
        else:
            warning_active_start = None

        # Save all state back for the next frame (stateless design)
        frames_state['left_frames_outside'] = left_frames_outside
        frames_state['right_frames_outside'] = right_frames_outside
        frames_state['frames_no_pupil_ud'] = frames_no_pupil_ud
        frames_state['cheat_start_time_ud'] = cheat_start_time_ud
        frames_state['left_eye_closed_start_time'] = left_eye_closed_start_time
        frames_state['right_eye_closed_start_time'] = right_eye_closed_start_time
        frames_state['left_cheating_detected'] = left_cheating_detected
        frames_state['right_cheating_detected'] = right_cheating_detected
        frames_state['warning_timer_start'] = warning_timer_start
        frames_state['central_message_start'] = central_message_start
        frames_state['warning_active_start'] = warning_active_start
        frames_state['warning_count'] = warning_count

        return frame, frames_state