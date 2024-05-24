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
            subResourceCount: 0,
            importList: [],
            totalCount: 0,
            consoleLines: []
        }
        this.el = null
        this.state = this.initialState
    }

    onImportData = (event, importData) => this.receiveImportData(importData)

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('importData', this.onImportData )
    }

    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('importData', this.onImportData )
    }

    async receiveImportData( importData ) {        
        const { command } = importData
        const { consoleLines } = this.state
        const nextConsole = [ ...consoleLines ]
        
        if( command === 'start' ) {
            // store them all in a queue, open the dialog
            nextConsole.push(`Starting import...`)
            const {importList} = importData
            this.setState({...this.state, consoleLines: nextConsole, importList, open: true })            
        } 
        else if( command === 'error' ) {
            // There was an error reported by main process, display it and move on to next resource.
            const { successCount } = this.state
            nextConsole.push(importData.errorMessage)
            this.setState({ ...this.state, consoleLines: nextConsole, successCount: successCount-1, subResourceCount: 0 })
        }
        else if( command === 'next' ) {
            const { fairCopyProject, parentEntry } = this.props
            const { successCount, subResourceCount, totalCount, importList } = this.state

            // One import resource can generate many resources, count through them before continuing with next import.
            if( subResourceCount > 1 ) {
                this.setState({ ...this.state, subResourceCount: subResourceCount-1 })
                return
            }

            let success = false, done = false, nextSubResourceCount = 0
        
            const importItem = importList.pop()
            if( importItem ) {
                const resourceName = importItem.path ? fairCopy.services.getBasename(importItem.path).trim() : importItem.manifestID
                if( importItem.error ) {
                    if( importItem.error === 'too-big' ) {
                        nextConsole.push(`File is too large, 3MB max size: ${resourceName}`)
                    } else {
                        nextConsole.push(`Unable to read file: ${resourceName}`)
                    }                    
                } else {
                    nextConsole.push(`Importing file ${resourceName}...`)
                    const { error, errorMessage, resourceCount } = await fairCopyProject.importResource(importItem,parentEntry)
                    nextSubResourceCount = resourceCount
                    if( error ) {
                        nextConsole.push(errorMessage)
                    } else {
                        success = true
                    }    
                }
            } else {
                // update config in case it was changed by learning structure
                // of imported xmls
                const { fairCopyProject } = this.props
                fairCopyProject.saveFairCopyConfig()

                done = true
                const s = totalCount !== 1 ? 's' : ''
                nextConsole.push(`Import finished. ${successCount} out of ${totalCount} file${s} imported.`)
                fairCopy.services.ipcSend('importEnd')
            }
    
            if( this.el ) {
                this.el.scrollTop = this.el.scrollHeight - this.el.clientHeight;
            }
    
            const nextSuccessCount = success ? successCount+1 : successCount
            this.setState({...this.state, consoleLines: nextConsole, successCount: nextSuccessCount, importList, subResourceCount: nextSubResourceCount, totalCount: totalCount+1, done, open: true })            
        }
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
