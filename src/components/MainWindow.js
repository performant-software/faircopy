import React, { Component } from 'react'

import SplitPane from 'react-split-pane'

import ProjectSidebar from './ProjectSidebar'
import AlertDialog from './AlertDialog'

import TEIEditor from './TEIEditor'

export default class MainWindow extends Component {

    constructor() {
        super()
        this.state = {
            selectedResource: null,
            openResources: {},
            latest: null,
            width: -300,
            alertDialogMode: false
        }	
    }

    onStateChange = (nextState) => {
        this.setState({...this.state,latest:nextState})
    }

    onSelectResource = (resourceID) => {
        const { fairCopyProject } = this.props
        const { openResources, selectedResource } = this.state
        if( resourceID === selectedResource ) return
        let nextResources
        if( !openResources[resourceID] ) {
            // open the selected resource
            nextResources = { ...openResources }
            nextResources[resourceID] = fairCopyProject.openResource(resourceID)
        } else {
            // selected an already open resource
            nextResources = openResources
        }
        this.setState( {...this.state, selectedResource: resourceID, openResources: nextResources })
    }

    onCloseResource = (resourceID) => {
        const { openResources, selectedResource } = this.state

        const nextResourceArr = Object.values(openResources).filter( r => r.resourceID !== resourceID )

        let nextSelection, nextResources = {}
        if( nextResourceArr.length > 0 ) {
            for( const resource of nextResourceArr ) {
                nextResources[resource.resourceID] = resource
            }
            nextSelection = ( resourceID === selectedResource ) ? nextResourceArr[0].resourceID : selectedResource
        } else {
            nextSelection = null
        }

        this.setState( {...this.state, selectedResource: nextSelection, openResources: nextResources })
    }

    render() {
        const { alertDialogMode, width, openResources, selectedResource } = this.state
        const { fairCopyProject } = this.props

        const editors = []
        for( const teiDocument of Object.values(openResources) ) {
            const hidden = selectedResource !== teiDocument.resourceID
            editors.push(
                <TEIEditor 
                    key={`editor-${teiDocument.resourceID}`}
                    hidden={hidden}
                    width={width}
                    teiDocument={teiDocument}
                    onStateChange={this.onStateChange}
                    onSave={this.onSave}  
                ></TEIEditor>
            )
        }

        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={0} defaultSize={300}>
                    <ProjectSidebar
                        fairCopyProject={fairCopyProject}    
                        openResources={openResources}
                        selectedResource={selectedResource}
                        onSelectResource={this.onSelectResource}                                  
                    ></ProjectSidebar>    
                    <div>
                        { editors }
                    </div>
                </SplitPane>
                <AlertDialog
                    alertDialogMode={alertDialogMode}
                ></AlertDialog>
            </div>
        )
    }

}
