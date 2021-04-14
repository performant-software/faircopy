import React, { Component } from 'react'

import { AppBar, Button } from '@material-ui/core';

const fairCopy = window.fairCopy

export default class MainWindowStatusBar extends Component {

    constructor(props) {
        super(props)

        const licenseDataJSON = localStorage.getItem('licenseData')
        const licenseData = JSON.parse(licenseDataJSON)

        this.state = {
            softwareUpdateStatus: 'OK',
            licenseData
        }
    }

    componentDidMount() {
        // TODO listen for update, if there is one, update to 'updateAvailable'

        // TODO listen for download completed, update status to 'quitAndInstall'

        const { licenseData } = this.state
        fairCopy.services.ipcSend( 'checkForUpdates', licenseData )
    }

    onStartUpdate = () => {
        // TODO send message to kick off download, update state to 'downloading'
    }

    render() {
        const { appConfig, onQuitAndInstall, onFeedback, onDisplayNotes } = this.props
        const { softwareUpdateStatus } = this.state

        const appVersion = appConfig ? `v${appConfig.version}` : ''
        const devModeTag = appConfig && appConfig.devMode ? 'DEV' : ''

        return (
            <AppBar id="MainWindowStatusBar" position="fixed" >
                <div className="bar">
                    { softwareUpdateStatus === 'OK' && 
                        <Button onClick={onDisplayNotes} className="version-button" size="small" variant="outlined" color="inherit">
                                { appVersion } {devModeTag }                       
                        </Button> 
                    }
                    { softwareUpdateStatus === 'updateAvailable' && 
                        <Button onClick={this.onStartUpdate } className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-bell fa-lg"></i> Update Available                       
                        </Button> 
                    }
                    { softwareUpdateStatus === 'downloading' && 
                        <Button disabled className="version-button" size="small" variant="outlined" color="inherit">
                                Downloading...                     
                        </Button> 
                    }
                    { softwareUpdateStatus === 'quitAndInstall' && 
                        <Button onClick={onQuitAndInstall}className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-sync fa-lg"></i> Quit and Install
                        </Button> 
                    }
                    { softwareUpdateStatus === 'error' && 
                        <Button className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-times fa-lg"></i> Update Error                 
                        </Button> 
                    }
                     <Button className="version-button" size="small" color="inherit" onClick={onFeedback}><i className="fas fa-bullhorn fa-lg"></i></Button>
               </div>
            </AppBar>
        )
    }
}