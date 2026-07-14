import time
import pyautogui

time.sleep(5)

THREE_POINT_COORDS = (730, 235)
RENAME_COORDS = (710, 392)

def rename(number_of_characters):
    i=0
    while True:
        pyautogui.moveTo(THREE_POINT_COORDS[0], THREE_POINT_COORDS[1])
        time.sleep(0.1)
        pyautogui.click(THREE_POINT_COORDS[0], THREE_POINT_COORDS[1])
        time.sleep(0.1)
        pyautogui.moveTo(RENAME_COORDS[0], RENAME_COORDS[1])
        time.sleep(0.1)
        pyautogui.click(RENAME_COORDS[0], RENAME_COORDS[1])
        time.sleep(0.1)
        pyautogui.hotkey("ctrl", "a")
        pyautogui.press("backspace")
        pyautogui.typewrite(str(number_of_characters-i))
        pyautogui.press("enter")
        pyautogui.scroll(-319)
        time.sleep(1)
        i +=1 
        if i>number_of_characters:
            break

rename(49)