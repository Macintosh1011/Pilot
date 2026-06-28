# BoothPilot — iPad kiosk shell

A thin native SwiftUI shell wrapping a fullscreen `WKWebView`. All of the UI, voice
loop, QR scanning, demo view and badge live in the web app (`../web`); the native
side only does kiosk concerns: auto-grant mic/camera, disable auto-lock, fullscreen.

## Run

```bash
brew install xcodegen          # one-time
cd ios
xcodegen generate              # writes BoothPilot.xcodeproj from project.yml
open BoothPilot.xcodeproj
```

Then start the web app (`cd ../web && pnpm dev`) and run the iPad target. The WebView
loads `BoothWebURL` (defaults to `http://localhost:3000`).

### Point at a real iPad / LAN

On a physical iPad, `localhost` is the iPad itself — set the Mac's LAN address instead.
Either edit `BoothWebURL` in `project.yml` and regenerate, or override per-device:

```bash
# in the running app's container — or set via the Xcode scheme env / MDM
defaults write dev.parkt.boothpilot BoothWebURL "http://192.168.1.42:3000"
```

### Kiosk lock (demo day)

Settings → Accessibility → Guided Access → on. Triple-click the side button in the app
to lock to a single app. Keep the iPad on the charger.
