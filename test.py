import pyautogui
import pyperclip
import time
import sys

pyautogui.FAILSAFE = True

CHROME_WINDOW_COORDS = (1187, 1066)  
TEXT_FIELD_COORDS = (826, 925)    
BTN_1_COORDS = (755, 225)
BTN_2_COORDS = (745, 358)
BTN_3_COORDS = (945, 379)

DELAY_BEFORE_START = 3      
DELAY_AFTER_CLICK = 0.5   
DELAY_BEFORE_PASTE = 0.5   




def click_and_paste(text):
    print(f"\nStarting in {DELAY_BEFORE_START} seconds... (move mouse to top-left corner to abort)")
    time.sleep(DELAY_BEFORE_START)

    print("Clicking on Chrome window...")
    pyautogui.click(CHROME_WINDOW_COORDS[0], CHROME_WINDOW_COORDS[1])
    time.sleep(DELAY_AFTER_CLICK)

    print("Clicking on text field...")
    pyautogui.click(TEXT_FIELD_COORDS[0], TEXT_FIELD_COORDS[1])
    time.sleep(DELAY_AFTER_CLICK)

    pyperclip.copy(text)
    time.sleep(DELAY_BEFORE_PASTE)

    print("Pasting text...")
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(DELAY_AFTER_CLICK)

    print("Pressing Enter...")
    pyautogui.press('enter')

    print("Done!")

def click_btns():
    pyautogui.moveTo(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(0.5)
    pyautogui.click(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(DELAY_AFTER_CLICK)
    pyautogui.click(BTN_2_COORDS[0], BTN_2_COORDS[1])
    time.sleep(DELAY_AFTER_CLICK)
    pyautogui.click(BTN_3_COORDS[0], BTN_3_COORDS[1])
    time.sleep(DELAY_AFTER_CLICK)


def main():
    text_to_paste = input("Enter the text you want to paste into Chrome: ")

    if not text_to_paste.strip():
        print("No text entered. Exiting.")
        return

    click_and_paste(text_to_paste)

    time.sleep(30)

    click_btns()



if __name__ == "__main__":
    main()