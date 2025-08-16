<template>
  <audio
    v-if="isVisible"
    class="hidden"
    ref="soundRef"
    :src="src"
    preload="metadata"
    @loadedmetadata="onAudioLoaded"
    @loadeddata="onAudioDataLoaded"
    @canplay="onAudioCanPlay"
    @error="onAudioError"
    @timeupdate="(e) => $emit('timeupdate', e)"
  ></audio>
</template>

<script lang="ts" setup>
import { injectCompositionContext } from '@/components/RootComposition.vue'
import { useTemplateRef, watch, computed, nextTick, onMounted } from 'vue'

interface Props {
  src: string
  startTime: number // In seconds - when the audio starts to appear
  endTime?: number // In seconds - when audio fades out (optional)
  offsetInAudio?: number // Offset in the source audio (to start from a specific time)
}

defineEmits<{
  (e: 'timeupdate', event: Event): void
}>()

const props = withDefaults(defineProps<Props>(), {
  offsetInAudio: 0,
})

const { timeInSeconds, isPlaying, isRender: isRenderMode } = injectCompositionContext()

const soundRef = useTemplateRef<HTMLAudioElement>('soundRef')

// Calculate if the audio should be visible
const isVisible = computed(() => {
  const currentTime = timeInSeconds.value
  const visible =
    currentTime >= props.startTime && (props.endTime === undefined || currentTime < props.endTime)
  return visible
})

// Calculate the relative time in this audio
const relativeTime = computed(() => {
  if (!isVisible.value) return 0
  return Math.max(0, timeInSeconds.value - props.startTime + props.offsetInAudio)
})

// Variables to avoid looping adjustments
let lastSyncTime = 0
let isManualSeek = false
let audioLoaded = false
let audioDataLoaded = false
let audioCanPlay = false

function onAudioLoaded() {
  audioLoaded = true
  console.log(`[AudioSegment] Metadata loaded for: ${props.src}`)
}

function onAudioDataLoaded() {
  audioDataLoaded = true
  console.log(`[AudioSegment] Data loaded for: ${props.src}`)
}

function onAudioCanPlay() {
  audioCanPlay = true
  console.log(`[AudioSegment] Can play: ${props.src}`)

// If audio is visible and playing, start
  if (isVisible.value && isPlaying.value && !isRenderMode) {
    soundRef.value?.play().catch(console.warn)
  }
}

function onAudioError(error: Event) {
  console.error(`[AudioSegment] Error loading audio: ${props.src}`, error)
}

// Synchronize audio to relative time
watch(relativeTime, async (newRelativeTime) => {
  if (!soundRef.value || !audioCanPlay || !isVisible.value) return

  const now = performance.now()
  const targetTime = newRelativeTime
  const currentTime = soundRef.value.currentTime
  const timeDiff = Math.abs(currentTime - targetTime)

  if (isRenderMode) {
    // In render mode, precise and immediate synchronization to avoid jerks
    if (timeDiff > 0.02) {
      // Very low threshold for rendering (1/50th of a second)
      soundRef.value.currentTime = targetTime
    }
  } else {
    // Avoid too frequent adjustments (max 1 time per 50ms)
    if (now - lastSyncTime < 50 && !isManualSeek) return

    // Wider tolerance threshold to avoid micro-adjustments
    if (timeDiff > 0.15) {
      isManualSeek = true
      soundRef.value.currentTime = targetTime
      lastSyncTime = now

      // Wait for the seek to complete
      await nextTick()
      setTimeout(() => {
        isManualSeek = false
      }, 100)
    }
  }
})

// Manage play/pause when audio becomes visible
watch(isVisible, async (visible) => {
  if (!soundRef.value) return

  if (visible) {
    // Wait until the audio is in the DOM and preloaded
    await nextTick()
    if (audioCanPlay && isPlaying.value && !isRenderMode) {
      soundRef.value.play().catch(console.warn)
    }
    // Immediately synchronize time
    if (audioCanPlay) {
      soundRef.value.currentTime = relativeTime.value
    }
  } else {
    soundRef.value.pause()
  }
})

// Manage global play/pause
watch(isPlaying, (playing) => {
  if (!soundRef.value || !isVisible.value || !audioCanPlay) return

  if (playing && !isRenderMode) {
    soundRef.value.play().catch(console.warn)
  } else {
    soundRef.value.pause()
  }
})

// Initialize the audio on mount if it should be visible
onMounted(async () => {
  if (isVisible.value && soundRef.value) {
    await nextTick()
    // Set the initial time when audio can be played
    if (audioCanPlay) {
      soundRef.value.currentTime = relativeTime.value
      if (isPlaying.value && !isRenderMode) {
        soundRef.value.play().catch(console.warn)
      }
    }
  }
})
</script>
