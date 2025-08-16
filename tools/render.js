import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const OUT_DIR = path.resolve('out')
const FRAMES_DIR = path.join(OUT_DIR, 'frames')
const PREVIEW_CMD = 'npm'
const PREVIEW_ARGS = ['run', 'preview']
const PREVIEW_URL = 'http://localhost:4175/?render=1'

const BUILD_CMD = 'npm'
const BUILD_ARGS = ['run', 'build']

const args = process.argv.slice(2)
const audioFileArg = args.find(arg => arg.startsWith('--audio='))
const AUDIO_FILE = audioFileArg ? audioFileArg.split('=')[1] : 'src/assets/sound.mp3'

async function ensureDirs() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FRAMES_DIR, { recursive: true })
}

function waitForBuilding(proc){
  return new Promise((resolve, reject) => {
    let resolved = false
    proc.stdout.on('data', (b) => {
      const s = b.toString()
      console.log(s)
      if (!resolved && s.includes('built in') ) {
        resolved = true
        resolve()
      }
    })
    proc.stderr.on('data', (b) => console.error(b.toString()))
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error('build exited early: ' + code))
    })
  })
}

function waitForServerReady(proc) {
  return new Promise((resolve, reject) => {
    let resolved = false
    proc.stdout.on('data', (b) => {
      const s = b.toString()
      console.log(s)
      if (!resolved && s.includes('localhost:') && s.includes('4175')) {
        resolved = true
        resolve()
      }
    })
    proc.stderr.on('data', (b) => console.error(b.toString()))
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error('preview server exited early: ' + code))
    })
  })
}

async function renderFrames() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security',
      '--allow-running-insecure-content',
    ],
  })
  try {
    const page = await browser.newPage()
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle0' })

    await page.waitForFunction(
      'window.__appReady === true && typeof window.__getMeta === "function" && typeof window.__startMedia === "function"',
      { timeout: 20000 },
    )

    const meta = await page.evaluate(() => window.__getMeta())
    const { fps, totalFrames, width, height } = meta

    await page.setViewport({ width: width, height: height, deviceScaleFactor: 1 })

    console.log(`Meta: ${width}x${height} @ ${fps}fps, ${totalFrames} frames`)

    await page.evaluate(() => window.__startMedia())
    console.log('Audio et vidéos démarrés')

    await new Promise((resolve) => setTimeout(resolve, 500))

    for (let i = 0; i < totalFrames; i++) {
      // Synchronize the frame with the media and wait for the result
      await page.evaluate((f) => {
        const result = window.__setFrame(f)
        // If it's a promise, wait for it, otherwise continue.
        return Promise.resolve(result)
      }, i)

      const file = path.join(FRAMES_DIR, `${String(i).padStart(5, '0')}.png`)
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } })

      if (i % 10 === 0 || i === totalFrames - 1) {
        process.stdout.write(`\rFrame ${i + 1}/${totalFrames}`)
      }
    }

    await page.evaluate(() => window.__pauseMedia())
    console.log('\nMédias arrêtés')
    process.stdout.write('\n')
    return { fps, width, height, totalFrames }
  } finally {
    await browser.close()
  }
}

function encodeVideo({ fps }) {
  return new Promise((resolve, reject) => {
    const output = path.join(OUT_DIR, 'video.mp4')
    const audioPath = path.resolve(AUDIO_FILE)

    const audioExists = fs.existsSync(audioPath)

    let args
    if (audioExists) {
      console.log('Audio found, added sound to video...')
      args = [
        '-y',
        '-framerate', String(fps),
        '-i', path.join(FRAMES_DIR, '%05d.png'), // Frames vidéo
        '-i', audioPath, // Fichier audio
        '-c:v', 'libx264',
        '-c:a', 'aac', // Codec audio
        '-pix_fmt', 'yuv420p',
        '-r', String(fps),
        '-shortest', // Arrêter à la fin du média le plus court
        output,
      ]
    } else {
      console.log('No audio found, video creation without sound...')
      args = [
        '-y',
        '-framerate', String(fps),
        '-i', path.join(FRAMES_DIR, '%05d.png'),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', String(fps),
        output,
      ]
    }

    console.log('FFmpeg:', args.join(' '))
    const ff = spawn('ffmpeg', args, { stdio: 'inherit' })
    ff.on('exit', (code) =>
      code === 0 ? resolve(output) : reject(new Error('ffmpeg failed ' + code)),
    )
  })
}

async function main() {
  await ensureDirs()

  // Show configuration information
  console.log(`Fichier audio configuré: ${AUDIO_FILE}`)

  // Run build
  console.log('Starting building…')
  const build = spawn(BUILD_CMD, BUILD_ARGS, { stdio: ['ignore', 'pipe', 'pipe'] })
  await waitForBuilding(build)

  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Run vite preview
  console.log('Starting preview server…')
  const preview = spawn(PREVIEW_CMD, PREVIEW_ARGS, { stdio: ['ignore', 'pipe', 'pipe'] })
  await waitForServerReady(preview)

  console.log('Preview server started, rendering frames…')

  try {
    const meta = await renderFrames()
    const outfile = await encodeVideo(meta)
    console.log('✅ Video prête :', outfile)
  } finally {
    // Stop the preview server
    preview.kill('SIGINT')
  }
}

main().then(() => {
  process.exit(0)
})
  .catch(async (e) => {
  console.error(e)

  await executeCommand('kill -9 $(lsof -t -i:4175)')

  process.exit(1)
})

async function executeCommand(command) {
  const { exec } = await import('child_process')
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`)
      }
      if (stderr) {
        reject(`Stderr: ${stderr}`)
      }
      resolve(stdout)
    })
  })
}

process.on('SIGINT', async function () {
  console.log('The main process was terminated with CTRL+C')

  await executeCommand('kill -9 $(lsof -t -i:4175)')

  process.exit(0)
})
