<template>
  <div class="fixed bottom-50 left-0 w-full z-5">
    <div class="p-4 rounded text-center text-white content ">
      <div v-for="(p, idxP) in paragraph" :key="idxP" v-show="currentParagraphIndex === idxP">
          <span
            v-for="(token, idx) in p.tokens"
            :key="idx"
            class="text mx-2"
            :class="{ 'active mx-3': currentWorldSelectedIndex === p.tokenIndexIncluded[idx] }"
          >
            {{ token }}
          </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { injectCompositionContext } from '@/components/RootComposition.vue'

const { timeInSeconds } = injectCompositionContext()

const props = defineProps<{
  captions: {
    start: number
    stop: number
    text: string
  }[],
  maxWordsByParagraphs: number
}>()

const currentParagraphIndex = ref(0)
const currentWorldSelectedIndex = ref(0)

type Paragraph = {
  tokens: string[]
  tokenIndexIncluded: number[]
}

const paragraph = computed<Paragraph[]>(() => {
  const wordsPerParagraph = props.maxWordsByParagraphs

  const words = props.captions
    .map((item) => item.text)
    .join(' ')
    .split(' ')

  const p: Paragraph[] = []

  let currentP = 0

  words.forEach((word, index) => {
    if (index !== 0 && index % wordsPerParagraph === 0) {
      currentP++
    }

    if (!p[currentP]) {
      p[currentP] = {
        tokens: [],
        tokenIndexIncluded: [],
      }
    }

    p[currentP].tokens.push(word)
    p[currentP].tokenIndexIncluded.push(index)
  })

  return p
})

let currentWordIndex = 0

watch(timeInSeconds, (currentTime) => {
  const index = props.captions.findIndex((item) => {
    return currentTime >= item.start / 1000 && currentTime <= item.stop / 1000
  })

  if (index !== currentWordIndex) {
    if (currentWordIndex !== -1) {
      currentWorldSelectedIndex.value = -1
    }

    if (index !== -1) {
      currentWorldSelectedIndex.value = index
    }

    currentParagraphIndex.value = paragraph.value.findIndex((p) =>
      p.tokenIndexIncluded.some((item) => item === index),
    )

    currentWordIndex = index
  }
})
</script>


<style scoped>
.text {
  display: inline-block;
  transform: scale(1);
  transition:
    color 0.3s ease,
    transform 0.3s ease;

  font-size: 50px;
  color: white;
  font-family: 'Poppins', 'Montserrat', 'Arial Black', sans-serif;
  font-weight: 800;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8);
  letter-spacing: 1px;

  &.active {
    color: #6b54c4;
    transform: scale(1.05);
    text-shadow: 3px 3px 10px rgba(107, 84, 196, 0.6);
  }
}
</style>
