import pyautogui
import pyperclip
import time
import sys
import json

PROMPTS_FILE = "frames.json"

CHROME_COORDS = (1187, 1066)



pyautogui.FAILSAFE = True

def open_chrome():
    pyautogui.click(CHROME_COORDS[0], CHROME_COORDS[1])
    time.sleep(1)

def get_prompts():
    with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
        prompts_json = json.load(f)
        prompts = []
        for frame in prompts_json:
            prompts.append(frame["prompt"])
        return prompts#
    

