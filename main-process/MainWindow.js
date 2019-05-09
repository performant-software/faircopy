const { BrowserWindow, dialog, Menu } = require('electron')

const isMac = true

class MainWindow {

    constructor(app, onClose) {
        
        this.app = app
        this.onClose = onClose

        const template = this.mainMenuTemplate()
        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)
        // Create the browser window.
        this.window = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true
            }
        })

        // Emitted when the window is closed.
        this.window.on('closed', this.onClose )

        // and load the index.html of the app.
        this.window.loadFile('../../../../../../../index.html')

        // Open the DevTools.
        this.window.webContents.openDevTools()
    }

    openFileMenu() {
        dialog.showOpenDialog( {
            properties: [ 'openFile', 'openDirectory']
        }, (files) => {
            files
        })
    }

    mainMenuTemplate() {
        return [
          // { role: 'appMenu' }
          ...(process.platform === 'darwin' ? [{
            label: this.app.getName(),
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideothers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }] : []),
          // { role: 'fileMenu' }
          {
            label: 'File',
            submenu: [
              { 
                label: 'Open',
                click () { this.openFileMenu() }
              },
              { role: 'close' }
            ]
          },
          // { role: 'editMenu' }
          {
            label: 'Edit',
            submenu: [
              { role: 'undo' },
              { role: 'redo' },
              { type: 'separator' },
              { role: 'cut' },
              { role: 'copy' },
              { role: 'paste' },
              ...(isMac ? [
                { role: 'pasteAndMatchStyle' },
                { role: 'delete' },
                { role: 'selectAll' },
                { type: 'separator' },
                {
                  label: 'Speech',
                  submenu: [
                    { role: 'startspeaking' },
                    { role: 'stopspeaking' }
                  ]
                }
              ] : [
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
              ])
            ]
          },
          // { role: 'viewMenu' }
          {
            label: 'View',
            submenu: [
              { role: 'reload' },
              { role: 'forcereload' },
              { role: 'toggledevtools' },
              { type: 'separator' },
              { role: 'resetzoom' },
              { role: 'zoomin' },
              { role: 'zoomout' },
              { type: 'separator' },
              { role: 'togglefullscreen' }
            ]
          },
          // { role: 'windowMenu' }
          {
            label: 'Window',
            submenu: [
              { role: 'minimize' },
              { role: 'zoom' },
              ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
              ] : [
                { role: 'close' }
              ])
            ]
          },
          {
            role: 'help',
            submenu: [
              {
                label: 'Learn More',
                click () { require('electron').shell.openExternalSync('https://electronjs.org') }
              }
            ]
          }
        ]
    }
}

exports.MainWindow = MainWindow