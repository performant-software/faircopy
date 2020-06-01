import React, { Component } from 'react'

import SplitPane from 'react-split-pane'

import ProjectSidebar from './ProjectSidebar'
import AlertDialog from './AlertDialog'

import TEIEditor from './TEIEditor'
import ResourceBrowser from './ResourceBrowser'
import ElementMenu from './ElementMenu'
import EditResourceDialog from './EditResourceDialog'
import PopupMenu from './PopupMenu'

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
            editDialogMode: false,
            openMenuID: null,
            elementMenuAnchorEl: null,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null
        }	
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('resourceOpened', (event, resourceData) => this.receiveResourceData(resourceData))
        services.ipcRegisterCallback('fileSaved', (event, resourceID) => this.saved(resourceID))
    }
    
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

    onSelectResources(resourceIDs) {
        const { fairCopyProject } = this.props
        const { openResources, selectedResource } = this.state

        // select the first one from the list
        const nextSelection = resourceIDs[0]

        let change = (selectedResource !== nextSelection)
        let nextResources = { ...openResources }
        for( const resourceID of resourceIDs ) {
            if( !openResources[resourceID] ) {
                nextResources[resourceID] = fairCopyProject.openResource(resourceID)
                change = true
            }    
        }

        if( change ) {
            this.setState( {
                ...this.state, 
                selectedResource: nextSelection,
                openResources: nextResources, 
                resourceBrowserOpen: false, 
                popupMenuOptions: null, 
                popupMenuAnchorEl: null
            })    
        } else {
            this.setState( {
                ...this.state, 
                resourceBrowserOpen: false, 
                popupMenuOptions: null, 
                popupMenuAnchorEl: null
            })    
        }
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

    onOpenPopupMenu = (popupMenuOptions, popupMenuAnchorEl) => {
        this.setState({...this.state, popupMenuOptions, popupMenuAnchorEl })
    }

    onClosePopupMenu = () => {
        this.setState({...this.state, popupMenuOptions: null, popupMenuAnchorEl: null })
    }

    onEditResource = () => {
        this.setState({...this.state, editDialogMode: true })
    }

    onResourceAction = (actionID, resourceIDs) => {
        switch(actionID) {
            case 'open':
                this.onSelectResources(resourceIDs)
                break
            default:
                console.error(`Unrecognized batch action id: ${actionID}`)
        }
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
                        onResourceAction={this.onResourceAction}
                        onOpenPopupMenu={this.onOpenPopupMenu}
                        onEditResource={this.onEditResource}
                        fairCopyProject={fairCopyProject}
                    ></ResourceBrowser> }
                { this.renderEditors() }
            </div>
        )
    }

    render() {
        const { alertDialogMode, editDialogMode, openResources, selectedResource, elementMenuAnchorEl, openMenuID } = this.state
        const { popupMenuOptions, popupMenuAnchorEl } = this.state
        const { fairCopyProject } = this.props
        const { menus } = fairCopyProject
        const openMenu = openMenuID ? menus[openMenuID] : null

        const teiDocument = selectedResource ? openResources[selectedResource] : null

        const onSaveResource = (name, type) => {
            fairCopyProject.newResource(name, type)
            this.setState( {...this.state, editDialogMode: false} )
        }

        const onSelectResource = ( resourceID ) => {
            this.onResourceAction( 'open', [resourceID] )
        }

        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={0} defaultSize={300}>
                    <ProjectSidebar
                        fairCopyProject={fairCopyProject}    
                        openResources={openResources}
                        selectedResource={selectedResource}
                        onSelectResource={onSelectResource}   
                        onCloseResource={this.onCloseResource}
                        onOpenResourceBrowser={this.onOpenResourceBrowser}                               
                    ></ProjectSidebar>    
                    { this.renderContentPane() }
                </SplitPane>
                <AlertDialog
                    alertDialogMode={alertDialogMode}
                ></AlertDialog>
                <EditResourceDialog
                    editDialogMode={editDialogMode}
                    onSave={onSaveResource}
                    onClose={()=>{ this.setState( {...this.state, editDialogMode: false} )}}
                ></EditResourceDialog>
                <ElementMenu
                    teiDocument={teiDocument}
                    menuGroups={openMenu}
                    anchorEl={elementMenuAnchorEl}
                    onClose={this.onCloseElementMenu}
                ></ElementMenu>
                <PopupMenu
                    menuOptions={popupMenuOptions}
                    anchorEl={popupMenuAnchorEl}
                    onClose={this.onClosePopupMenu}                
                ></PopupMenu>
            </div>
        )
    }

}
