import React, { Component } from 'react'
import { Button, Typography, Tabs, Tab } from '@material-ui/core'

import GeneralSettings from './GeneralSettings'
import SchemaEditor from './SchemaEditor'

export default class ProjectSettingsWindow extends Component {

    constructor(props) {
        super()

        // make an editable copy of the config
        const fairCopyConfig = JSON.parse(JSON.stringify(props.fairCopyProject.fairCopyConfig))

        this.state = {
            fairCopyConfig,
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
                    <Tab value="elements" label="Elements"/>
                    <Tab value="vocabs" label="Vocabs"/>
                </Tabs>
            </div>
        )
    }

    renderContentArea() {
        const { teiSchema } = this.props.fairCopyProject
        const { fairCopyConfig, selectedPage } = this.state

        const onUpdate = (nextConfig) => {
            this.setState({...this.state,fairCopyConfig: nextConfig})
        }

        return (
            <div className="content-area">
                { selectedPage === 'general' && <GeneralSettings
                    fairCopyConfig={fairCopyConfig}
                    onUpdateConfig={onUpdate}
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
            const { fairCopyConfig } = this.state
            onSave(fairCopyConfig)
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
