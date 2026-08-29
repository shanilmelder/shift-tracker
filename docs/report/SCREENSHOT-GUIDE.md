# Screenshot capture guide

The presentation has 11 walkthrough slides, each with a dashed placeholder where a screenshot
goes. Capture these on your iPhone, drop them into `docs/report/screenshots/` using the exact
filenames below, then re-run:

```bash
python docs/report/build_slides.py
```

Placeholders are replaced automatically. Any you don't capture stay as placeholders, so you can
do these in batches.

## Why these aren't generated

`docs/design/screens/*.png` are **design mockups, not screenshots**, and they are stale — they
show a role-picker onboarding screen the built app does not have. Using them would misrepresent
the application in an assessed submission.

Capturing real ones needs the app running on a signed-in device with data in it, which only you
can do. On iPhone: **side button + volume up**, then AirDrop or email them across.

## Before you start

Two accounts make the walkthrough much easier, since half the slides are employee screens and
half are manager screens:

- Sign in as **Test Manager** for steps 7–11
- Sign in as **Test User** (employee) for steps 3–6

Make sure there is some data to show — at minimum a couple of shifts this week with staff
assigned, one pending time-off request, and one pending swap. An empty screen makes a poor
slide.

## What to capture

| Filename | Screen | How to reach it |
|---|---|---|
| `01-login.png` | Sign-in | Sign out, or launch fresh. Type an email so the field isn't empty. |
| `02-set-password.png` | Choose a password | Reset a test user's password from the manager's staff screen, then sign in as them with the temporary one. |
| `03-employee-schedule.png` | Employee schedule | Employee → **Schedule** tab. Week view. |
| `04-roster.png` | Who's working | Employee → Schedule → **See who's working**. Use **Week**, on a week with shifts. |
| `05-clock-in.png` | Clock in | Employee → **Clock** tab, on a day with a shift. Ideally captured while clocked in, so the elapsed timer and break toggle show. |
| `06-requests.png` | Time off / requests | Employee → **Requests** → Time off. Best with at least one past request visible. |
| `07-manager-dashboard.png` | Manager dashboard | Manager → **Overview**. Best with pending items so "Needs you" isn't empty. |
| `08-manager-build.png` | Build / assign | Manager → **Build** → Assign staff tab. |
| `09-manager-approvals.png` | Approvals | Manager → **Approvals** → Time off (or Swaps). Needs a pending request. |
| `10-ai-reports.png` | AI reports | Manager → More → **Reports**. Ask "Who is working the morning shift tomorrow?" and capture the answer with the "From: shift roster" source line visible. |
| `11-add-staff.png` | Temp password | Manager → Team → Add staff → create one. Capture the "Account created" screen showing the temporary password. |

## Two cautions

**Slide 10 is the one that sells the project.** The AI assistant is the differentiator, so make
sure that screenshot shows a real question, a real answer, and the source line underneath.

**Blur or replace real personal data.** If you screenshot anything with a real name, email
address or pay rate, redact it before submitting — or seed the data with obvious test names
first. Slide 11 in particular will show a temporary password; that one is fine to show since it
is single-use and already replaced, but don't show a live one.
