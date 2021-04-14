import React, { Component } from 'react'

import { AppBar, Button } from '@material-ui/core';

// const fairCopy = window.fairCopy

export default class MainWindowStatusBar extends Component {

    constructor(props) {
        super(props)
        
        this.state = {
            softwareUpdateStatus: 'updateAvailable'
        }
    }

    componentDidMount() {
        // TODO
        // const { services } = fairCopy
        
        // const licenseDataJSON = localStorage.getItem('licenseData')
        // const licenseData = JSON.parse(licenseDataJSON)
        // services.ipcSend( 'checkForUpdates', licenseData )
    }

    onDisplayNotes = () => {
        // TODO
    }

    onStartUpdate = () => {
        // TODO
    }

    onQuitAndInstall = () => {
        // TODO
    }

    onFeedback = () => {
        // TODO
    }

    render() {
        const { appConfig } = this.props
        const { softwareUpdateStatus } = this.state

        const appVersion = appConfig ? `v${appConfig.version}` : ''
        const devModeTag = appConfig && appConfig.devMode ? 'DEV' : ''

        return (
            <AppBar id="MainWindowStatusBar" position="fixed" >
                <div className="bar">
                    { softwareUpdateStatus === 'OK' && 
                        <Button onClick={this.onDisplayNotes} className="version-button" size="small" variant="outlined" color="inherit">
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
                        <Button onClick={this.onQuitAndInstall }className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-sync fa-lg"></i> Quit and Install
                        </Button> 
                    }
                    { softwareUpdateStatus === 'error' && 
                        <Button className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-times fa-lg"></i> Update Error                 
                        </Button> 
                    }
                     <Button className="version-button" size="small" color="inherit" onClick={this.onFeedback}><i className="fas fa-bullhorn fa-lg"></i></Button>
               </div>
            </AppBar>
        )
    }

}