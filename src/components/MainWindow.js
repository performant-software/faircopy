import React, { Component } from 'react'

import SplitPane from 'react-split-pane'
import { debounce } from "debounce";

import TabbedSidebar from './TabbedSidebar';
import AlertDialog from './AlertDialog';

import TabbedMainView from './TabbedMainView';

const resizeRefreshRate = 100

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
            nextResources = { ...openResources }
            nextResources[resourceID] = fairCopyProject.openResource(resourceID)
        } else {
            nextResources = openResources
        }
        this.setState( {...this.state, selectedResource: resourceID, openResources: nextResources })
    }

    render() {
        const { alertDialogMode, width, openResources, selectedResource } = this.state
        const { fairCopyProject } = this.props

        // const refreshCallback = debounce(teiDocument.refreshView,resizeRefreshRate)

        const onChange = (sidebarWidth) => {
            // const boundingRect = this.el? this.el.getBoundingClientRect() : null
            // const windowWidth = boundingRect ? boundingRect.width : 0
            // this.setState({...this.state, width: windowWidth - sidebarWidth })
            // refreshCallback()
        }
        
        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={0} defaultSize={300} onChange={onChange}>
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
