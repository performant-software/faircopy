const { autoUpdater } = require('electron-updater')
const log = require('electron-log')

const testActivationToken = 'activ-039efab62a98b94765e5cc382e5b7d43v3'

const checkForUpdates = function checkForUpdates( licenseData, config, sendToMainWindow ) {
    const { activated } = licenseData

    // Don't ask for updates if machine isn't activated
    if( !activated ) return

    autoUpdater.addAuthHeader(`Bearer ${testActivationToken}`)
    autoUpdater.autoDownload = false
    autoUpdater.logger = log

    autoUpdater.on('error', err => {
      log.info(`Autoupdate: ${err}`)
      sendToMainWindow('errorUpdating')
    })
  
    autoUpdater.on('update-downloaded', (...args) => {
      sendToMainWindow('updateDownloaded')
    })
  
    autoUpdater.on('download-progress', (progress) => {
      const percentDownloaded = Math.round(progress.percent)
      log.info(`downloading ${percentDownloaded}%`)
      sendToMainWindow('updateDownloading', percentDownloaded )
    }) 
  
    autoUpdater.on('update-available', () => {
      sendToMainWindow('updateAvailable')
    }) 

    log.info('Autoupdater: Checking for updates...')
    autoUpdater.checkForUpdates()
}

const downloadUpdate = function downloadUpdate(sendToMainWindow) {
  autoUpdater.downloadUpdate().then(() => {
    sendToMainWindow('updateDownloaded')
  }).catch( () => {
    sendToMainWindow('errorUpdating')
  })
}

exports.checkForUpdates = checkForUpdates
exports.downloadUpdate = downloadUpdate