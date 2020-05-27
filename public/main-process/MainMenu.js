const { Menu, dialog } = require('electron')

// TODO detect PC
const isMac = true

class MainMenu {

    constructor(fairCopyApplication) {
      this.fairCopyApplication = fairCopyApplication      
      const template = this.mainMenuTemplate()
      const menu = Menu.buildFromTemplate(template)
      Menu.setApplicationMenu(menu)    
    }

    openFileMenu = () => {
        dialog.showOpenDialog( {
            filters: [ 
              { name: 'FairCopy Project', extensions: ['faircopy'] }
            ],
            properties: [ 'openFile' ]
        }).then(files => {
          if( files && files.filePaths.length > 0 ) {
            this.fairCopyApplication.openProject( files.filePaths[0] )
          }
        })
    }

    // openPrintDialog = () => {
    //   this.fairCopyApplication.sendToMainWindow('openPrint')
    // }

    newFileMenu = () => {
      dialog.showSaveDialog( {
          properties: [ 'openFile', 'createDirectory' ]
      }, (files) => {
        if( files && files.length > 0 ) {
          this.fairCopyApplication.sendToMainWindow('fileSaved', files)
        }
      })   
    }

    requestNewFile = () => {
      // TODO
    }

    mainMenuTemplate() {

        let viewSubMenu = [
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
  
        if( this.debugMode ) {
          viewSubMenu = [ ...viewSubMenu, 
            { role: 'reload' },
            { role: 'forcereload' },
            { role: 'toggledevtools' }        
          ]
        } 
  
          return [
            // { role: 'appMenu' }
            ...(process.platform === 'darwin' ? [{
              label: 'FairCopy',
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
                  label: 'New Project...',
                  accelerator: 'CommandOrControl+N',
                  click: this.requestNewFile
                },
                { 
                  label: 'Open Project...',
                  accelerator: 'CommandOrControl+O',
                  click: this.openFileMenu
                },
                // { 
                //   label: 'Print...',
                //   accelerator: 'CommandOrControl+P',
                //   click: this.openPrintDialog
                // },
                // { 
                //   label: 'Save',
                //   accelerator: 'CommandOrControl+S',
                //   click: this.requestSave
                // },
                // { 
                //   label: 'Save As...',
                //   click: this.requestSaveAs
                // },
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
              submenu: viewSubMenu
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
                  label: 'About',
                  click () { require('electron').shell.openExternalSync('https://www.performantsoftware.com') }
                }
              ]
            }
          ]
    }
}

exports.MainMenu = MainMenu