<template>
  <div class="composition">
    <header>
      <div>
        <div class="flex items-center gap-2">
          <label for="duration">Duration (s):</label>
          <input
            id="duration"
            type="number"
            min="1"
            max="30"
            step="1"
            v-model.number="durationSec"
          />
        </div>

        <div class="flex items-center gap-2">
          <label for="fps">FPS:</label>
          <input id="fps" type="number" min="1" max="120" step="1" v-model.number="fps" />
        </div>

        <div class="flex items-center gap-2">
          <label for="cFrame">Current frame:</label>
          <input id="cFrame" type="number" v-model="frame" readonly />
        </div>

        <div class="flex items-center gap-2">
          <label for="cSeconds">Current seconds:</label>
          <input id="cSeconds" type="number" v-model="timeInSecondsForIndicator" readonly />
        </div>
      </div>

      <div>
        <button
          id="preview-btn"
          @click="togglePreview"
          class="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 transition-colors"
        >
          {{ isPlaying ? 'Pause' : 'Preview' }}
        </button>
        <small style="opacity: 0.7">Resized preview, rendered in {{ width }}×{{ height }}.</small>
      </div>
    </header>

    <div class="viewport">
      <div class="stage" id="stage" :class="{ card: setBackground }">
        <slot
          :fps="fps"
          :frame="frame"
          :totalFrames="totalFrames"
          :durationSec="durationSec"
          :isPlaying="isPlaying"
          :timeInSeconds="timeInSeconds"
          :isRender="isRender"
        ></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useCreateContext } from '@/composables/useCreateContext'
import type { Ref, ComputedRef } from 'vue'

export type CompositionContext = {
  frame: Ref<number>
  durationSec: Ref<number>
  fps: Ref<number>
  totalFrames: ComputedRef<number>
  isPlaying: Ref<boolean>
  timeInSeconds: ComputedRef<number>
  isRender: boolean
}

export const [injectCompositionContext, provideCompositionContext] =
  useCreateContext<CompositionContext>('CompositionContext')
</script>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    width: number
    height: number
    duration: number
    fps: number
    setBackground?: boolean
  }>(),
  {
    width: 1080,
    height: 1920,
    fps: 60,
    setBackground: true,
  },
)

const frame = ref(0)

const durationSec = ref(props.duration)
const fps = ref(props.fps)

/** Timeline en FRAMES */
const totalFrames = computed(() => Math.round(durationSec.value * fps.value))

const timeInSeconds = computed(() => frame.value / fps.value)

const timeInSecondsForIndicator = computed(() => Math.round(timeInSeconds.value))

const injectVariablesToRoot = (name: string, value: string) => {
  const root = document.documentElement
  root.style.setProperty(name, value)
}

injectVariablesToRoot('--W', `${props.width}px`)
injectVariablesToRoot('--H', `${props.height}px`)

const isPlaying = ref(false)
let animationId: number | null = null

function startPreview() {
  isPlaying.value = true
  frame.value = 0

  let startTime = performance.now()
  const frameInterval = 1000 / fps.value

  function animate(currentTime: DOMHighResTimeStamp) {
    const elapsed = currentTime - startTime
    const currentFrame = Math.floor(elapsed / frameInterval)

    if (currentFrame >= totalFrames.value) {
      frame.value = 0
      startTime = currentTime
    } else {
      frame.value = currentFrame
    }

    if (isPlaying.value) {
      animationId = requestAnimationFrame(animate)
    }
  }

  animationId = requestAnimationFrame(animate)
}

function stopPreview() {
  isPlaying.value = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

const togglePreview = () => {
  if (isPlaying.value) {
    stopPreview()
  } else {
    startPreview()
  }
}

// Puppeteer
const isRender = new URL(location.href).searchParams.get('render') === '1'
if (isRender) document.body.classList.add('render')

// Adjusts the preview scale to fill the screen (outside of render)
function autoScale() {
  if (isRender) return
  const W = props.width
  const H = props.height

  const vw = innerWidth - 40
  const vh = innerHeight - 120

  const s = Math.min(vw / W, vh / H)

  injectVariablesToRoot('--scale', Math.max(0.2, Math.min(1, s)).toString())
}
addEventListener('resize', autoScale)

autoScale()

onMounted(() => {
  window.__setFrame = (f: number) => {
    frame.value = f
  }

  window.__getMeta = () => ({
    fps: fps.value,
    totalFrames: totalFrames.value,
    width: props.width,
    height: props.height,
  })

  // Media Controls for Puppeteer
  window.__startMedia = () => {
    // Preload all videos at the beginning
    const videos = document.querySelectorAll('video')
    videos.forEach((video) => {
      video.load() // Force le préchargement
      video.currentTime = 0
    })

    const audios = document.querySelectorAll('audio')
    audios.forEach((audio) => {
      audio.load() // Force le préchargement
      audio.currentTime = 0
    })
  }

  window.__pauseMedia = () => {
    const videos = document.querySelectorAll('video')
    videos.forEach((video) => {
      video.pause()
    })

    const audios = document.querySelectorAll('audio')
    audios.forEach((audio) => {
      audio.pause()
    })
  }

  window.__appReady = true
})

provideCompositionContext({
  fps,
  durationSec,
  totalFrames,
  frame,
  isPlaying,
  timeInSeconds,
  isRender,
})
</script>

<style scoped>
@reference "../assets/main.css";

.composition {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #222;
  background: #12151b;

  > div:first-of-type {
    display: flex;
    gap: 25px;
    align-items: center;
  }

  > div:last-of-type {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  input {
    width: 80px;
    @apply bg-gray-800 text-white border border-gray-700 rounded px-2 py-1;
  }
}

.viewport {
  display: grid;
  place-items: center;
  overflow: hidden;
}
.stage {
  width: var(--W);
  height: var(--H);
  transform-origin: top center;
  border-radius: 12px;
  overflow: hidden;
}
.stage.card {
  background: #000;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}
</style>
