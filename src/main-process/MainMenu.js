const { Menu, dialog } = require('electron')
const { platform } = process

const isMac = (platform === 'darwin')

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

    openImport = () => {
      return dialog.showOpenDialogSync( {
        title: "Select text or xml files to import.",
        properties: [ 'openFile', 'multiSelections' ]
      })
    }

    openAddImage = () => {
      return dialog.showOpenDialogSync( {
        title: "Select images to add to this project.",
        filters: [ 
            { name: 'Image', extensions: ['jpg','png','gif','jpeg'] }
          ],
          properties: [ 'openFile', 'multiSelections' ]
      })
    }

    openExport = () => {
      return dialog.showOpenDialogSync( {
          title: "Select a target directory for export.",
          properties: [ 'openDirectory', 'createDirectory' ]
      })
    }

    closeProject = () => {
      this.fairCopyApplication.closeProject()
    }

    // openPrintDialog = () => {
    //   this.fairCopyApplication.sendToMainWindow('openPrint')
    // }

    selectPath = () => {
      return dialog.showSaveDialogSync( {
          filters: [ 
            { name: 'FairCopy Project', extensions: ['faircopy'] }
          ],
          properties: [ 'openFile', 'createDirectory' ]
      })   
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
            ...(isMac ? [{
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
            {
              label: 'File',
              submenu: [
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
                { 
                  label: 'Close Project',
                  accelerator: 'CommandOrControl+W',
                  click: this.closeProject
                },
              ]
            },
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
            {
              label: 'View',
              submenu: viewSubMenu
            },
            {
              label: 'Window',
              submenu: [
                { role: 'minimize' },
                ...(isMac ? [
                  { type: 'separator' },
                  { role: 'front' },
                  { type: 'separator' },
                  { role: 'zoom' },
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
                  click () { require('electron').shell.openExternal('https://faircopyeditor.com/') }
                }
              ]
            }
          ]
    }
}

exports.MainMenu = MainMenu