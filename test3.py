import pyautogui
import time
import json
import random

WAITING_COLOR = "#bfd7fe"
WAITING_PIXEL = (1455, 982)

PROPMT_INPUT = (806, 932)


def is_loading():
    r, g, b = pyautogui.pixel(WAITING_PIXEL[0], WAITING_PIXEL[1])
    if (r, g, b) == (191, 215, 254):
        return True
    else:
        return False

def prompt_one_image(prompt):
    pyautogui.click(PROPMT_INPUT[0], PROPMT_INPUT[1])
    pyautogui.hotkey("ctrl", "v")
    time.sleep(1)
    pyautogui.typewrite(prompt)
    time.sleep(0.2)
    pyautogui.press("enter")

def prompt_img_ai(prompts):
    for prompt in prompts:
        prompt_one_image(prompt)
        time.sleep(5)
        loading = True
        while loading:
            time.sleep(1)
            loading = is_loading()
        time.sleep(random.randint(50, 100)/30)

with open("videos/The Cold War/characters.json", "r", encoding="utf-8") as f:
        prompts_json = json.load(f)
        prompts = []
        for frame in prompts_json:
            prompts.append(frame["prompt"])
        time.sleep(5)
        prompt_img_ai(prompts)