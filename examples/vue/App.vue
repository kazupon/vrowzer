<script setup lang="ts">
import HelloWorld from './HelloWorld.vue'
import vrowserLogo from './vrowser.svg'
import vueLogo from './vue.svg'
</script>

<template>
  <div>
    <a href="https://github.com/kazupon/vrowser" target="_blank">
      <img :src="vrowserLogo" class="logo" alt="Vrowser logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img :src="vueLogo" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vrowser + Vue + Vite" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
