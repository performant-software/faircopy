import React, { Component } from 'react'
import { Button, Typography, Tabs, Tab } from '@material-ui/core'

import GeneralSettings from './GeneralSettings'
import SchemaEditor from './SchemaEditor'

export default class ProjectSettingsWindow extends Component {

    constructor(props) {
        super()

        // make an editable copy of the config
        const { fairCopyProject } = props
        const { remote, userID, serverURL } = fairCopyProject
        const fairCopyConfig = JSON.parse(JSON.stringify(fairCopyProject.fairCopyConfig))

        const projectInfo = { 
            name: fairCopyProject.projectName, 
            description: fairCopyProject.description, 
            projectFilePath: fairCopyProject.projectFilePath,
            userID,
            serverURL,
            remote
        } 

        this.state = {
            fairCopyConfig,
            projectInfo,
            selectedPage: 'general'
        }	
    }

    renderSidebar() {
        const { selectedPage } = this.state

        const onChangeMenu = (e,nextPage) => {
            this.setState({...this.state, selectedPage: nextPage })
        }

        return (
            <div className="sidebar">
                <Tabs orientation="vertical" value={selectedPage} onChange={onChangeMenu}>
                    <Tab value="general" label="General" />
                    <Tab value="elements" label="Schema"/>
                    {/* <Tab disabled value="vocabs" label="Vocabs"/> */}
                </Tabs>
            </div>
        )
    }

    renderContentArea() {
        const { teiSchema } = this.props.fairCopyProject
        const { fairCopyConfig, projectInfo, selectedPage } = this.state

        const onUpdate = (nextConfig) => {
            this.setState({...this.state,fairCopyConfig: nextConfig})
        }

        const onUpdateProject = (nextProjectInfo) => {
            this.setState({...this.state,projectInfo: nextProjectInfo})            
        }

        const onReset = () => {
            const { baseConfigJSON } = this.props.fairCopyProject
            const nextConfig = JSON.parse(baseConfigJSON)
            this.setState({...this.state,fairCopyConfig: nextConfig})     
        }

        return (
            <div className="content-area">
                { selectedPage === 'general' && <GeneralSettings
                    projectInfo={projectInfo}
                    fairCopyConfig={fairCopyConfig}
                    onUpdateProject={onUpdateProject}
                    onUpdateConfig={onUpdate}
                    onReset={onReset}
                ></GeneralSettings> }
                { selectedPage === 'elements' && <SchemaEditor
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    onUpdateConfig={onUpdate}
                ></SchemaEditor> }
                { selectedPage === 'vocabs' && <div>
                    <h1>VOCAB EDITOR</h1>
                </div> }
            </div>
        )
    }

    render() {
        const { onClose, onSave } = this.props

        const onSaveConfig = () => {
            const { fairCopyConfig, projectInfo } = this.state
            onSave(fairCopyConfig, projectInfo)
        }

        return (
            <div id="ProjectSettingsWindow">
                <div className="title" >
                    <Typography component="h1" variant="h6"><i className="fas fa-cog"></i> Project Settings</Typography>
                </div>
                <div>
                    { this.renderSidebar() }
                    { this.renderContentArea() }
                </div>
                <div className="footer">
                    <div className="window-actions">
                        <Button className="action-button" variant="contained" onClick={onSaveConfig} >Save</Button>
                        <Button className="action-button" variant="contained" onClick={onClose}>Cancel</Button>
                    </div>
                </div>
            </div>
        )
    }
}
