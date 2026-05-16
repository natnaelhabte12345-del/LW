import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createShapeId } from "@tldraw/editor";
import { createClient } from "@supabase/supabase-js";
import {
  LiveblocksProvider,
  RoomProvider,
  useBroadcastEvent,
  useEventListener,
  useStatus,
  useOthers
} from "@liveblocks/react";
import { Tldraw } from "tldraw";
import { useSyncDemo } from "@tldraw/sync";
import YouTube from "react-youtube";
import "tldraw/tldraw.css";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  Copy,
  Clapperboard,
  FileImage,
  ImagePlus,
  Pause,
  Play,
  Plus,
  Share2,
  Sparkles,
  Send,
  Trash2,
  Upload,
  WandSparkles,
  X
} from "lucide-react";
import "./styles.css";

const liveStatusLabel = {
  connecting: "connecting",
  connected: "live",
  reconnecting: "reconnecting",
  disconnected: "offline",
  offline: "local"
};

const videoLibrary = [
  {
    title: "Math: Linear functions made simple",
    channel: "Learning Channel",
    duration: "12:40",
    topic: "Math",
    id: "dQw4w9WgXcQ"
  },
  {
    title: "Business: Understanding the economic cycle",
    channel: "Exam Prep",
    duration: "09:15",
    topic: "BWL",
    id: "ysz5S6PUM-U"
  },
  {
    title: "English: Essay structure for exams",
    channel: "Study Lab",
    duration: "08:22",
    topic: "English",
    id: "jNQXAC9IVRw"
  }
];

const liveblocksPublicKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;
const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function App() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRoom, setShowRoom] = useState(false);
  const [session, setSession] = useState(null);
  const [testSession, setTestSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const activeSession = session || testSession;

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) setAuthOpen(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  function createRoom() {
    if (!activeSession) {
      setAuthOpen(true);
      return;
    }

    const id = `lw-${Math.random().toString(36).slice(2, 8)}`;
    setCurrentRoom({
      id,
      name: `Study Room ${id}`,
      link: `${window.location.origin}/room/${id}`
    });
    setCopied(false);
    setShowRoom(false);
  }

  async function copyRoomLink() {
    if (!currentRoom?.link) return;
    try {
      await navigator.clipboard.writeText(currentRoom.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (showRoom) {
    if (liveblocksPublicKey) {
      return (
        <LiveblocksProvider publicApiKey={liveblocksPublicKey}>
          <RoomProvider id={currentRoom.id}>
            <LiveStudyRoom key={currentRoom.id} room={currentRoom} />
          </RoomProvider>
        </LiveblocksProvider>
      );
    }

    return <StudyRoom key={currentRoom.id} room={currentRoom} liveMode="offline" />;
  }

  return (
    <LandingPage
      currentRoom={currentRoom}
      copied={copied}
      createRoom={createRoom}
      copyRoomLink={copyRoomLink}
      openRoom={() => currentRoom && setShowRoom(true)}
      session={activeSession}
      authOpen={authOpen}
      setAuthOpen={setAuthOpen}
      onSignOut={() => {
        setTestSession(null);
        supabase?.auth.signOut();
      }}
      onTestAccess={() => {
        setTestSession({ user: { email: "testing@learnwave.local" } });
        setAuthOpen(false);
      }}
    />
  );
}

function LiveStudyRoom({ room }) {
  const others = useOthers();
  const status = useStatus();
  const broadcast = useBroadcastEvent();
  const [videoSyncEvent, setVideoSyncEvent] = useState(null);

  useEventListener(({ event }) => {
    if (event?.type !== "VIDEO_SYNC" || event.roomId !== room.id) return;
    setVideoSyncEvent({ ...event, receivedAt: Date.now() });
  });

  return (
    <StudyRoom
      room={room}
      liveMode="liveblocks"
      liveParticipantCount={others.length + 1}
      liveStatus={status}
      videoSyncEvent={videoSyncEvent}
      broadcastVideoSync={(payload) =>
        broadcast({
          type: "VIDEO_SYNC",
          roomId: room.id,
          sentAt: Date.now(),
          ...payload
        })
      }
    />
  );
}

function LandingPage({
  currentRoom,
  copied,
  createRoom,
  copyRoomLink,
  openRoom,
  session,
  authOpen,
  setAuthOpen,
  onSignOut,
  onTestAccess
}) {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="brand" href="#" aria-label="LW Home">
          <span className="brand-mark">LW</span>
          <span>Learn<br />Wave</span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#community">Community</a>
          <a href="#features">Features</a>
          <a href="#help">Help</a>
          <button type="button">Language</button>
        </nav>
        {session ? (
          <button className="login-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        ) : (
          <button className="login-button" type="button" onClick={() => setAuthOpen(!authOpen)}>
            Login
          </button>
        )}
      </header>

      <section className="landing-hero" id="home">
        <h1>Study rooms for groups</h1>
        <p>
          Create a private study room with a whiteboard, synced video, live cursors and AI help.
        </p>
        <button className="create-room-button" type="button" onClick={createRoom}>
          {currentRoom ? "Create New Room" : "Create Room"}
        </button>
        {!session && <span className="account-note">Sign in to create and share a room.</span>}

        {authOpen && !session && <AuthBox onTestAccess={onTestAccess} />}

        {session && (
          <div className="auth-session" role="status">
            Signed in as <strong>{session.user.email}</strong>
          </div>
        )}

        {currentRoom && (
          <div className="room-link-box" role="status">
            <label htmlFor="room-link">Your room link</label>
            <div>
              <input id="room-link" value={currentRoom.link} readOnly />
              <button type="button" onClick={copyRoomLink}>
                <Copy size={16} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button className="open-room-button" type="button" onClick={openRoom}>
              Open room
              <ArrowRight size={17} />
            </button>
          </div>
        )}
      </section>

      <section className="landing-info" id="features">
        <div>
          <h2>About LearnWave</h2>
          <p>
            LearnWave is a shared study room for friends, classes and small groups.
            The first version focuses on the fastest useful flow: create a room,
            share the link and study together with AI support.
          </p>
        </div>
        <ul>
          <li><Check size={18} /> Shared whiteboard for explanations</li>
          <li><Check size={18} /> Show everyone else's cursor</li>
          <li><Check size={18} /> Watch YouTube videos together</li>
          <li><Check size={18} /> AI Tutor for questions, screenshots and solutions</li>
          <li><Check size={18} /> Upload tasks and work on them together</li>
        </ul>
      </section>

      <section className="landing-steps" aria-label="How it works">
        <div><strong>1.</strong> Create a room</div>
        <div><strong>2.</strong> Share the link</div>
        <div><strong>3.</strong> Learn together</div>
      </section>
    </main>
  );
}

function AuthBox({ onTestAccess }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [testCode, setTestCode] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSignup = mode === "signup";
  const isTestCode = mode === "code";

  async function submitAuth(event) {
    event.preventDefault();
    setStatus("");

    if (isTestCode) {
      if (testCode.trim() === "123tester") {
        onTestAccess();
        return;
      }

      setStatus("Invalid test code.");
      return;
    }

    if (!supabase) {
      setStatus("Login is not available right now.");
      return;
    }

    if (password.length < 6) {
      setStatus("Password needs at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const credentials = { email: email.trim(), password };
      const { data, error } = isSignup
        ? await supabase.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo: window.location.origin
            }
          })
        : await supabase.auth.signInWithPassword(credentials);

      if (error) throw error;

      if (isSignup && !data.session) {
        setStatus("Account created. Please verify your email, then sign in.");
      } else {
        setStatus(isSignup ? "Account created. You are signed in." : "Signed in.");
      }
    } catch (error) {
      setStatus(error.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="auth-box" onSubmit={submitAuth}>
      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button type="button" className={!isSignup ? "active" : ""} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button type="button" className={isSignup ? "active" : ""} onClick={() => setMode("signup")}>
          Create account
        </button>
        <button type="button" className={isTestCode ? "active" : ""} onClick={() => setMode("code")}>
          Free code
        </button>
      </div>

      {isTestCode ? (
        <label>
          Test code
          <input
            type="text"
            value={testCode}
            onChange={(event) => setTestCode(event.target.value)}
            placeholder="Enter testing code"
            autoComplete="off"
            required
          />
        </label>
      ) : (
        <>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          </label>
        </>
      )}

      <button className="auth-submit" type="submit" disabled={isLoading}>
        {isLoading ? "Working..." : isTestCode ? "Enter room" : isSignup ? "Create account" : "Sign in"}
      </button>

      {status && <p className="auth-status">{status}</p>}
    </form>
  );
}

function StudyRoom({
  room,
  liveMode = "offline",
  liveParticipantCount = 1,
  liveStatus = "offline",
  videoSyncEvent,
  broadcastVideoSync
}) {
  const [editor, setEditor] = useState(null);
  const [panel, setPanel] = useState("ai");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showStageVideo, setShowStageVideo] = useState(false);
  const [boardUpload, setBoardUpload] = useState(null);
  const stagePlayerRef = useRef(null);

  useEffect(() => {
    if (!videoSyncEvent) return;
    if (videoSyncEvent.video?.id) {
      setSelectedVideo(videoSyncEvent.video);
    }
    if (videoSyncEvent.state === 1) {
      setShowStageVideo(true);
    }
  }, [videoSyncEvent]);

  function clearBoard() {
    if (!editor) return;
    editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    readImageForBoard(file)
      .then((image) => {
        const assetId = `asset:${crypto.randomUUID()}`;
        const shapeId = createShapeId();
        const maxBoardWidth = 520;
        const scale = Math.min(1, maxBoardWidth / image.width);
        const w = Math.round(image.width * scale);
        const h = Math.round(image.height * scale);
        const center = editor.getViewportPageBounds().center;

        editor.createAssets([
          {
            id: assetId,
            typeName: "asset",
            type: "image",
            meta: {},
            props: {
              name: file.name,
              src: image.src,
              w: image.width,
              h: image.height,
              mimeType: file.type || "image/png",
              isAnimated: false
            }
          }
        ]);
        editor.createShape({
          id: shapeId,
          type: "image",
          x: center.x - w / 2,
          y: center.y - h / 2,
          props: {
            assetId,
            w,
            h,
            playing: true,
            url: "",
            crop: null,
            flipX: false,
            flipY: false,
            altText: file.name
          }
        });
        editor.select(shapeId);
        editor.zoomToSelection({ animation: { duration: 240 } });
        setBoardUpload({ name: file.name, src: image.src });
        setPanel("photo");
      })
      .catch(() => {
        setBoardUpload({ name: "Error", src: "" });
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  const matchingVideos = useMemo(() => {
    return [];
  }, []);

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="Shared study room">
        <RoomHeader room={room} />
        <Toolbar
          panel={panel}
          setPanel={setPanel}
          clearBoard={clearBoard}
        />
        <Whiteboard
          roomId={room.id}
          onMount={setEditor}
        />
        <WorkspaceVideo
          show={showStageVideo && Boolean(selectedVideo)}
          selectedVideo={selectedVideo}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          setShowStageVideo={setShowStageVideo}
          playerRef={stagePlayerRef}
          videoSyncEvent={videoSyncEvent}
          broadcastVideoSync={broadcastVideoSync}
          syncEnabled={liveMode === "liveblocks" && Boolean(broadcastVideoSync)}
        />
        <WelcomeCard setPanel={setPanel} />
        <SessionBar
          participants={liveParticipantCount}
          liveMode={liveMode}
          liveStatus={liveStatus}
        />
      </section>

      <aside className="side-panel" aria-label="Study tools">
        <PanelTabs active={panel} setPanel={setPanel} />
        {panel === "ai" && (
          <AiTutorPanel key={room.id} room={room} />
        )}
        {panel === "video" && (
          <VideoPanel
            key={room.id}
            room={room}
            liveMode={liveMode}
            videos={matchingVideos}
            selectedVideo={selectedVideo}
            setSelectedVideo={setSelectedVideo}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            showStageVideo={showStageVideo}
            setShowStageVideo={setShowStageVideo}
            getCurrentVideoTime={() => stagePlayerRef.current?.getCurrentTime?.() || 0}
            videoSyncEvent={videoSyncEvent}
            broadcastVideoSync={broadcastVideoSync}
          />
        )}
        {panel === "photo" && (
          <PhotoPanel boardUpload={boardUpload} canUpload={Boolean(editor)} handlePhoto={handlePhoto} />
        )}
      </aside>
    </main>
  );
}

function RoomHeader({ room }) {
  return (
    <div className="room-header">
      <div>
        <span className="room-label">Study room</span>
        <strong>{room.name}</strong>
      </div>
      <button className="share-button">
        <Share2 size={16} />
        Invite
      </button>
    </div>
  );
}

function Toolbar({
  panel,
  setPanel,
  clearBoard
}) {
  return (
    <nav className="toolbar" aria-label="Room tools">
      <IconButton active={panel === "ai"} label="AI Tutor" onClick={() => setPanel("ai")} icon={<Sparkles />} />
      <IconButton active={panel === "video"} label="Video Sync" onClick={() => setPanel("video")} icon={<Clapperboard />} />
      <IconButton active={panel === "photo"} label="Upload" onClick={() => setPanel("photo")} icon={<Upload />} />
      <span className="toolbar-divider" />
      <IconButton label="Clear board" onClick={clearBoard} icon={<Trash2 />} />
    </nav>
  );
}

function IconButton({ icon, label, active = false, onClick }) {
  return (
    <button className={`icon-button ${active ? "active" : ""}`} onClick={onClick} aria-label={label} title={label}>
      {React.cloneElement(icon, { size: 18, strokeWidth: active ? 2.4 : 2 })}
    </button>
  );
}

function Whiteboard({ roomId, onMount }) {
  const store = useSyncDemo({ roomId: `learnwave-${roomId}` });

  return (
    <div className="whiteboard tldraw-board" data-testid="whiteboard">
      <Tldraw store={store} autoFocus initialState="draw" onMount={onMount} />
    </div>
  );
}

function WorkspaceVideo({
  show,
  selectedVideo,
  isPlaying,
  setIsPlaying,
  setShowStageVideo,
  playerRef,
  videoSyncEvent,
  broadcastVideoSync,
  syncEnabled
}) {
  const [userStartedVideo, setUserStartedVideo] = useState(false);

  useEffect(() => {
    setUserStartedVideo(false);
  }, [selectedVideo?.id]);

  useEffect(() => {
    if (isPlaying) {
      setUserStartedVideo(true);
      return;
    }

    if (userStartedVideo) {
      setUserStartedVideo(false);
    }
  }, [isPlaying, userStartedVideo]);

  useEffect(() => {
    if (!videoSyncEvent) return;
    if (videoSyncEvent.state === 1) {
      setUserStartedVideo(true);
      setIsPlaying(true);
    }

    if (videoSyncEvent.state === 2) {
      setIsPlaying(false);
    }
  }, [setIsPlaying, videoSyncEvent]);

  if (!show || !selectedVideo) return null;

  const embedUrl = `https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
  const thumbnailUrl = `https://i.ytimg.com/vi/${selectedVideo.id}/hqdefault.jpg`;

  return (
    <section className="workspace-video" aria-label="Shared video">
      <div className="workspace-video-header">
        <div>
          <span>Shared video</span>
          <strong>{selectedVideo.title}</strong>
        </div>
        <div className="workspace-video-actions">
          <a href={`https://www.youtube.com/watch?v=${selectedVideo.id}`} target="_blank" rel="noreferrer">
            YouTube
          </a>
          <button
            type="button"
            aria-label="Close video"
            title="Close video"
            onClick={() => {
              setIsPlaying(false);
              setShowStageVideo(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="workspace-video-frame">
        {userStartedVideo ? (
          <iframe
            ref={playerRef}
            key={`${selectedVideo.id}-playing`}
            title={selectedVideo.title}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            className="workspace-video-poster"
            type="button"
            aria-label="Start video for everyone"
            onClick={() => {
              setUserStartedVideo(true);
              setIsPlaying(true);
              if (syncEnabled) {
                broadcastVideoSync?.({ state: 1, time: 0, video: selectedVideo });
              }
            }}
          >
            <img src={thumbnailUrl} alt="" />
            <span>
              <Play size={30} />
              </span>
          </button>
        )}
      </div>
    </section>
  );
}

function WelcomeCard({ setPanel }) {
  return (
    <div className="welcome-card">
      <div className="welcome-icon">
        <BookOpenCheck size={22} />
      </div>
      <div>
        <h1>Welcome to the study room</h1>
        <p>Draw on the whiteboard, ask the AI Tutor, find videos and work through tasks.</p>
        <div className="welcome-actions">
          <button onClick={() => setPanel("ai")}>Ask AI</button>
          <button onClick={() => setPanel("video")}>Search video</button>
        </div>
      </div>
    </div>
  );
}

function SessionBar({ participants, liveMode, liveStatus }) {
  const statusText = liveMode === "liveblocks" ? liveStatusLabel[liveStatus] || "live" : "local";

  return (
    <div className="session-bar">
      <div className={`screen-dot ${liveMode === "liveblocks" ? "live" : "offline"}`} />
      <strong>Live Session</strong>
      <span>{participants} in room</span>
      <span className="sync-state">
        <Check size={14} />
        {statusText}
      </span>
    </div>
  );
}

function PanelTabs({ active, setPanel }) {
  return (
    <div className="panel-tabs">
      <button className={active === "ai" ? "active" : ""} onClick={() => setPanel("ai")}>
        <Brain size={16} />
        AI Tutor
      </button>
      <button className={active === "video" ? "active" : ""} onClick={() => setPanel("video")}>
        <Clapperboard size={16} />
        Videos
      </button>
      <button className={active === "photo" ? "active" : ""} onClick={() => setPanel("photo")}>
        <FileImage size={16} />
        Upload
      </button>
    </div>
  );
}

function AiTutorPanel({ room }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Send a question or upload a screenshot. I will check directly whether your solution is right."
    }
  ]);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  async function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1280, 0.78);
      setImage(compressed);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "The image could not be prepared. Try a JPG or PNG." }
      ]);
    } finally {
      event.target.value = "";
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text && !image) return;

    const userMessage = {
      role: "user",
      content: text || "Please check the screenshot.",
      imagePreview: image?.preview
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setImage(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          messages: nextMessages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .slice(-8)
            .map((message) => ({ role: message.role, content: message.content })),
          image: image ? { mimeType: image.mimeType, data: image.data } : null
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "AI Tutor could not answer right now.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error.message || "AI Tutor is not reachable right now." }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="panel-content">
      <div className="panel-heading">
        <WandSparkles size={21} />
        <div>
          <h2>AI Tutor</h2>
          <p>Ask a question or upload a screenshot. The tutor checks your solution directly.</p>
        </div>
      </div>

      <div className="chat-list" aria-live="polite">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
            {message.imagePreview && <img src={message.imagePreview} alt="Uploaded screenshot" />}
            <p>{message.content}</p>
          </article>
        ))}
        {isSending && (
          <article className="chat-message assistant">
            <p>Checking it now...</p>
          </article>
        )}
      </div>

      {image && (
        <div className="chat-image-preview">
          <img src={image.preview} alt="Selected screenshot" />
          <button type="button" onClick={() => setImage(null)} aria-label="Remove image">
            <X size={15} />
          </button>
        </div>
      )}

      <form className="chat-composer" onSubmit={sendMessage}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a question, or: Is my solution correct?"
          rows={3}
        />
        <div>
          <button type="button" className="ghost-action" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={16} />
            Image
          </button>
          <button type="submit" disabled={isSending || (!draft.trim() && !image)}>
            <Send size={16} />
            {isSending ? "Checking..." : "Send"}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} hidden />
      </form>
    </div>
  );
}

