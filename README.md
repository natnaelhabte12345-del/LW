# LW
LW is a english first Learn App for Students who want to learrn together with not just calling each other and doing nothing but actually learning together with real visualization and an actual learning curve
# LW

LW is an English-first learning app for students who want to learn together instead of just sitting in a call and doing nothing. It gives groups a shared study room with real visualization, collaboration, and a clearer learning flow.

## What LW Does

LW lets students create a shared room where they can:

- draw together on a whiteboard
- see live cursors from other people
- watch YouTube videos together
- upload tasks, images, or screenshots onto the whiteboard
- use an AI Tutor for questions and solution checks
- enter through email login or a free testing code

## Current MVP Features

- **Shared Whiteboard**  
  A tldraw-based whiteboard for visual explanations, notes, and problem solving.

- **Live Room Feeling**  
  Liveblocks is used for presence, live session state, and shared room behavior.

- **Video Sync**  
  Students can search YouTube videos and play them inside the room.

- **AI Tutor**  
  Gemini-powered tutor that can answer questions and check screenshots.

- **Upload to Whiteboard**  
  Upload images or task screenshots and place them directly on the board.

- **Authentication**  
  Supabase email/password login is supported.  
  For MVP testing, users can also enter the free test code:

  ```txt
  123tester
Tech Stack
React
Vite
tldraw
Liveblocks
Supabase Auth
Gemini API
YouTube API
Vercel
Local Setup
Install dependencies:

npm install
Create a .env file:

VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_public_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-lite-latest
Run locally:

npm run dev
Open:

http://127.0.0.1:5173/
Build
npm run build
Deployment
The app is designed for Vercel because it uses an API route for the Gemini AI Tutor.

GitHub Pages is not a good fit unless the AI backend is moved elsewhere.

Security Notes
Do not commit .env.

The following values are public frontend variables:

VITE_YOUTUBE_API_KEY
VITE_LIVEBLOCKS_PUBLIC_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
The Gemini key must stay server-side:

GEMINI_API_KEY
Status
This is an MVP. The core experience works, but the next important improvements are:

stronger real-time whiteboard syncing
better room routing
persistent rooms
cleaner authentication flow
production-ready permissions and rate limits
