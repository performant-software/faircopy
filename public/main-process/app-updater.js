const { NsisUpdater, MacUpdater, AppImageUpdater } = require("electron-updater")
const log = require('electron-log')
const { platform } = process

let autoUpdater = null

const checkForUpdates = function checkForUpdates( licenseData, config, sendToMainWindow ) {
    const { licenseKey, machineID, activated } = licenseData

    // Don't ask for updates if machine isn't activated
    if( !activated ) return

    const productID = config.devMode ? config.devChannelID : config.productionChannelID
    const keygenDistURL = `https://dist.keygen.sh/v1/${config.keyGenAccountID}/${productID}/releases/${platform}?key=${licenseKey}&fingerprint=${machineID}`
    
    autoUpdater = createAutoUpdater( {
      autoDownload: false,
      url: keygenDistURL,
      provider: 'generic',
      channel: 'latest',
      logger: log
    })

    autoUpdater.on('error', err => {
      log.info(`Autoupdate: ${err}`)
      sendToMainWindow('errorUpdating')
    })
  
    autoUpdater.on('update-downloaded', (...args) => {
      sendToMainWindow('updateDownloaded')
    })
  
    autoUpdater.on('download-progress', (progress,bytesPerSecond,percent,total,transferred) => {
      sendToMainWindow('updateDownloading', percent )
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

function createAutoUpdater(options) {
  let updater

  if (platform === "win32") {
    updater = new NsisUpdater(options)
  }
  else if (platform === "darwin") {
    updater = new MacUpdater(options)
  }
  else {
    updater = new AppImageUpdater(options)
  }

  return updater
}

exports.checkForUpdates = checkForUpdates
exports.downloadUpdate = downloadUpdate