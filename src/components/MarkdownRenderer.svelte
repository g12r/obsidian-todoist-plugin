<script lang="ts">
  import { Component, MarkdownRenderer } from "obsidian";
  import { onMount } from "svelte";

  export let content: string;

  let clazz: string | undefined = undefined;
  export { clazz as class };

  let containerEl: HTMLDivElement;

  onMount(async () => {
    await MarkdownRenderer.renderMarkdown(content, containerEl, "", this);

    if (containerEl.childElementCount > 1) {
      return;
    }

    const markdownContent = containerEl.querySelector("p");

    if (markdownContent) {
      markdownContent.parentElement.removeChild(markdownContent);
      containerEl.innerHTML = markdownContent.innerHTML;
    }
  });
</script>

<div bind:this={containerEl} class={clazz} />
