# Brand assets

Drop the official B2 Consultants logo here so it can be wired into the app shell.

Expected file (any one is fine — SVG preferred for crispness on the big screen):

- `b2-logo.svg` — preferred, white/monochrome version (transparent background)
- `b2-logo.png` — fallback (the white-on-transparent PNG works on the dark theme)

Once the file is present, the Header (`src/components/Header.tsx`) will be
switched from the placeholder "G" mark to this logo via `next/image`.
