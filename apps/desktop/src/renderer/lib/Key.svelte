<script lang="ts">
  interface Props {
    label: string
  }

  let { label }: Props = $props()
</script>

<kbd>{label}</kbd>

<style>
  kbd {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border: 1px solid var(--cd-border);
    border-radius: var(--cd-radius-sm);
    background: var(--cd-surface-raised);
    color: var(--cd-text);
    font-family: var(--cd-font-mono);
    font-size: 11px;
    line-height: 1;
  }
</style>
