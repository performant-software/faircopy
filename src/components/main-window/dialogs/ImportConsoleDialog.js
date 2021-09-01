import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ImportConsoleDialog extends Component {

    constructor(props) {
        super()
        this.initialState = {
            open: false,
            done: false,
            successCount: 0,
            totalCount: 0,
            consoleLines: []
        }
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('importOpened', (event, importData) => this.receiveImportData(importData))
    }

    receiveImportData( importData ) {
        const { consoleLines, successCount, totalCount } = this.state
        const { fairCopyProject, parentResourceID } = this.props
        const nextConsole = [ ...consoleLines ]
        let success = false, done = false

        if( importData === 'done' ) {
            done = true
            const s = successCount !== 1 ? 's' : ''
            nextConsole.push(`Import finished. ${successCount} out of ${totalCount} file${s} imported.`)
        } else {
            nextConsole.push(`Importing file ${importData.path}...`)
            const { error, errorMessage } = fairCopyProject.importResource(importData,parentResourceID)
            if( error ) {
                nextConsole.push(errorMessage)
            } else {
                success = true
            }
        }

        const nextSuccessCount = success ? successCount+1 : successCount
        this.setState({...this.state, consoleLines: nextConsole, successCount: nextSuccessCount, totalCount: totalCount+1, done, open: true })
    }

    renderConsoleLines() {
        const { consoleLines } = this.state
        const consoleLineEls = []

        let lineNumber=1
        for( const consoleLine of consoleLines ) {
            consoleLineEls.push(
                <Typography key={`console-line-${lineNumber++}`} variant='body2'>{consoleLine}</Typography>
            )
        }

        return consoleLineEls
    }
    
    render() {      
    
        const onClose = () => {
            this.setState(this.initialState)
        }

        // single panel of white text on black background
        // overflow and fixed height

        const { open, done } = this.state
        
        return (
            <Dialog
                id="ImportConsoleDialog"
                open={open}
                onClose={onClose}
                aria-labelledby="import-console-title"
                aria-describedby="import-console-description"
            >
                <DialogTitle>Import Console</DialogTitle>
                <DialogContent>
                    { this.renderConsoleLines() }
                </DialogContent>
                <DialogActions>
                    <Button disabled={!done} variant="outlined" onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
