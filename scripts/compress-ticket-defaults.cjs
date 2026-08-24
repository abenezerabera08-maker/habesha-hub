const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const SRC_DIR = 'C:\\Users\\amell\\OneDrive\\Desktop\\habesha-hub files\\img'
const OUT_DIR = path.join(__dirname, '..', 'public', 'ticket-defaults')

const files = [
  { src: 'VIP.png', out: 'vip.jpg' },
  { src: 'Early Bird.png', out: 'earlybird.jpg' },
  { src: 'General Admission.png', out: 'ga.jpg' },
  { src: 'Backstage.png', out: 'backstage.jpg' },
  { src: 'Balcony and Rooftop.png', out: 'balcony.jpg' },
  { src: 'Jema.png', out: 'group.jpg' },
]

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const f of files) {
    const srcPath = path.join(SRC_DIR, f.src)
    const outPath = path.join(OUT_DIR, f.out)
    const before = fs.statSync(srcPath).size
    await sharp(srcPath)
      .resize({ width: 900, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(outPath)
    const after = fs.statSync(outPath).size
    console.log(`${f.src} -> ${f.out}: ${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024).toFixed(0)}KB`)
  }
}

run().catch(err => { console.error(err); process.exit(1) })
