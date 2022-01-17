const { autoUpdater } = require('electron-updater')
const log = require('electron-log')

const checkForUpdates = function checkForUpdates( licenseData, sendToMainWindow ) {
    const { activated } = licenseData
    const activationToken = licenseData.activationToken

    // Don't ask for updates if machine isn't activated
    if( !activated || !activationToken ) return

    autoUpdater.addAuthHeader(`Bearer ${activationToken}`)
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