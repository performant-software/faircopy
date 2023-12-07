import React, { Component } from 'react'
import SearchBar from './SearchBar'

import { Button, Tooltip } from '@material-ui/core';

const fairCopy = window.fairCopy

export default class MainWindowStatusBar extends Component {

    constructor(props) {
        super(props)

        this.state = {
            softwareUpdateStatus: 'OK',
            progress: 0
        }
    }

    onUpdateAvailable = (event) => {
        this.setState({ ...this.state, softwareUpdateStatus: 'updateAvailable' })
    }

    onUpdateDownloading = (event,progress) => {
        this.setState({ ...this.state, progress })
    }

    onUpdateDownloaded = (event) => {
        this.setState({ ...this.state, softwareUpdateStatus: 'quitAndInstall' })
    }

    onErrorUpdating = (event, error) => {
        this.setState({ ...this.state, softwareUpdateStatus: 'error' })
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('updateAvailable', this.onUpdateAvailable)
        fairCopy.services.ipcRegisterCallback('updateDownloading', this.onUpdateDownloading)
        fairCopy.services.ipcRegisterCallback('updateDownloaded', this.onUpdateDownloaded)
        fairCopy.services.ipcRegisterCallback('errorUpdating', this.onErrorUpdating)
    }

    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('updateAvailable', this.onUpdateAvailable)
        fairCopy.services.ipcRemoveListener('updateDownloading', this.onUpdateDownloading)
        fairCopy.services.ipcRemoveListener('updateDownloaded', this.onUpdateDownloaded)
        fairCopy.services.ipcRemoveListener('errorUpdating', this.onErrorUpdating)
    }

    onStartUpdate = () => {
        fairCopy.services.ipcSend( 'downloadUpdate' )
        this.setState({ ...this.state, softwareUpdateStatus: 'downloading', progress: 0 })
    }

    renderStatusButton(demo) {
        const { appConfig, onQuitAndInstall, onDisplayNotes } = this.props
        let { softwareUpdateStatus, progress } = this.state

        let appVersion, devModeTag
        if( demo ) {
            appVersion = '1.0.0'
            devModeTag = ''
            softwareUpdateStatus = 'demo'     
        } else {
            appVersion = appConfig ? `v${appConfig.version}` : ''
            devModeTag = appConfig && appConfig.devMode ? 'DEV' : ''    
        }

        if( softwareUpdateStatus === 'OK' || softwareUpdateStatus === 'demo' ) {
            return (
                <Button onClick={onDisplayNotes} className="version-button" size="small" variant="outlined" color="inherit">
                    { appVersion } {devModeTag }                       
                </Button> 
            )
        } else if( softwareUpdateStatus === 'updateAvailable' ) {
            return (
                <Button onClick={ this.onStartUpdate } className="version-button" size="small" variant="outlined" color="inherit">
                        <i className="fas fa-bell fa-lg"></i> Update Available                       
                </Button> 
            )
        } else if(  softwareUpdateStatus === 'downloading' ) {
            return (
                <Button className="version-button" size="small" variant="outlined" color="inherit">
                    Downloading... {progress}%            
                </Button> 
            )
        } else if(  softwareUpdateStatus === 'quitAndInstall' ) {
            return (
                <Button onClick={onQuitAndInstall}className="version-button" size="small" variant="outlined" color="inherit">
                    <i className="fas fa-sync fa-lg"></i> Restart to Update
                </Button> 
            )
        } else if( softwareUpdateStatus === 'error' ) {
            return (
                <Button className="version-button" size="small" variant="outlined" color="inherit">
                    <i className="fas fa-times fa-lg"></i> Error updating                 
                </Button> 
            )
        } else {
            return null
        }
    }

    render() {
        const { onFeedback, remoteProject, onAlertMessage, currentResource, onSearchResults, searchSelectionIndex, onUpdateSearchSelection, onSearchFilter, onResourceAction, searchEnabled, searchFilterOptions } = this.props
        return (
            <footer id="MainWindowStatusBar" className="bar">
                    { !remoteProject && <SearchBar
                        searchEnabled={searchEnabled}
                        searchSelectionIndex={searchSelectionIndex}
                        onUpdateSearchSelection={onUpdateSearchSelection}
                        onAlertMessage={onAlertMessage}
                        currentResource={currentResource}
                        onResourceAction={onResourceAction}
                        onSearchResults={onSearchResults}
                        onSearchFilter={onSearchFilter}
                        searchFilterOptions={searchFilterOptions}
                    ></SearchBar> }
                    { this.renderStatusButton() }
                    <Tooltip title="Send developer feedback">
                        <Button className="feedback-button" size="small" color="inherit" onClick={onFeedback}><i className="fas fa-bullhorn fa-lg"></i></Button>
                    </Tooltip>
            </footer>
        )
    }
}