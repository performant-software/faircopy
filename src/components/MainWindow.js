import React, { Component } from 'react'

import SplitPane from 'react-split-pane'

import ProjectSidebar from './ProjectSidebar'
import AlertDialog from './AlertDialog'

import TEIEditor from './TEIEditor'
import ResourceBrowser from './ResourceBrowser'
import ElementMenu from './ElementMenu'

const fairCopy = window.fairCopy

export default class MainWindow extends Component {

    constructor() {
        super()
        this.state = {
            selectedResource: null,
            openResources: {},
            latest: null,
            width: -300,
            resourceBrowserOpen: true,
            alertDialogMode: false,
            openMenuID: null,
            elementMenuAnchorEl: null
        }	
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('resourceOpened', (event, resourceData) => this.receiveResourceData(resourceData))
        services.ipcRegisterCallback('fileSaved', (event, resourceID) => this.saved(resourceID))
    }
    
// openPrint() {
//     window.print()
// }

// newFile() {
//     const { teiDocument, exitAnyway } = this.state
//     const { changedSinceLastSave } = teiDocument

//     if( !exitAnyway && changedSinceLastSave ) {
//         this.setState({ ...this.state, alertDialogMode: 'new'})
//         teiDocument.changedSinceLastSave = false 
//     } else {
//         const { editorView } = teiDocument
//         const newEditorState = teiDocument.editorInitialState(document)
//         editorView.updateState( newEditorState )       
//         teiDocument.changedSinceLastSave = false 
//         this.setTitle(untitledDocumentTitle)
//         editorView.focus();
//         this.setState( { 
//             ...this.state, 
//             exitAnyway: false, 
//             alertDialogMode: false, 
//             filePath: null 
//         })    
//     }
// }

    saved(resourceID) {
        // TODO
        // this.setState( { ...this.state, 
        //     alertDialogMode: false, 
        //     exitAnyway: false
        // })
    }

    receiveResourceData( resourceData ) {
        const { resourceID, resource } = resourceData
        const { openResources } = this.state
        const openResource = openResources[resourceID]
        if( openResource ) {
            openResource.load(resource)
            this.setState({...this.state})
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
        this.setState( {...this.state, selectedResource: resourceID, openResources: nextResources, resourceBrowserOpen: false })
    }

    onCloseResource = (resourceID) => {
        const { openResources, selectedResource } = this.state

        const nextResourceArr = Object.values(openResources).filter( r => r.resourceID !== resourceID )

        let nextSelection, resourceBrowserOpen, nextResources = {}
        if( nextResourceArr.length > 0 ) {
            for( const resource of nextResourceArr ) {
                nextResources[resource.resourceID] = resource
            }
            nextSelection = ( resourceID === selectedResource ) ? nextResourceArr[0].resourceID : selectedResource
            resourceBrowserOpen = false
        } else {
            nextSelection = null
            resourceBrowserOpen = true
        }

        this.setState( {...this.state, selectedResource: nextSelection, openResources: nextResources, resourceBrowserOpen })
    }

    onOpenResourceBrowser = () => {
        this.setState( {...this.state, selectedResource: null, resourceBrowserOpen: true })
    }

    onOpenElementMenu = (menuID, elementMenuAnchorEl) => {
        this.setState({...this.state, openMenuID: menuID, elementMenuAnchorEl })
    }

    onCloseElementMenu = () => {
        this.setState({...this.state, openMenuID: null, elementMenuAnchorEl: null })
    }

    renderEditors() {
        const { width, openResources, selectedResource } = this.state
        const { fairCopyProject } = this.props

        const editors = []
        for( const teiDocument of Object.values(openResources) ) {
            const hidden = selectedResource !== teiDocument.resourceID
            const key = `editor-${teiDocument.resourceID}`
            if( teiDocument.loading ) {
                editors.push(<div key={key}></div>)
            } else {
                editors.push(
                    <TEIEditor 
                        key={key}
                        hidden={hidden}
                        width={width}
                        teiDocument={teiDocument}
                        fairCopyProject={fairCopyProject}
                        onStateChange={this.onStateChange}
                        onOpenElementMenu={this.onOpenElementMenu}
                    ></TEIEditor>
                )    
            }
        }

        return editors 
    }

    renderContentPane() {
        const { fairCopyProject } = this.props
        const { resourceBrowserOpen, width } = this.state
        return (
            <div>
                { resourceBrowserOpen && 
                    <ResourceBrowser
                        width={width}
                        onSelectResource={this.onSelectResource}   
                        fairCopyProject={fairCopyProject}
                    ></ResourceBrowser> }
                { this.renderEditors() }
            </div>
        )
    }

    render() {
        const { alertDialogMode, openResources, selectedResource, elementMenuAnchorEl, openMenuID } = this.state
        const { fairCopyProject } = this.props
        const { menus } = fairCopyProject
        const openMenu = openMenuID ? menus[openMenuID] : null

        const teiDocument = selectedResource ? openResources[selectedResource] : null

        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={0} defaultSize={300}>
                    <ProjectSidebar
                        fairCopyProject={fairCopyProject}    
                        openResources={openResources}
                        selectedResource={selectedResource}
                        onSelectResource={this.onSelectResource}   
                        onCloseResource={this.onCloseResource}
                        onOpenResourceBrowser={this.onOpenResourceBrowser}                               
                    ></ProjectSidebar>    
                    { this.renderContentPane() }
                </SplitPane>
                <AlertDialog
                    alertDialogMode={alertDialogMode}
                ></AlertDialog>
                <ElementMenu
                    teiDocument={teiDocument}
                    menuGroups={openMenu}
                    anchorEl={elementMenuAnchorEl}
                    onClose={this.onCloseElementMenu}
                ></ElementMenu>
            </div>
        )
    }

}
