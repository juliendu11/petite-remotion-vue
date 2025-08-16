import { nodewhisper } from 'nodejs-whisper'
import { writeFile} from "node:fs/promises"
import {resolve} from "node:path"

const __dirname = import.meta.dirname

const sourcePath =resolve(__dirname, '..','src','assets', 'sound.mp3')

function parseTimedLines(content) {
  const lineRE =
    /^\s*\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+?)\s*$/

  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => {
      const m = l.match(lineRE)
      if (!m) return null
      const [, start, stop, rawText] = m
      const text = rawText.replace(/\s+/g, ' ').trim() // normalise les espaces
      return { text, start, stop }
    })
    .filter(Boolean)
}

function timeToMilliseconds(timeStr) {
  const [h, m, s] = timeStr.split(':')
  const [sec, ms = 0] = s.split('.')

  return (
    Number.parseInt(h, 10) * 3600000 + // heures → ms
    Number.parseInt(m, 10) * 60000 + // minutes → ms
    Number.parseInt(sec, 10) * 1000 + // secondes → ms
    Number.parseInt(ms.toString(), 10) // millisecondes
  )
}

const data = await nodewhisper(sourcePath, {
  modelName: 'medium', //Downloaded models name
  autoDownloadModelName: 'medium', // (optional) auto download a model if model is not present
  removeWavFileAfterTranscription: true, // (optional) remove wav file once transcribed
  withCuda: false, // (optional) use cuda for faster processing
  // logger: console, // (optional) Logging instance, defaults to console
  whisperOptions: {
    outputInCsv: false, // get output result in csv file
    outputInJson: false, // get output result in json file
    outputInJsonFull: false, // get output result in json file including more information
    outputInLrc: false, // get output result in lrc file
    outputInSrt: false, // get output result in srt file
    outputInText: false, // get output result in txt file
    outputInVtt: false, // get output result in vtt file
    outputInWords: true, // get output result in wts file for karaoke - ACTIVÉ pour mot par mot
    translateToEnglish: false, // translate from source language to english
    wordTimestamps: true, // word-level timestamps
    timestamps_length: 1, // 1 mot par timestamp au lieu de 20
    splitOnWord: true, // split on word rather than on token
  },
})

const result = parseTimedLines(data).map((line) => {
  return line
    ? {
      start: timeToMilliseconds(line.start),
      stop: timeToMilliseconds(line.stop),
      text: line.text,
    }
    : null
})

await writeFile(resolve(__dirname, '..','src', 'assets', 'subtitles.json'), JSON.stringify(result))
