# ShopoApp PWA Setup Guide

## Requirements
To ensure the Progressive Web App (PWA) functions properly:
1. **HTTPS is strictly required**: Service workers and PWA manifests only work over secure origins (HTTPS) or `localhost`.
2. **Valid Icons**: Standard and maskable icons must be served correctly. Placeholder SVGs have been placed in the `public/` directory for now.

## How to Test PWA Installation
### On Mobile (Android / Chrome)
1. Open the app URL in Google Chrome over HTTPS or localhost.
2. An "Install ShopoApp" prompt should automatically appear at the bottom of the screen.
3. Alternatively, tap the Chrome menu (three dots) and select **"Add to Home screen"** or **"Install app"**.
4. Once installed, it will appear on your device's home screen and launch without browser chrome.

### On Desktop (Chrome / Edge)
1. Open the app URL.
2. In the URL address bar, an installation icon (a computer with a down arrow) should appear on the right side.
3. Click it and select **"Install"**.
4. You can verify the manifest and service worker by opening Chrome DevTools (F12) > **Application** tab.

## Troubleshooting
- **No Install Prompt**: Ensure you are accessing the app over `https://` or `http://localhost`. Clear site data and unregister any old service workers in DevTools.
- **Service Worker Not Registering**: Check the DevTools Console. The script restricts registration to `https:` and `localhost`.
- **Icon Issues**: If replacing the placeholder SVG icons, ensure the new PNG files exactly match the filenames and paths defined in `public/manifest.json`.

## Verifying Functionality
- Go to the **Application** tab in Chrome DevTools.
- Under **Manifest**, verify that no errors are shown and icons are detected.
- Under **Service Workers**, verify that `sw.js` is registered and running.
- In the **Network** tab, check the "Offline" box and reload the page. The app shell and static assets should load via the Service Worker cache.