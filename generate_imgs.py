import pyautogui
import time
import json
import random

PROMPTS_FILE = "frames.json"

CHROME_COORDS = (1187, 1066)
TEXT_FIELD_COORDS = (826, 925)
BTN_1_COORDS = (1820, 157)
BTN_2_COORDS = (1738, 201)
TEXT_LOADING_COORDS = (757, 227)

WAITING_TIME = 60



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
    
def click_on_textbox():
    pyautogui.click(TEXT_FIELD_COORDS[0], TEXT_FIELD_COORDS[1])
    time.sleep(1)

def prompt_flow(prompts):
    for prompt in prompts:
        pyautogui.typewrite(prompt)
        time.sleep(random.randrange(2, 20)/10)
        pyautogui.press("enter")
        time.sleep(random.randrange(2, 20)/10)

def download_zip():
    pyautogui.moveTo(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(0.5)
    pyautogui.click(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(0.5)
    pyautogui.moveTo(BTN_2_COORDS[0], BTN_2_COORDS[1])
    time.sleep(0.5)
    pyautogui.click(BTN_2_COORDS[0], BTN_2_COORDS[1])



def wait_for_generation(prompts):
    addition_time = len(prompts)*3
    time.sleep(WAITING_TIME + addition_time)


def main():
    prompts = get_prompts()
    open_chrome()
    click_on_textbox()
    prompt_flow(prompts)
    wait_for_generation(prompts)
    download_zip()


if __name__ == "__main__":
    main()
