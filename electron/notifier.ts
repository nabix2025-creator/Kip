import { Notification } from 'electron'
import notifier from 'node-notifier'

export function notifyOs(title: string, body: string): void {
  if (Notification.isSupported()) {
    // Sound comes from the always-on-top alert window; keep Action Center entry quiet.
    new Notification({ title, body, silent: true }).show()
    return
  }
  notifier.notify({ title, message: body, wait: false, sound: false })
}
