import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

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
        this.el = null
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('importData', (event, importData) => this.receiveImportData(importData))
    }

    receiveImportData( importData ) {
        const { consoleLines, successCount, totalCount } = this.state
        const { fairCopyProject, parentResourceID } = this.props
        const nextConsole = [ ...consoleLines ]
        let success = false, done = false

        if( importData === 'import-start' ) {
            nextConsole.push(`Starting import...`)
            this.setState({...this.state, open: true, consoleLines: nextConsole })
            return
        } else if( importData === 'import-end' ) {
            done = true
            const s = successCount !== 1 ? 's' : ''
            nextConsole.push(`Import finished. ${successCount} out of ${totalCount} file${s} imported.`)
        } else {
            const filename = fairCopy.services.getBasename(importData.path).trim()
            nextConsole.push(`Importing file ${filename}...`)
            const { error, errorMessage } = fairCopyProject.importResource(importData,parentResourceID)
            if( error ) {
                nextConsole.push(errorMessage)
            } else {
                success = true
            }
        }

        if( this.el ) {
            this.el.scrollTop = this.el.scrollHeight - this.el.clientHeight;
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
                <p key={`console-line-${lineNumber++}`} variant='body2'>{consoleLine}</p>
            )
        }

        return consoleLineEls
    }
    
    render() {      
    
        const onClose = () => {
            this.setState(this.initialState)
        }

        const onRef = (el) => {
            this.el = el
        }

        // file names instead of full paths
        // color coding for errors and done message
        // make use of import options

        const { open, done } = this.state
        
        return (
            <Dialog
                id="ImportConsoleDialog"
                open={open}
                onClose={onClose}
                aria-labelledby="import-console-title"
                aria-describedby="import-console-description"
            >
                <DialogTitle>
                    Import Console 
                    { !done && <img className='spinner' alt='loading images' src='img/spinner.gif'></img> }
                </DialogTitle>
                <DialogContent>
                    <div ref={onRef} className='import-console'>
                        { this.renderConsoleLines() }
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button disabled={!done} color='primary' variant="contained" onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
