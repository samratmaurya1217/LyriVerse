<div align="center">
  <h1>🌌 LyriVerse</h1>
  <p>An immersive, 3D lyrics visualizer perfectly synced with Spotify audio.</p>
</div>

<br />

LyriVerse transforms your music listening experience by turning flat lyrics into a beautiful, dynamic 3D environment. Built with **Three.js** and the **Spotify Web Playback SDK**, it creates a floating, interactive universe of text and particles perfectly synchronized with your favorite songs.

## ✨ Features

- **Immersive 3D Lyrics:** Lyrics float into a 3D space in real-time, perfectly synced to the vocals using the LRCLIB API and Troika-Three-Text.
- **Dynamic Album Colors:** The 3D environment's background, fog, and text instantly adapt by extracting the dominant colors from the currently playing album's artwork.
- **Interactive Camera:** Click and drag (or touch and pan on mobile) to smoothly rotate the camera through the floating lyrics and particle space.
- **Smart Auto-Play:** When a track ends, LyriVerse intelligently queries Spotify for recommendations based on the previous track and seamlessly transitions into the next song.
- **Top Tracks Discovery:** Don't know what to listen to? The home screen automatically populates with globally trending tracks from 2024.
- **Spotify Premium Integration:** Full playback control directly inside the browser using the official Spotify Web Playback SDK.

## 🛠️ Tech Stack

- **Frontend:** HTML/CSS/JS, [Vite](https://vitejs.dev/)
- **3D Engine:** [Three.js](https://threejs.org/) + [Troika-Three-Text](https://protecting.troika.js.org/)
- **Backend:** Node.js, [Express](https://expressjs.com/)
- **APIs:** Spotify Web API, Spotify Web Playback SDK, [LRCLIB](https://lrclib.net/) (for synced lyrics)
- **Color Extraction:** `fast-average-color`

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **Spotify Premium Account** (Required by Spotify to play full audio streams in the browser)

### 1. Clone & Install

```bash
git clone https://github.com/samratmaurya1217/LyriVerse.git
cd LyriVerse
npm install
```

### 2. Set Up Spotify Developer Credentials

To interact with Spotify, you need to create an app in their developer dashboard:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create app**.
3. Name it "LyriVerse" (or whatever you prefer) and add `http://localhost:3001/callback` to the **Redirect URIs**.
4. Save your app and take note of the **Client ID** and **Client Secret**.

### 3. Configure Environment Variables

Create a new file named `.env` in the root of the project (you can use `.env.example` as a template) and add your credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

> **Security Note:** Never share your `.env` file or commit it to GitHub. It is securely ignored in this repository via `.gitignore`.

### 4. Generate a Refresh Token

You need an authorized refresh token so the backend can fetch music data on your behalf.

Run the built-in authentication script:
```bash
node server/getRefreshToken.js
```
Follow the instructions in your terminal to open the authorization URL in your browser, log in to Spotify, and grant permissions. The script will output your **Refresh Token**. 

Add it to your `.env` file:
```env
SPOTIFY_REFRESH_TOKEN=your_generated_refresh_token
```

### 5. Run the Application

You need to run both the Express backend and the Vite frontend simultaneously. 

Open two separate terminal windows/tabs:

**Terminal 1 (Backend):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend):**
```bash
npm run dev:frontend
```

Now open `http://localhost:5173` in your browser, click play on a song, and enjoy the visualizer!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📝 License

This project is licensed under the MIT License.
