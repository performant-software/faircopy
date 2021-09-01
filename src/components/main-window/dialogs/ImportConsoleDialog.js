import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ImportConsoleDialog extends Component {

    constructor(props) {
        super()
        this.initialState = {
            open: false,
            consoleBuffer: ''
        }
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('importOpened', (event, importData) => this.receiveImportData(importData))
    }

    receiveImportData( importData ) {
        // TODO read out the results of the import to the console log
        this.setState({...this.state, open: true })
    }

    // receiveImportData( importData ) {
    //     const { fairCopyProject } = this.props
    //     const { parentResourceID } = this.state
    //     const { error, errorMessage } = fairCopyProject.importResource(importData,parentResourceID)
    //     if( error ) {
    //         const alertOptions = { errorMessage }
    //         this.setState({...this.state, alertDialogMode: 'importError', alertOptions })
    //     } else {
    //         this.setState({...this.state})
    //     }
    // }
    
    render() {      
    
        const onClickClose = () => {
            this.setState(this.initialState)
        }

        // single panel of white text on black background
        // text buffer is in local state
        // listens for import requests then opens the window and does the thing
        const { open, consoleBuffer } = this.state
        
        return (
            <Dialog
                id="ImportConsoleDialog"
                open={open}
                onClose={onClickClose}
                aria-labelledby="import-texts-title"
                aria-describedby="import-texts-description"
            >
                <DialogTitle>Import Console</DialogTitle>
                <DialogContent>
                    { consoleBuffer }
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={onClickClose}>Close</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
