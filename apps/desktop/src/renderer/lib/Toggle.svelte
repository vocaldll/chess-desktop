<script lang="ts">
  interface Props {
    checked: boolean
    label: string
    disabled?: boolean
    onchange: (value: boolean) => void
  }

  let { checked, label, disabled = false, onchange }: Props = $props()
</script>

<label class="toggle" class:disabled>
  <input
    type="checkbox"
    aria-label={label}
    {checked}
    {disabled}
    onchange={(event) => onchange(event.currentTarget.checked)}
  />
  <span class="track"><span class="thumb"></span></span>
</label>

<style>
  .toggle {
    position: relative;
    display: inline-flex;
    flex: none;
    cursor: pointer;
  }

  .toggle.disabled {
    cursor: default;
    opacity: 0.4;
  }

  input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }

  .track {
    display: block;
    width: 40px;
    height: 22px;
    padding: 3px;
    border-radius: 999px;
    background: var(--cd-surface-hover);
    transition: background var(--cd-transition);
  }

  .thumb {
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--cd-text-muted);
    transition: transform var(--cd-transition), background var(--cd-transition);
  }

  input:checked + .track {
    background: var(--cd-brand);
  }

  input:checked:hover:not(:disabled) + .track {
    background: var(--cd-brand-hover);
  }

  input:checked + .track .thumb {
    background: var(--cd-accent-contrast);
    transform: translateX(18px);
  }

  input:focus-visible + .track {
    outline: 2px solid var(--cd-accent);
    outline-offset: 2px;
  }
</style>
