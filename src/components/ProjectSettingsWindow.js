import React, { Component } from 'react'
import { Button, Typography } from '@material-ui/core'

export default class ProjectSettingsWindow extends Component {

    constructor() {
        super()
        this.state = {
        }	
    }

    // const onSaveProjectInfo = (name,description) => {
    //     fairCopyProject.updateProjectInfo({name, description})
    //     this.setState( {...this.state, editProjectDialogMode: false} )
    // }

    // const onResetProjectConfig = () => {
    //     fairCopyProject.resetConfig()
    //     this.setState( {...this.state } )
    // }

    // const projectInfo = { name: fairCopyProject.projectName, description: fairCopyProject.description, projectFilePath: fairCopyProject.projectFilePath }

    renderSidebar() {
        return (
            <div className="sidebar">
                <ul>
                    <li>General</li>
                    <li>Elements</li>
                    <li>Vocabularies</li>
                </ul>
            </div>
        )
    }

    renderContentArea() {
        return (
            <div className="content-area">
                <h1>HELLO</h1>
            </div>
        )
    }

    render() {
        const { onClose } = this.props

        return (
            <div id="ProjectSettingsWindow">
                <div className="title" >
                    <Typography component="h1" variant="h6">Project Settings</Typography>
                </div>
                <div>
                    { this.renderSidebar() }
                    { this.renderContentArea() }
                </div>
                <div className="footer">
                    <div className="window-actions">
                        <Button className="action-button" variant="contained" >Save</Button>
                        <Button className="action-button" variant="contained" onClick={onClose}>Cancel</Button>
                    </div>
                </div>
            </div>
        )
    }
}
