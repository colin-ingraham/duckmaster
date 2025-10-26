from picamera2 import Picamera2
from time import sleep
import base64
import io
import json
import requests
from flask import Flask, request, jsonify
from PIL import Image
import threading

IMAGE_PATH = "dice_roll.jpeg"
IMAGE_RESOLUTION = (1600, 1200)
SERVER_URL = "http://10.72.0.115:3001/api/read-dice"
PI_PORT = 5000

def initialize_camera():
    global picam2
    picam2 = Picamera2()
    camera_config = picam2.create_still_configuration(main={"size": IMAGE_RESOLUTION})
    picam2.configure(camera_config)
    picam2.start_preview()
    sleep(2)
    picam2.set_controls({"AfMode": 2, "AfTrigger": 0})
    picam2.start()
    
def capturePhoto():
        
    buffer = io.BytesIO()
    picam2.capture_file(buffer, format='jpeg')
    buffer.seek(0)
    
    with open('my_saved_image.jpg', 'wb') as f:
        f.write(buffer.read())
        
    
    base64_encoded_data = base64.b64encode(buffer.getvalue())
    base64_string = base64_encoded_data.decode('utf-8')
    data_uri = f"data:image/jpeg;base64,{base64_string}"
    return data_uri
    

def send_image_to_server(base64_image_data):
    if base64_image_data:
        payload = {"imageData": base64_image_data}
        try:
            response = requests.post(SERVER_URL, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                dice_value = result.get('diceValue')
                print(dice_value)
            else:
                print(f"Error! Status Code: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print("Network Error!")
    else:
        print("Failed to get image data.")

app = Flask(__name__)

@app.route('/trigger-capture', methods=['POST'])
def handle_trigger():
    print("Received trigger request!")
    thread = threading.Thread(target=capture_and_send_async)
    thread.start()
    return jsonify({"message": "Capture process initiated."}), 202

def capture_and_send_async():
    base64_image = capturePhoto()
    if base64_image:
        send_image_to_server(base64_image)
    else:
        print("Capture or encoding failed, not sending.")
        
if __name__ == "__main__":
    print("Starting RPI listener server...")
    initialize_camera()
    app.run(host='0.0.0.0', port=PI_PORT)
    picam2.stop_preview()
    picam2.stop()
    picam2.close()
