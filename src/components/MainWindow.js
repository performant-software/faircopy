import React, { Component } from 'react'

import SplitPane from 'react-split-pane'

import TabbedSidebar from './TabbedSidebar';
import AlertDialog from './AlertDialog';

import TabbedMainView from './TabbedMainView';

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
        const openResource = openResources[resourceID]
        let nextResources
        if( !openResource ) {
            nextResources = { ...openResources }
            nextResources[resourceID] = fairCopyProject.openResource(resourceID)
        } else {
            nextResources = openResources
        }
        this.setState( {...this.state, selectedResource: resourceID, openResources: nextResources })
    }

    onCloseResource = (resourceID) => {
        // const { fairCopyProject } = this.props
        // const { openResources, selectedResource } = this.state
        // if( resourceID === selectedResource ) {

        // } 

        // this.setState( {...this.state, selectedResource: resourceID, openResources: nextResources })
    }

    render() {
        const { alertDialogMode, width, openResources, selectedResource } = this.state
        const { fairCopyProject } = this.props

        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={0} defaultSize={300}>
                    <TabbedSidebar
                        fairCopyProject={fairCopyProject}    
                        openResources={openResources}
                        selectedResource={selectedResource}
                        onSelectResource={this.onSelectResource}                                  
                    ></TabbedSidebar>    
                    <TabbedMainView
                        width={width}
                        fairCopyProject={fairCopyProject}
                        openResources={openResources}
                        selectedResource={selectedResource}
                        onStateChange={this.onStateChange}
                        onCloseResource={this.onCloseResource}
                        onSelectResource={this.onSelectResource}
                    ></TabbedMainView>
                </SplitPane>
                <AlertDialog
                    alertDialogMode={alertDialogMode}
                ></AlertDialog>
            </div>
        )
    }

}
