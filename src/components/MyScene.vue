<template>
  <div class="scene">
    <!-- Only for preview, the audio file during rendering is injected by ffmepg -->
    <AudioSegment :src="sound" :start-time="0" />

    <!-- First video: 0 to 5 seconds -->
    <VideoSegment
      :src="video1"
      :start-time="0"
      :end-time="5"
      class="w-full h-full object-cover"
    />

    <!-- Second video: from 5 seconds to the end, starts at the beginning of the video -->
    <VideoSegment
      :src="video2"
      :start-time="5"
      :offset-in-video="0"
      class="w-full h-full object-cover"
      style="transform: scale(0.785) translateY(-280px)"
    />

   <VideoCaption :captions="subtitles" :max-words-by-paragraphs="10"/>
  </div>
</template>

<script lang="ts" setup>
import VideoSegment from '@/components/VideoSegment.vue'
import AudioSegment from '@/components/AudioSegment.vue'

import sound from "@/assets/sound.mp3"
import video1 from '@/assets/1.mp4'
import video2 from '@/assets/2.mp4'

import subtitles from '@/assets/subtitles.json'
import VideoCaption from '@/components/VideoCaption.vue'
</script>

<style scoped>
.scene {
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
}
</style>
