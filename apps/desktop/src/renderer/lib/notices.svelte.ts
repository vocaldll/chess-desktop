export type NoticeSource = 'fullscreen' | 'mute'

export type NoticeIcon = 'fullscreen' | 'sound-on' | 'sound-off'

export interface Notice {
  source: NoticeSource
  icon: NoticeIcon
  title: string
  keys: readonly string[]
  action: string
}

class Notices {
  current = $state<Notice | null>(null)

  show(notice: Notice): void {
    this.current = { ...notice }
  }

  clear(source: NoticeSource): void {
    if (this.current?.source === source) {
      this.current = null
    }
  }
}

export const notices = new Notices()