function VideoPanel({
  room,
  liveMode,
  videos,
  selectedVideo,
  setSelectedVideo,
  isPlaying,
  setIsPlaying,
  showStageVideo,
  setShowStageVideo,
  getCurrentVideoTime,
  videoSyncEvent,
  broadcastVideoSync
}) {
  const [apiVideos, setApiVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const visibleVideos = apiVideos.length ? apiVideos : videos;
  const syncEnabled = liveMode === "liveblocks" && Boolean(broadcastVideoSync);

  useEffect(() => {
    if (!videoSyncEvent) return;
    if (videoSyncEvent.video?.id && videoSyncEvent.video.id !== selectedVideo?.id) {
      setSelectedVideo(videoSyncEvent.video);
    }
    if (videoSyncEvent.state === 1) {
      setIsPlaying(true);
      setShowStageVideo(true);
    }
    if (videoSyncEvent.state === 2) {
      setIsPlaying(false);
    }
  }, [selectedVideo?.id, setIsPlaying, setSelectedVideo, setShowStageVideo, videoSyncEvent]);

  async function searchYoutube(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (!youtubeApiKey) {
      setSearchStatus("YouTube API key is missing in .env.");
      return;
    }

    setSearchStatus("searching");

    try {
      const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        videoEmbeddable: "true",
        videoSyndicated: "true",
        order: "relevance",
        maxResults: "5",
        q: query,
        key: youtubeApiKey
      });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      if (!response.ok) throw new Error(`YouTube API ${response.status}`);
      const data = await response.json();
      const results = (data.items || [])
        .map((item) => ({
          id: item.id?.videoId,
          title: decodeHtml(item.snippet?.title || "YouTube Video"),
          channel: decodeHtml(item.snippet?.channelTitle || "YouTube"),
          duration: "YouTube",
          topic: query
        }))
        .filter((video) => video.id);

      setApiVideos(results);
      setSearchStatus(results.length ? `${results.length} videos found` : "No videos found");
    } catch {
      setSearchStatus("YouTube search failed.");
    }
  }

  function togglePlayback() {
    if (!selectedVideo) return;

    if (isPlaying) {
      setIsPlaying(false);
      if (syncEnabled) {
        broadcastVideoSync({
          state: 2,
          time: getCurrentVideoTime(),
          video: selectedVideo
        });
      }
    } else {
      setShowStageVideo(true);
      setIsPlaying(true);
      if (syncEnabled) {
        broadcastVideoSync({
          state: 1,
          time: getCurrentVideoTime(),
          video: selectedVideo
        });
      }
    }
  }

  function chooseVideo(video) {
    setSelectedVideo(video);
    setIsPlaying(false);
    setShowStageVideo(true);
    if (syncEnabled) {
      broadcastVideoSync({ state: 2, time: 0, video });
    }
  }

  return (
    <div className="panel-content">
      <div className="panel-heading">
        <Clapperboard size={21} />
        <div>
          <h2>Video Sync</h2>
          <p>{syncEnabled ? `Play, pause and seek sync live in ${room.name}.` : "YouTube player is active. Live sync still needs a Liveblocks key."}</p>
        </div>
      </div>

      <form className="video-search" onSubmit={searchYoutube}>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search YouTube, e.g. linear functions"
          aria-label="Search YouTube"
        />
        <button type="submit">Search</button>
      </form>
      {searchStatus && <div className="video-status">{searchStatus === "searching" ? "Search running..." : searchStatus}</div>}

      {selectedVideo ? (
        <>
          <div className="selected-video">
            <strong>{selectedVideo.title}</strong>
            <span>{selectedVideo.channel}</span>
          </div>
          <div className="video-stage-card">
            <Clapperboard size={18} />
            <div>
              <strong>{showStageVideo ? "Video is visible on the whiteboard." : "Video opens large on the whiteboard."}</strong>
              <span>Search on the right, watch together in the center.</span>
            </div>
          </div>
        </>
      ) : (
        <div className="video-empty">
          Search for a video and select it. This room starts without saved videos.
        </div>
      )}
      <div className="video-controls">
        <button onClick={togglePlayback} disabled={!selectedVideo}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {!selectedVideo ? "Choose a video first" : isPlaying ? "Pause for everyone" : "Play for everyone"}
        </button>
        <div className={`pulse ${isPlaying ? "playing" : ""}`} />
      </div>

      {visibleVideos.length > 0 ? (
        <div className="video-list">
          {visibleVideos.map((video) => (
          <button
            key={`${video.id}-${video.title}`}
            className={selectedVideo?.id === video.id ? "selected" : ""}
            onClick={() => chooseVideo(video)}
          >
            <span>
              <strong>{video.title}</strong>
              <small>{video.channel} - {video.duration}</small>
            </span>
            <Plus size={16} />
          </button>
          ))}
        </div>
      ) : (
        <div className="video-empty subtle">
          No videos in this room yet.
        </div>
      )}
    </div>
  );
}

