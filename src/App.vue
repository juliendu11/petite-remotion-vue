<template>
  <RootComposition :duration="35" :width="1080" :height="1920" :fps="60" :set-background="false">
    <MyScene></MyScene>
  </RootComposition>
</template>

<script lang="ts" setup>
import RootComposition from '@/components/RootComposition.vue'
import MyScene from '@/components/MyScene.vue'
</script>
