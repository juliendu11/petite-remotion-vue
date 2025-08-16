<template>
  <video
    v-if="isVisible"
    ref="videoRef"
    :src="src"
    muted
    preload="metadata"
    :class="videoClass"
    @loadedmetadata="onVideoLoaded"
    @loadeddata="onVideoDataLoaded"
    @canplay="onVideoCanPlay"
    @error="onVideoError"
  ></video>
</template>

<script lang="ts" setup>
import { injectCompositionContext } from '@/components/RootComposition.vue'
import { useTemplateRef, watch, computed, nextTick, onMounted } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    startTime: number // In seconds - when the video starts to appear
    endTime?: number // In seconds - when the video disappears (optional)
    videoClass?: string
    offsetInVideo?: number // Offset in the source video (to start from a specific time)
  }>(),
  {
    offsetInVideo: 0,
  },
)

const { timeInSeconds, isPlaying, isRender: isRenderMode } = injectCompositionContext()

const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')

// Calculate if the video should be visible
const isVisible = computed(() => {
  const currentTime = timeInSeconds.value
  const visible =
    currentTime >= props.startTime && (props.endTime === undefined || currentTime < props.endTime)
  return visible
})

// Calculate relative time in this video
const relativeTime = computed(() => {
  if (!isVisible.value) return 0
  return Math.max(0, timeInSeconds.value - props.startTime + props.offsetInVideo)
})

// Variables pour éviter les ajustements en boucle
let lastSyncTime = 0
let isManualSeek = false
let videoLoaded = false
let videoDataLoaded = false
let videoCanPlay = false

function onVideoLoaded() {
  videoLoaded = true
  console.log(`[VideoSegment] Metadata loaded for: ${props.src}`)
}

function onVideoDataLoaded() {
  videoDataLoaded = true
  console.log(`[VideoSegment] Data loaded for: ${props.src}`)
}

function onVideoCanPlay() {
  videoCanPlay = true
  console.log(`[VideoSegment] Can play: ${props.src}`)

  // If the video is visible and playing, start
  if (isVisible.value && isPlaying.value && !isRenderMode) {
    videoRef.value?.play().catch(console.warn)
  }
}

function onVideoError(error: Event) {
  console.error(`[VideoSegment] Error loading video: ${props.src}`, error)
}

// Synchronize video with relative time
watch(relativeTime, async (newRelativeTime) => {
  if (!videoRef.value || !videoCanPlay || !isVisible.value) return

  const now = performance.now()
  const targetTime = newRelativeTime
  const currentTime = videoRef.value.currentTime
  const timeDiff = Math.abs(currentTime - targetTime)

  if (isRenderMode) {
    // In render mode, precise and immediate synchronization to avoid jerks
    if (timeDiff > 0.02) {
      // Very low threshold for rendering (1/50th of a second)
      videoRef.value.currentTime = targetTime
    }
  } else {
    // In preview mode, avoid making too frequent adjustments
    if (now - lastSyncTime < 20 && !isManualSeek) return

    // Wider tolerance threshold to avoid micro-adjustments
    if (timeDiff > 0.2) {
      isManualSeek = true
      videoRef.value.currentTime = targetTime
      lastSyncTime = now

      // Wait for the seek to complete
      await nextTick()
      setTimeout(() => {
        isManualSeek = false
      }, 100)
    }
  }
})

// Manage play/pause when the video becomes visible
watch(isVisible, async (visible) => {
  if (!videoRef.value) return

  if (visible) {
    // Wait until the video is in the DOM and preloaded
    await nextTick()
    if (videoCanPlay && isPlaying.value && !isRenderMode) {
      videoRef.value.play().catch(console.warn)
    }
    // Immediately synchronize time
    if (videoCanPlay) {
      videoRef.value.currentTime = relativeTime.value
    }
  } else {
    videoRef.value.pause()
  }
})

// Manage global play/pause
watch(isPlaying, (playing) => {
  if (!videoRef.value || !isVisible.value || !videoCanPlay) return

  if (playing && !isRenderMode) {
    videoRef.value.play().catch(console.warn)
  } else {
    videoRef.value.pause()
  }
})

// Initialize the video when editing if it should be visible
onMounted(async () => {
  if (isVisible.value && videoRef.value) {
    await nextTick()
    // Set the initial time when the video can be played
    if (videoCanPlay) {
      videoRef.value.currentTime = relativeTime.value
      if (isPlaying.value && !isRenderMode) {
        videoRef.value.play().catch(console.warn)
      }
    }
  }
})
</script>
