import { Typography } from '@material-ui/core'
import React, { Component } from 'react'

export default class GeneralSettings extends Component {

        // const onSaveProjectInfo = (name,description) => {
    //     fairCopyProject.updateProjectInfo({name, description})
    //     this.setState( {...this.state, editProjectDialogMode: false} )
    // }

    // const onResetProjectConfig = () => {
    //     fairCopyProject.resetConfig()
    //     this.setState( {...this.state } )
    // }

    // const projectInfo = { name: fairCopyProject.projectName, description: fairCopyProject.description, projectFilePath: fairCopyProject.projectFilePath }

    render() {
        
        return (
            <div id="GeneralSettings">
               <Typography>GENERAL SETTINGS</Typography>
            </div>
        )
    }
}