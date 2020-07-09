import React, { Component } from 'react'

import SplitPane from 'react-split-pane'

import ProjectSidebar from './ProjectSidebar'
import AlertDialog from './AlertDialog'

import TEIEditor from './TEIEditor'
import ResourceBrowser from './ResourceBrowser'
import ElementMenu from './ElementMenu'
import EditResourceDialog from './EditResourceDialog'
import PopupMenu from './PopupMenu'
import TEIDocument from '../tei-document/TEIDocument'
import FacsEditor from './FacsEditor'

const fairCopy = window.fairCopy

export default class MainWindow extends Component {

    constructor() {
        super()
        this.state = {
            selectedResource: null,
            openResources: {},
            latest: null,
            resourceBrowserOpen: true,
            alertDialogMode: 'closed',
            alertOptions: null,
            exitOnClose: false,
            editDialogMode: false,
            openMenuID: null,
            elementMenuAnchorEl: null,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null,
        }	
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('resourceOpened', (event, resourceData) => this.receiveResourceData(resourceData))
        services.ipcRegisterCallback('importOpened', (event, importData) => this.receiveImportData(importData))
        services.ipcRegisterCallback('requestExitApp', (event, importData) => this.requestExitApp() ) 
    }
    
    requestExitApp = () => {
        const { openResources } = this.state
        const resourceIDs = Object.keys( openResources )
        if( resourceIDs.length > 0 ) {
            this.closeResources( resourceIDs, true)
        } else {
            fairCopy.services.ipcSend('exitApp')
        }
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

    receiveImportData( importData ) {
        const { fairCopyProject } = this.props
        const { error, errorMessage } = fairCopyProject.importResource(importData)
        if( error ) {
            const alertOptions = { errorMessage }
            this.setState({...this.state, alertDialogMode: 'importError', alertOptions })
        } else {
            this.setState({...this.state})
        }
    }

    onStateChange = (nextState) => {
        this.setState({...this.state,latest:nextState})
    }

    selectResources(resourceIDs) {
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

    closeResources(resourceIDs,exitOnClose=false,promptSave=true) {
        const { openResources, selectedResource, resourceBrowserOpen } = this.state

        if( promptSave ) {
            for( const resourceID of resourceIDs ) {
                const resource = openResources[resourceID]
                if( resource && resource.changedSinceLastSave ) {
                    const alertOptions = {
                        resource, resourceIDs
                    }
                    this.setState({ ...this.state, exitOnClose, alertDialogMode: 'confirmSave', alertOptions })
                    return 
                }
            }    
        }

        let nextResourceArr = []
        for( const openResourceID of Object.keys(openResources) ) {
            if( !resourceIDs.find(id => id === openResourceID) ) {
                // this id is not on the close list
                nextResourceArr.push(openResources[openResourceID])    
            }
        }

        let nextSelection, nextBrowserOpen, nextResources = {}
        if( nextResourceArr.length > 0 ) {
            for( const resource of nextResourceArr ) {
                nextResources[resource.resourceID] = resource
            }
            nextSelection = resourceIDs.find(id => id === selectedResource) ? nextResourceArr[0].resourceID : selectedResource
            nextBrowserOpen = resourceBrowserOpen
        } else {
            nextSelection = null
            nextBrowserOpen = true
        }

        this.setState( {
            ...this.state, 
            selectedResource: nextSelection, 
            openResources: nextResources, 
            resourceBrowserOpen: nextBrowserOpen,
            alertDialogMode: 'closed', 
            alertOptions: null,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null 
        })

        if( exitOnClose ) {
            fairCopy.services.ipcSend('exitApp')
        }    
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

    onImportResource = () => {
        fairCopy.services.ipcSend('requestImport')
    }

    onResourceAction = (actionID, resourceIDs) => {
        switch(actionID) {
            case 'open':
                this.selectResources(resourceIDs)
                return false
            case 'close':
                this.closeResources(resourceIDs)
                return false
            case 'delete':
                const alertOptions = { resourceIDs }
                this.setState({ ...this.state, alertDialogMode: 'confirmDelete', alertOptions })
                return true
            case 'export':
                fairCopy.services.ipcSend('requestExport', resourceIDs)
                return false
            default:
                console.error(`Unrecognized resource action id: ${actionID}`)
                return false
        }
    }

    renderEditors() {
        const { openResources, selectedResource } = this.state
        const { fairCopyProject } = this.props

        const editors = []
        for( const resource of Object.values(openResources) ) {
            const hidden = selectedResource !== resource.resourceID
            const key = `editor-${resource.resourceID}`
            if( resource.loading ) {
                editors.push(<div key={key}></div>)
            } else {
                if( resource instanceof TEIDocument ) {
                    editors.push(
                        <TEIEditor 
                            key={key}
                            hidden={hidden}
                            teiDocument={resource}
                            fairCopyProject={fairCopyProject}
                            onStateChange={this.onStateChange}
                            onOpenElementMenu={this.onOpenElementMenu}
                            onEditResource={this.onEditResource}
                            onOpenNote={this.onOpenNote}
                            onCloseNote={this.onCloseNote}
                        ></TEIEditor>
                    )        
                } else {
                    editors.push(
                        <FacsEditor
                            key={key}
                            hidden={hidden}
                            facsDocument={resource}
                            fairCopyProject={fairCopyProject}
                            onStateChange={this.onStateChange}       
                            onEditResource={this.onEditResource}                 
                        ></FacsEditor>
                    )                     
                }
            }
        }

        return editors 
    }

    renderContentPane() {
        const { fairCopyProject } = this.props
        const { resourceBrowserOpen } = this.state

        return (
            <div>
                { resourceBrowserOpen && 
                    <ResourceBrowser
                        onResourceAction={this.onResourceAction}
                        onOpenPopupMenu={this.onOpenPopupMenu}
                        onEditResource={this.onEditResource}
                        onImportResource={this.onImportResource}
                        fairCopyProject={fairCopyProject}
                    ></ResourceBrowser> }
                { this.renderEditors() }
            </div>
        )
    }

    renderAlertDialog() {
        const { alertDialogMode, alertOptions } = this.state

        const onCloseAlert = () => {
            this.setState({ ...this.state, alertDialogMode: 'closed', alertOptions: null })
        }

        let open, title, message, actions, handleClose
        switch(alertDialogMode) {
            case 'importError':
                open = true
                title = "Import Error"
                message = alertOptions.errorMessage
                handleClose = onCloseAlert
                actions = [
                    {
                        label: "OK",
                        defaultAction: true,
                        handler: onCloseAlert
                    }
                ]
                break

            case 'confirmDelete': {
                const { resourceIDs } = alertOptions

                const onDelete = () => {
                    const { fairCopyProject } = this.props
                    fairCopyProject.removeResources(resourceIDs)
                    this.closeResources(resourceIDs, false, false )    
                }

                const onCancel = () => {
                    onCloseAlert()
                }

                open = true
                title = "Confirm Delete"
                const s = resourceIDs.length === 1 ? '' : 's'
                message = `Do you wish to delete ${resourceIDs.length} resource${s}?`
                handleClose = onCloseAlert
                actions = [
                    {
                        label: "Delete",
                        defaultAction: true,
                        handler: onDelete
                    },
                    {
                        label: "Cancel",
                        handler: onCancel
                    }
                ]
                break
            }
                
            case 'confirmSave': {
                const onSave = () => {
                    const { exitOnClose } = this.state
                    const { resource, resourceIDs } = alertOptions
                    resource.save()
                    this.closeResources(resourceIDs,exitOnClose)
                }

                const onCloseWithoutSave = () => {
                    const { exitOnClose } = this.state
                    const { resource, resourceIDs } = alertOptions
                    resource.changedSinceLastSave = false       
                    this.closeResources(resourceIDs,exitOnClose)
                }

                const { fairCopyProject } = this.props
                const { resource } = alertOptions
                const resourceName = fairCopyProject.resources[resource.resourceID].name
                open = true
                title = "Confirm Close"
                message = `Close "${resourceName}" without saving?`
                handleClose = onCloseAlert
                actions = [
                    {
                        label: "Save",
                        defaultAction: true,
                        handler: onSave
                    },
                    {
                        label: "Close",
                        handler: onCloseWithoutSave
                    }
                ]
                break
            }

            case 'closed':
            default:
                open = false
        }
    
        return (
            <AlertDialog
                open={open}
                title={title}
                message={message}
                actions={actions}
                handleClose={handleClose}
            ></AlertDialog>    
        )
    }

    render() {
        const { editDialogMode, openResources, selectedResource, elementMenuAnchorEl, openMenuID } = this.state
        const { popupMenuOptions, popupMenuAnchorEl } = this.state
        const { fairCopyProject } = this.props
        const { menus } = fairCopyProject
        const openMenu = openMenuID ? menus[openMenuID] : null

        const teiDocument = selectedResource ? openResources[selectedResource] : null
        const resourceEntry = selectedResource ? fairCopyProject.resources[selectedResource] : null

        const onSaveResource = (name,localID,type,url) => {
            if( resourceEntry ) {
                fairCopyProject.updateResource({ id: resourceEntry.id, name, localID, type })
            } else {
                fairCopyProject.newResource(name,localID,type,url)    
            }
            this.setState( {...this.state, editDialogMode: false} )
        }

        const onSelectResource = ( resourceID ) => {
            this.onResourceAction( 'open', [resourceID] )
        }

        const onCloseResource = ( resourceID ) => {
            this.onResourceAction( 'close', [resourceID] )
        }
   
        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={250} maxSize={630} defaultSize={250}>
                    <ProjectSidebar
                        fairCopyProject={fairCopyProject}    
                        openResources={openResources}
                        selectedResource={selectedResource}
                        onSelectResource={onSelectResource}   
                        onCloseResource={onCloseResource}
                        onOpenResourceBrowser={this.onOpenResourceBrowser}                               
                    ></ProjectSidebar>    
                    { this.renderContentPane() }
                </SplitPane>
                { this.renderAlertDialog() }
                { editDialogMode && <EditResourceDialog
                    resourceEntry={resourceEntry}
                    onSave={onSaveResource}
                    onClose={()=>{ this.setState( {...this.state, editDialogMode: false} )}}
                ></EditResourceDialog> }
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
