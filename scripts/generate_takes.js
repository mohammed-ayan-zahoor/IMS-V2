const fs = require('fs');
const path = require('path');

const voDir = path.join(process.cwd(), 'public', 'vo');
if (!fs.existsSync(voDir)) fs.mkdirSync(voDir, { recursive: true });

async function generateTake(text, filename) {
  const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=en-IN&client=tw-ob&q=' + encodeURIComponent(text);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  if (!res.ok) throw new Error('Failed ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(voDir, filename), buf);
  console.log('Saved:', filename, buf.length, 'bytes');
}

async function run() {
  console.log('Generating voice takes...');
  // Line 1:
  await generateTake("Running a school takes everything you've got. Every morning.", 'line1-take1.mp3');
  await generateTake("Every single morning... running a school takes everything you have.", 'line1-take2.mp3');
  await generateTake("Every morning. Running a school takes everything you've got.", 'line1-take3.mp3');

  // Line 2:
  await generateTake("Unless the system just does it for you.", 'line2-take1.mp3');
  await generateTake("Unless your system... handles it for you.", 'line2-take2.mp3');
  await generateTake("Unless the system does it for you.", 'line2-take3.mp3');

  console.log('All takes generated successfully.');
}

run();
