import { app, dialog } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

export function setupAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', (info) => {
    const version = info.version ? ` (${info.version})` : ''
    void dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update ready',
        message: `Kip update downloaded${version}`,
        detail: 'Restart to install the latest version.',
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on('error', (error) => {
    console.error('[updater]', error)
  })

  void autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('[updater] check failed', error)
  })
}
