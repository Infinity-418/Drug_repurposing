# Showing Nebula To An Investigator

Because this app has both a React frontend and a FastAPI backend, sharing it is slightly different from sharing a static website.

## Option 1: Show It On Your Laptop

This is the easiest and most reliable method.

```bash
./run.sh
```

Open:

```text
http://localhost:5173
```

This is good for an in-person demo or screen sharing on Zoom/Meet.

## Option 2: Let Them Open It On The Same Wi-Fi

Use this when the investigator is near you and connected to the same Wi-Fi.

Start the backend:

```bash
cd "Nebulla project 3"
source backend/venv/bin/activate
PYTHONPATH="$PWD" python3 -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

Start the frontend in another terminal:

```bash
cd "Nebulla project 3/frontend"
npm run dev -- --host 0.0.0.0
```

Find your Mac IP address:

```bash
ipconfig getifaddr en0
```

Then give them:

```text
http://YOUR_IP_ADDRESS:5173
```

Example:

```text
http://192.168.1.25:5173
```

Important: if macOS asks about firewall/network permission, allow Node/Python for the demo.

## Option 3: Temporary Public Link

For a quick remote demo, use a tunnel tool such as ngrok or Cloudflare Tunnel.

Example idea:

```bash
ngrok http 5173
```

This gives a temporary public URL. Keep your backend/frontend running locally while they use the link.

## Option 4: Proper Online Deployment

For a more permanent link:

- Deploy the frontend on Vercel or Netlify.
- Deploy the FastAPI backend on Render, Railway, Fly.io, or a university server.
- Update the frontend API configuration so `/api` requests go to the hosted backend.

GitHub Pages alone is not enough for the full app, because GitHub Pages only hosts static frontend files and cannot run the FastAPI backend.

## Recommended For Investigator Demo

Use **Option 1** for in-person or screen-share demos.

Use **Option 2** if the investigator wants to click around on their own device in the same room.

Use **Option 4** only if you need a stable public URL for multiple people.
