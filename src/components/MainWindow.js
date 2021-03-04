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
import AddImageDialog from './AddImageDialog'
import PopupMenu from './PopupMenu'
import TEIDocument from '../tei-document/TEIDocument'
import FacsEditor from './FacsEditor'
import SnackAlert from './SnackAlert'
import EditSurfaceInfoDialog from './EditSurfaceInfoDialog'

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
            openTEIDoc: null,
            resourceBrowserOpen: true,
            alertDialogMode: 'closed',
            alertOptions: null,
            exitOnClose: false,
            editDialogMode: false,
            addImagesMode: false,
            editProjectDialogMode: false,
            editSurfaceInfoMode: false,
            surfaceInfo: null,
            elementMenuOptions: null,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null,
            alertMessage: null,
            expandedGutter: true,
            leftPaneWidth: initialLeftPaneWidth
        }	
        this.elementMenuAnchors = {}
    }

    componentDidMount() {
        const { fairCopyProject } = this.props
        const {services} = fairCopy
        services.ipcRegisterCallback('resourceOpened', (event, resourceData) => this.receiveResourceData(resourceData))
        services.ipcRegisterCallback('importOpened', (event, importData) => this.receiveImportData(importData))
        services.ipcRegisterCallback('requestExitApp', () => this.requestExitApp() ) 
        fairCopyProject.addUpdateListener(this.receivedUpdate)
        fairCopyProject.idMap.addUpdateListener(this.receivedUpdate)
    }

    componentWillUnmount() {
        const { fairCopyProject } = this.props
        fairCopyProject.removeUpdateListener(this.receivedUpdate)
        fairCopyProject.idMap.removeUpdateListener(this.receivedUpdate)
    }
    
    receivedUpdate = () => { 
        this.setState({...this.state}) 
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
        const { fairCopyProject } = this.props
        const { resources } = fairCopyProject
        const resourceEntry = resources[resourceID]

        if( !resourceEntry ) {
            console.error(`Received data from unrecongnized resource ID: ${resourceID}`)
            return
        }

        if( resourceEntry.type === 'teidoc' ) {
            const { openTEIDoc } = this.state
            if( openTEIDoc ) {
                openTEIDoc.load(resource)
                this.setState({...this.state})    
            }
        } else {
            const { openResources } = this.state
            const openResource = openResources[resourceID]
            if( openResource ) {
                openResource.load(resource)
                this.setState({...this.state})
            }     
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

    openTEIDoc(resourceID) {
        const { fairCopyProject } = this.props
        const openTEIDoc = fairCopyProject.openResource(resourceID)
        this.setState({...this.state, openTEIDoc})
    }

    closeTEIDoc() {
        this.setState({...this.state, openTEIDoc: null})
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

    closeResources = (resourceIDs,exitOnClose=false,promptSave=true) => {
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

    saveResources(resourceIDs) {
        const { openResources, selectedResource } = this.state
        for( const resourceID of resourceIDs ) {
            const resource = openResources[resourceID]
            if( resource && resource.changedSinceLastSave ) {
                resource.save()
                if( resource.resourceID === selectedResource ) resource.refreshView()         
            }            
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

    onAddImages = () => {
        this.setState({...this.state, addImagesMode: true })
    }

    onAlertMessage = (message) => {
        this.setState({...this.state, alertMessage: message })
    }

    onEditSurfaceInfo = (surfaceInfo) => {
        this.setState( {...this.state, surfaceInfo: surfaceInfo, editSurfaceInfoMode: true} )
    }

    onResourceAction = (actionID, resourceIDs) => {
        switch(actionID) {
            case 'open-teidoc':
                this.openTEIDoc(resourceIDs)
                return false
            case 'close-teidoc':
                this.closeTEIDoc()
                return false
            case 'open':
                this.selectResources(resourceIDs)
                return false
            case 'close':
                this.closeResources(resourceIDs)
                return false
            case 'save':
                this.saveResources(resourceIDs)
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
            const resourceEntry = fairCopyProject.resources[resource.resourceID]

            const onSave = () => { this.onResourceAction('save',[resource.resourceID]) }
            const onConfirmDeleteImages = ( alertOptions ) => {
                this.setState({ ...this.state, alertDialogMode: 'confirmDeleteImages', alertOptions })
            }
        
            if( resource.loading ) {
                editors.push(<div key={key}></div>)
            } else {
                if( resource instanceof TEIDocument ) {
                    editors.push(
                        <TEIEditor 
                            key={key}
                            hidden={hidden}
                            teiDocument={resource}
                            resourceEntry={resourceEntry}
                            fairCopyProject={fairCopyProject}
                            onOpenElementMenu={this.onOpenElementMenu}
                            onEditResource={this.onEditResource}
                            elementMenuAnchors={this.elementMenuAnchors}
                            onSave={onSave}
                            leftPaneWidth={leftPaneWidth}
                            expandedGutter={expandedGutter}
                        ></TEIEditor>
                    )        
                } else {
                    editors.push(
                        <FacsEditor
                            key={key}
                            hidden={hidden}
                            facsDocument={resource}
                            resourceEntry={resourceEntry}
                            fairCopyProject={fairCopyProject}
                            onEditResource={this.onEditResource}    
                            onAddImages={this.onAddImages}
                            onOpenPopupMenu={this.onOpenPopupMenu}
                            onConfirmDeleteImages={onConfirmDeleteImages}
                            onEditSurfaceInfo={this.onEditSurfaceInfo}
                        ></FacsEditor>
                    )                     
                }
            }
        }

        return editors 
    }

    renderContentPane() {
        const { fairCopyProject } = this.props
        const { resourceBrowserOpen, openTEIDoc } = this.state
        const resources = openTEIDoc ? openTEIDoc.getResources() : fairCopyProject.resources
        const teiDocName = openTEIDoc ? fairCopyProject.resources[openTEIDoc.resourceID].name : null

        return (
            <div>
                { resourceBrowserOpen && 
                    <ResourceBrowser
                        onResourceAction={this.onResourceAction}
                        onOpenPopupMenu={this.onOpenPopupMenu}
                        onEditResource={this.onEditResource}
                        onImportResource={this.onImportResource}
                        teiDocName={teiDocName}
                        resources={resources}
                    ></ResourceBrowser> }
                { this.renderEditors() }
            </div>
        )
    }

    renderAlertDialog() {
        const { fairCopyProject } = this.props
        const { alertDialogMode, alertOptions, exitOnClose } = this.state

        const onCloseAlert = () => {
            this.setState({ ...this.state, alertDialogMode: 'closed', alertOptions: null })
        }
    
        return (
            <AlertDialog
                alertDialogMode={alertDialogMode}
                alertOptions={alertOptions}
                onCloseAlert={onCloseAlert}
                closeResources={this.closeResources}
                exitOnClose={exitOnClose}
                fairCopyProject={fairCopyProject}
            ></AlertDialog>    
        )
    }

    renderDialogs() {
        const { editDialogMode, addImagesMode, openResources, selectedResource, elementMenuOptions } = this.state
        const { fairCopyProject } = this.props
        const { idMap } = fairCopyProject

        const selectedDoc = selectedResource ? openResources[selectedResource] : null
        const resourceEntry = selectedResource ? fairCopyProject.resources[selectedResource] : null
        const projectInfo = { name: fairCopyProject.projectName, description: fairCopyProject.description }

        const { editProjectDialogMode, alertMessage, editSurfaceInfoMode, surfaceInfo } = this.state
        const { popupMenuOptions, popupMenuAnchorEl } = this.state

        const onSaveResource = (name,localID,type,url) => {
            if( resourceEntry ) {
                fairCopyProject.updateResource({ id: resourceEntry.id, name, localID, type })
            } else {
                fairCopyProject.newResource(
                    name,
                    localID,
                    type,
                    url, 
                    (errorMessage) => { this.setState({...this.state, alertMessage: errorMessage }) },
                    () => { this.setState({...this.state}) }
                )    
            }
            this.setState( {...this.state, editDialogMode: false} )
        }

        const onSaveProjectInfo = (name,description) => {
            fairCopyProject.updateProjectInfo({name, description})
            this.setState( {...this.state, editProjectDialogMode: false} )
        }

        const onSaveSurfaceInfo = (surfaceInfo) => {
            const facsDocument = openResources[surfaceInfo.resourceID]
            facsDocument.updateSurfaceInfo(surfaceInfo)
            this.setState( {...this.state, surfaceInfo: null, editSurfaceInfoMode: false} )
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
                { addImagesMode && <AddImageDialog
                    idMap={idMap}
                    facsDocument={selectedDoc}
                    onClose={()=>{ this.setState( {...this.state, addImagesMode: false} )}}
                ></AddImageDialog> }
                { editProjectDialogMode && <EditProjectDialog
                    projectInfo={projectInfo}
                    onSave={onSaveProjectInfo}
                    onClose={()=>{ this.setState( {...this.state, editProjectDialogMode: false} )}}
                ></EditProjectDialog> }
                { elementMenuOptions && <ElementMenu
                    teiDocument={selectedDoc}
                    onAlertMessage={this.onAlertMessage}
                    onClose={this.onCloseElementMenu}
                    elementMenuAnchors={this.elementMenuAnchors}
                    {...elementMenuOptions}
                ></ElementMenu> }
                { popupMenuAnchorEl && <PopupMenu
                    menuOptions={popupMenuOptions}
                    anchorEl={popupMenuAnchorEl}
                    onClose={this.onClosePopupMenu}                
                ></PopupMenu> }
                { editSurfaceInfoMode && <EditSurfaceInfoDialog
                    surfaceInfo={surfaceInfo}
                    onSave={onSaveSurfaceInfo}
                    onClose={()=>{ this.setState( {...this.state, editSurfaceInfoMode: false, surfaceInfo: null} )}}
                ></EditSurfaceInfoDialog> }
                <SnackAlert
                    open={alertMessage !== null}
                    message={alertMessage}
                    handleClose={()=>{ this.setState({...this.state, alertMessage: null})}}
                ></SnackAlert>
            </div>
        )
    }

    renderProjectSidebar() {
        const { openResources, selectedResource, leftPaneWidth } = this.state
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
                panelWidth={leftPaneWidth}
                openResources={openResources}
                selectedResource={selectedResource}
                onSelectResource={onSelectResource}   
                onCloseResource={onCloseResource}
                onEditProjectInfo={this.onEditProjectInfo}
                onOpenResourceBrowser={this.onOpenResourceBrowser}                               
            ></ProjectSidebar>    
        )
    }

    onKeyDown = ( event ) => {
        const ctrlDown = event.ctrlKey
        const commandDown = event.metaKey
        const {key} = event

        if( ctrlDown || commandDown ) {
            switch(key) {
                case '/':
                    const {expandedGutter} = this.state
                    this.setState({...this.state, expandedGutter: !expandedGutter })    
                    break
                // TODO
                // case ' ':
                //     const activeMenu = 'structure'
                //     this.onOpenElementMenu({ menuGroup: activeMenu, action: 'replace' })
                //     break
                case 's':
                    const { selectedResource } = this.state
                    if( selectedResource ) {
                        this.onResourceAction('save',[selectedResource])
                    }
                    break
                default:
                    break
            }
        }
    }

    render() {

        const onDragSplitPane = debounce((width) => {
            this.setState({...this.state, leftPaneWidth: width })
        }, resizeRefreshRate)
   
        return (
            <div 
                ref={(el) => this.el = el} 
                onKeyDown={this.onKeyDown} 
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
