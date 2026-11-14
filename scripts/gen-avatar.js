const sharp = require('sharp');

const svg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="128" fill="url(#bg)"/>
  <text x="128" y="85" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="bold" fill="white">TropiGO</text>
  <text x="128" y="175" text-anchor="middle" font-family="Arial,sans-serif" font-size="80" fill="white">T</text>
</svg>`;

sharp(Buffer.from(svg))
  .resize(256, 256)
  .png()
  .toFile('public/avatar-tropigo.png')
  .then(() => console.log('avatar-tropigo.png created OK'))
  .catch(e => console.error(e));