function LegacyVideoPanel({ videos, selectedVideo, setSelectedVideo, isPlaying, setIsPlaying }) {
  return (
    <div className="panel-content">
      <div className="panel-heading">
        <Clapperboard size={21} />
        <div>
          <h2>Video Sync</h2>
          <p>One video for everyone. In this MVP, the shared state is simulated locally.</p>
        </div>
      </div>

      <div className="video-frame">
        <iframe
          title={selectedVideo.title}
          src={`https://www.youtube.com/embed/${selectedVideo.id}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="video-controls">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? "Pause for everyone" : "Play for everyone"}
        </button>
        <div className={`pulse ${isPlaying ? "playing" : ""}`} />
      </div>

      <div className="video-list">
        {videos.map((video) => (
          <button
            key={video.title}
            className={selectedVideo.title === video.title ? "selected" : ""}
            onClick={() => setSelectedVideo(video)}
          >
            <span>
              <strong>{video.title}</strong>
              <small>{video.channel} Â· {video.duration}</small>
            </span>
            <Plus size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoPanel({ boardUpload, canUpload, handlePhoto }) {
  return (
    <div className="panel-content">
      <div className="panel-heading">
        <FileImage size={21} />
        <div>
          <h2>Upload</h2>
          <p>Upload tasks, images or screenshots to work on them together in the LW whiteboard.</p>
        </div>
      </div>

      <label className="upload-zone">
        <Upload size={26} />
        <strong>{canUpload ? "Place file on whiteboard" : "Whiteboard is loading"}</strong>
        <span>PNG, JPG or screenshot</span>
        <input type="file" accept="image/*" onChange={handlePhoto} disabled={!canUpload} />
      </label>

      {boardUpload?.src ? (
        <>
          <img className="photo-preview" src={boardUpload.src} alt="Uploaded task" />
          <article className="explanation">
            <div>
              <Check size={17} />
              <strong>File is on the whiteboard</strong>
            </div>
            <p>You can now write next to it, mark it up or explain it together.</p>
          </article>
        </>
      ) : (
        <div className="empty-state">
          <Upload size={18} />
          No upload on the whiteboard yet.
        </div>
      )}
    </div>
  );
}

function decodeHtml(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;
        context.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, mimeType === "image/png" ? undefined : quality);
        const [, data = ""] = dataUrl.split(",");

        resolve({
          name: file.name,
          mimeType,
          data,
          preview: dataUrl
        });
      };
      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

function readImageForBoard(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        resolve({
          src: reader.result,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        });
      };
      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

createRoot(document.getElementById("root")).render(<App />);


