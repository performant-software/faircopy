import React, { Component } from 'react'
import { debounce } from "debounce";

import SplitPane from 'react-split-pane'

import ProjectSidebar from './ProjectSidebar'
import AlertDialog from './AlertDialog'

import TEIEditor from './TEIEditor'
import ResourceBrowser from './ResourceBrowser'
import ElementMenu from './ElementMenu'
import EditResourceDialog from './EditResourceDialog'
import EditProjectDialog from './EditProjectDialog'
import PopupMenu from './PopupMenu'
import TEIDocument from '../tei-document/TEIDocument'
import FacsEditor from './FacsEditor'
import SnackAlert from './SnackAlert'

const fairCopy = window.fairCopy

const initialLeftPaneWidth = 250
const maxLeftPaneWidth = 630
const resizeRefreshRate = 100

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
            editProjectDialogMode: false,
            elementMenuOptions: null,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null,
            alertMessage: null,
            expandedGutter: false,
            leftPaneWidth: initialLeftPaneWidth
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
            // a bit of a hack - need to refresh after it renders
            if( nextResources[nextSelection] instanceof TEIDocument ) {
                setTimeout( () => { nextResources[nextSelection].refreshView() }, 60 )
            }
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

    onOpenElementMenu = (elementMenuOptions ) => {
        this.setState({...this.state, elementMenuOptions })
    }

    onCloseElementMenu = () => {
        this.setState({...this.state, elementMenuOptions: null })
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

    onEditProjectInfo = () => {
        this.setState({...this.state, editProjectDialogMode: true })
    }

    onImportResource = () => {
        fairCopy.services.ipcSend('requestImport')
    }

    onAlertMessage = (message) => {
        this.setState({...this.state, alertMessage: message })
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
        const { openResources, selectedResource, leftPaneWidth, expandedGutter } = this.state
        const { fairCopyProject } = this.props

        const editors = []
        for( const resource of Object.values(openResources) ) {
            const hidden = selectedResource !== resource.resourceID
            const key = `editor-${resource.resourceID}`
            const editorWidth = `calc(100vw - 10px - ${leftPaneWidth}px)`
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
                            editorWidth={editorWidth}
                            expandedGutter={expandedGutter}
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

    renderDialogs() {
        const { editDialogMode, openResources, selectedResource, elementMenuOptions } = this.state
        const { fairCopyProject } = this.props
        const { idMap } = fairCopyProject

        const teiDocument = selectedResource ? openResources[selectedResource] : null
        const resourceEntry = selectedResource ? fairCopyProject.resources[selectedResource] : null
        const projectInfo = { name: fairCopyProject.projectName, description: fairCopyProject.description }

        const { editProjectDialogMode, alertMessage } = this.state
        const { popupMenuOptions, popupMenuAnchorEl } = this.state

        const onSaveResource = (name,localID,type,url) => {
            if( resourceEntry ) {
                fairCopyProject.updateResource({ id: resourceEntry.id, name, localID, type })
            } else {
                fairCopyProject.newResource(name,localID,type,url)    
            }
            this.setState( {...this.state, editDialogMode: false} )
        }

        const onSaveProjectInfo = (name,description) => {
            fairCopyProject.updateProjectInfo({name, description})
            this.setState( {...this.state, editProjectDialogMode: false} )
        }

        return (
            <div>
                { this.renderAlertDialog() }
                { editDialogMode && <EditResourceDialog
                    idMap={idMap}
                    resourceEntry={resourceEntry}
                    onSave={onSaveResource}
                    onClose={()=>{ this.setState( {...this.state, editDialogMode: false} )}}
                ></EditResourceDialog> }
                { editProjectDialogMode && <EditProjectDialog
                    projectInfo={projectInfo}
                    onSave={onSaveProjectInfo}
                    onClose={()=>{ this.setState( {...this.state, editProjectDialogMode: false} )}}
                ></EditProjectDialog> }
                <ElementMenu
                    teiDocument={teiDocument}
                    onAlertMessage={this.onAlertMessage}
                    onClose={this.onCloseElementMenu}
                    {...elementMenuOptions}
                ></ElementMenu>
                <PopupMenu
                    menuOptions={popupMenuOptions}
                    anchorEl={popupMenuAnchorEl}
                    onClose={this.onClosePopupMenu}                
                ></PopupMenu>
                <SnackAlert
                    open={alertMessage !== null}
                    message={alertMessage}
                    handleClose={()=>{ this.setState({...this.state, alertMessage: null})}}
                ></SnackAlert>
            </div>
        )
    }

    renderProjectSidebar() {
        const { openResources, selectedResource } = this.state
        const { fairCopyProject } = this.props

        const onSelectResource = ( resourceID ) => {
            this.onResourceAction( 'open', [resourceID] )
        }

        const onCloseResource = ( resourceID ) => {
            this.onResourceAction( 'close', [resourceID] )
        }

        return (
            <ProjectSidebar
                fairCopyProject={fairCopyProject}    
                openResources={openResources}
                selectedResource={selectedResource}
                onSelectResource={onSelectResource}   
                onCloseResource={onCloseResource}
                onEditProjectInfo={this.onEditProjectInfo}
                onOpenResourceBrowser={this.onOpenResourceBrowser}                               
            ></ProjectSidebar>    
        )
    }

    render() {

        const onDragSplitPane = debounce((width) => {
            this.setState({...this.state, leftPaneWidth: width })
        }, resizeRefreshRate)

        const onKeyDown = ( event ) => {
            const {expandedGutter} = this.state
            if( event.ctrlKey && event.key === '.' ) {
                this.setState({...this.state, expandedGutter: !expandedGutter })            
            }
        }
   
        return (
            <div 
                ref={(el) => this.el = el} 
                onKeyDown={onKeyDown} 
            > 
                <SplitPane split="vertical" minSize={initialLeftPaneWidth} maxSize={maxLeftPaneWidth} defaultSize={initialLeftPaneWidth} onChange={onDragSplitPane}>
                    { this.renderProjectSidebar() }
                    { this.renderContentPane() }
                </SplitPane>
                { this.renderDialogs() }
            </div>
        )
    }

}
