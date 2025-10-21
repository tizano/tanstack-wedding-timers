# User Guide - Wedding Timers Application

## 📖 Introduction

This application allows you to manage and display timers for your wedding event. It consists of two parts:

- **The main application**: To display timers to guests
- **The dashboard**: To manage and control timers

---

## 🔐 1. Login

### How to log in?

1. Open the application in your browser [`https://ts-electric-timers.vercel.app/login`](https://ts-electric-timers.vercel.app/login)
2. You will arrive at the login page with the title "Neka & Tony - Wedding timers"
3. Enter your **email** and **password**
4. Click the **"Login"** button

Once logged in, you will be automatically redirected to the dashboard.

> **Note**: If you see "Logging in..." after clicking, the application is logging you in.

---

## 🎯 2. The Dashboard

The dashboard is the control interface where you can manage all timers.

### What can you see?

You will see a grid of cards, each card represents a timer with:

- **The timer name** (e.g., "Ceremony", "Cocktail", "Dinner")
- **A status badge**:
  - 🟡 PENDING (Waiting): The timer has not started yet
  - 🔵 RUNNING (In progress): The timer is currently active
  - 🟢 COMPLETED (Finished): The timer is completed
- **The scheduled start date and time**
- **A countdown** showing the remaining time before triggering an action
- **The list of actions** associated with the timer (images, sounds, videos, etc.)
- **Control buttons** to manage the timer

### Types of timers

There are 3 types of timers:

1. **Timers with duration**: Have a defined duration (e.g., 60 minutes before the bride and groom's entrance)
2. **One-time timers**: Trigger at a specific moment without duration (e.g., special announcement)
3. **Manual timers**: Started manually by you, without a scheduled time

### How to start/display a timer?

1. Timers display automatically after their completion
2. If you still want to display a timer, click on "Display Timer"
3. The timer displays immediately and its status changes to "RUNNING"
4. Guests now see this timer on the main application

> **Important**: When a timer finishes automatically, the next timer displays automatically!

---

## 🎬 3. Actions

Each timer can contain multiple **actions** that will be triggered manually during the timer.

### Types of actions

- **Image**: Displays an image to guests
- **Image with sound**: Displays an image and plays a sound
- **Video**: Plays a video

### When do actions trigger?

- Actions are to be triggered manually when the timer reaches **00:00:00**
- Cards will start flashing when the timer duration has reached its time limit
- Multiple flashing colors to visually announce to the person in charge to click on the first action
- An action can be triggered at any time; in some cases, there will be actions that will flash **10 minutes before the end**, so you'll need to press "Start Action" at that moment

---

## 🎭 4. Demo Mode

Demo mode allows you to **test the application** without affecting your real event. You will see "Demo" banners appear throughout the dashboard.

### How to disable demo mode?

On the dashboard, click the **"Disable Demo Mode"** button in the yellow banner.

> **Important**: Do not use it during the event, otherwise notify an admin if necessary.

---

## 📺 5. The Main Application (Guest View)

This is what your guests see! It displays the current timer on a large screen.

### What is displayed

- **A large countdown** showing the remaining time
- Texts in different languages from the first action of the timer being displayed
- **Visual actions** that trigger automatically when an admin clicks "Start Action" from the dashboard:
  - Full-screen images
  - Videos
  - Photo galleries
  - Texts in multiple languages
- A smaller timer if the current action overlaps with a timer that is not yet finished

### Real-time updates

The display updates automatically thanks to **Pusher** technology:

- When you display a timer from the dashboard
- When an action is triggered
- When an action is completed
- When a timer ends
- No need to refresh the page!

---

## ⏱️ 6. What happens at the end of a timer?

### Automatic completion

When a timer reaches its allocated time:

1. **Action verification**: The application checks if all actions are completed
2. **Automatic completion**: If all actions are completed, the timer automatically switches to "COMPLETED"
3. **Starting the next one**: The next timer that is neither manual nor one-time starts **automatically** in order
4. **Display update**: The main application displays the new timer
5. **Notification**: The dashboard updates to show the change

---

## ❓ 8. Frequently Asked Questions

### What to do if a timer/action doesn't display?

- Check that the previous timer is properly finished
- Check that the scheduled start time has passed

### Can you go back?

No, once a timer is finished, it cannot be restarted. That's why **demo mode** exists!

### Troubleshooting

> **Important**: Do not refresh the page, otherwise just click the button "Click me to enable video sound"

Possibility to cancel the current action if there's a duplicate sound problem and then restart it
