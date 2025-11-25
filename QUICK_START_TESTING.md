# 🚀 QUICK START: New Features Testing

## Start the Server

```bash
cd "c:\Users\punee\OneDrive\Desktop\MY PROJECTS\web development\skillbridge-connect"
npm start
# or
node server.js
```

Server runs on: http://localhost:3000

---

## Test Feature 1: ABOUT (Worker Profile)

### Scenario A: Non-Worker User

1. Open browser → http://localhost:3000
2. Click "Login" button
3. Use existing customer account (if you don't have one, sign up)
4. Click "About" in navbar
5. ✅ See message: "You need to join as a worker to see your profile details here"

### Scenario B: Worker User (First Register as Worker)

1. Click "Join as Worker" button
2. Fill in all worker details:
   - Name, phone, email
   - Occupation (e.g., Plumber)
   - Experience
   - Select specialties
   - Hourly rate (e.g., 500)
   - Location
   - Description
3. Click "Submit"
4. Now click "About" in navbar
5. ✅ See your complete worker profile with:
   - Your name & occupation
   - Your rating & experience
   - Your skills (specialties)
   - Your service areas
   - Your contact info

---

## Test Feature 2: MESSAGES (Real-time Chat)

### Prerequisites

- Need at least 2 accounts (Worker + Customer)
- Need an active booking between them

### Setup Bookings

**Account 1 (Customer):**

1. Login
2. Click "Find Workers"
3. Search for a worker
4. Click "Book Now"
5. Fill booking form and submit

**Account 2 (Worker):**

1. Login (as worker)
2. Click "My Bookings"
3. Accept the booking from the customer

### Test Messaging

**Account 1 (Customer):**

1. Click "Messages" in navbar
2. ✅ See conversation list
3. Click on worker's email in the list
4. ✅ See message thread (empty at first)
5. Type message: "Hi, when can you start?"
6. Click send button OR press Enter
7. ✅ Message appears in BLUE on right side
8. ✅ Timestamp shows below message

**Account 2 (Worker):**

1. Click "Messages" in navbar
2. ✅ See customer's email in conversation list
3. Click to open conversation
4. ✅ See customer's message in GRAY on left side
5. Type reply: "I can start tomorrow"
6. Send message
7. ✅ Message appears in blue on right

**Account 1 (Back to Customer):**

1. Still on Messages section
2. ✅ See worker's reply appear automatically (real-time update)
3. Message shows in gray on left side

---

## Test Feature 3: Chat from Bookings

**Account 1 (Customer):**

1. Click "My Bookings"
2. See your bookings with worker
3. Click "💬 Chat" button
4. ✅ Automatically opens Messages section
5. ✅ Shows conversation with that worker

---

## Dark/Light Mode Testing

**While in About or Messages section:**

1. Click theme toggle (sun/moon icon) in navbar
2. Switch between dark and light modes
3. ✅ All text and backgrounds should be readable
4. ✅ Messages should have good contrast
5. ✅ Conversation list should be visible

---

## Troubleshooting

### "No conversations yet" message

- This is normal if you haven't sent/received any messages
- Create a booking first, then send a message

### Messages not showing

- Hard refresh browser (Ctrl+F5)
- Check that you're logged in
- Verify both users are created in database

### Chat not real-time

- Make sure Socket.io is working (check browser console for errors)
- Server should show "User connected" logs
- Both users should be on the same page

### Worker profile not showing

- Login as that worker account
- Go to "About" section
- If still not showing, make sure you completed full worker registration

---

## What Each Button Does

| Button             | Location        | Action                                         |
| ------------------ | --------------- | ---------------------------------------------- |
| About              | Navbar          | Shows worker profile or "not a worker" message |
| Messages           | Navbar          | Opens messaging interface                      |
| Services           | Navbar          | Shows confirmed bookings/services              |
| My Bookings        | Navbar          | Shows booking requests & customer bookings     |
| 💬 Chat            | In Booking Card | Opens that specific conversation               |
| Back               | In Section      | Returns to home                                |
| Send (in Messages) | Message input   | Sends message (or press Enter)                 |

---

## Key Points

✅ Messages are stored in database (persistent)
✅ Real-time updates via Socket.io
✅ Works on mobile and desktop
✅ Dark/Light mode fully supported
✅ Multiple conversations supported
✅ Message timestamps in local timezone
✅ Clean, professional UI

---

## Common Questions

**Q: Can I message anyone?**
A: Currently only through bookings - after a booking is created, both parties can message each other.

**Q: Where are messages stored?**
A: In the `messages` table in your MySQL database.

**Q: Do messages appear for both users in real-time?**
A: Yes! Socket.io sends real-time updates. Both users see new messages immediately.

**Q: What if I'm not a worker?**
A: About section shows "not a worker" message. You can still use Messages to chat about bookings.

**Q: Can I delete messages?**
A: Currently not implemented. All messages are permanent.

---

Need help? Check NEW_FEATURES_GUIDE.md for detailed technical documentation.
