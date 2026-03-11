<script lang="ts">
  import svelteLogo from './svelte.svg'
  import vrowserLogo from './vrowser.svg'
  import Counter from './Counter.svelte'
</script>

<main>
  <div>
    <a href="https://github.com/kazupon/vrowser" target="_blank" rel="noreferrer">
      <img src={vrowserLogo} class="logo" alt="Vrowser Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank" rel="noreferrer">
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>
  <h1>Vrowser + Svelte</h1>

  <div class="card">
    <Counter />
  </div>

  <p class="read-the-docs">
    Click on the Vrowser and Svelte logos to learn more
  </p>
</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .read-the-docs {
    color: #888;
  }
</style>
