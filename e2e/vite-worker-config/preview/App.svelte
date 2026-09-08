<script lang="ts">
  import { label } from 'preview-lib'
  let count = $state(0)
</script>

<h1>Worker preview</h1>
<p id="worker-define">{__PREVIEW_ONLY__}</p>
<p id="worker-alias">{label}</p>
<p id="host-define">{typeof __HOST_ONLY__}</p>
<p id="spacing"><span>before</span>    <span>after</span></p>
<button id="counter" onclick={() => count++}>count: {count}</button>
