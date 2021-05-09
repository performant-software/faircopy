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
import IIIFImportDialog from './IIIFImportDialog'
import AddImageDialog from './AddImageDialog'
import PopupMenu from './PopupMenu'
import TEIDocument from '../tei-document/TEIDocument'
import FacsEditor from './FacsEditor'
import SnackAlert from './SnackAlert'
import EditSurfaceInfoDialog from './EditSurfaceInfoDialog'
import MoveResourceDialog from './MoveResourceDialog'
import MainWindowStatusBar from './MainWindowStatusBar'
import ReleaseNotesDialog from './ReleaseNotesDialog'
import FeedbackDialog from './FeedbackDialog'
import StructurePalette from './StructurePalette'
import DraggingElement from './DraggingElement';

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
            parentResourceID: null,
            resourceBrowserOpen: true,
            alertDialogMode: 'closed',
            alertOptions: null,
            exitOnClose: false,
            editDialogMode: false,
            paletteWindowOpen: false,
            addImagesMode: false,
            releaseNotesMode: false,
            feedbackMode: false,
            draggingElementActive: false,
            dragInfo: null,
            currentSubmenuID: 'structure',
            editProjectDialogMode: false,
            editSurfaceInfoMode: false,
            moveResourceMode: false,
            editTEIDocDialogMode: false,
            moveResourceIDs: null,
            surfaceInfo: null,
            elementMenuOptions: null,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null,
            alertMessage: null,
            expandedGutter: true,
            iiifDialogMode: false,
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
        this.checkReleaseNotes()
    }

    componentWillUnmount() {
        const { fairCopyProject } = this.props
        fairCopyProject.removeUpdateListener(this.receivedUpdate)
        fairCopyProject.idMap.removeUpdateListener(this.receivedUpdate)
    }
    
    receivedUpdate = () => { 
        const { openResources } = this.state
        const { fairCopyProject } = this.props
        // if any open resources no longer exist, close them
        const doomedResources = []
        for( const openResourceID of Object.keys(openResources) ) {
            if( !fairCopyProject.resources[openResourceID]) {
                doomedResources.push(openResourceID)
            }
        }        
        this.closeResources(doomedResources,false,false)
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

    checkReleaseNotes() {
        const { appConfig } = this.props
        const { version } = appConfig

        const licenseDataJSON = localStorage.getItem('licenseData')
        const licenseData = JSON.parse(licenseDataJSON)
        const { viewedReleaseNotes } = licenseData
        
        // display release notes if they haven't been viewed
        if( !viewedReleaseNotes || viewedReleaseNotes !== version ) {
            this.setState({ ...this.state, releaseNotesMode: true })
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

        const { openResources } = this.state
        const openResource = openResources[resourceID]
        if( openResource ) {
            openResource.load(resource)
            this.setState({...this.state})
        }     
    }

    receiveImportData( importData ) {
        const { fairCopyProject } = this.props
        const { parentResourceID } = this.state
        const { error, errorMessage } = fairCopyProject.importResource(importData,parentResourceID)
        if( error ) {
            const alertOptions = { errorMessage }
            this.setState({...this.state, alertDialogMode: 'importError', alertOptions })
        } else {
            this.setState({...this.state})
        }
    }

    selectResources(resourceIDs) {
        const { fairCopyProject } = this.props
        const { openResources, selectedResource } = this.state

        let nextSelection = resourceIDs.find( r => fairCopyProject.getResourceEntry(r).type !== 'teidoc' )
        let change = (selectedResource !== nextSelection)
        let nextResources = { ...openResources }
        for( const resourceID of resourceIDs ) {
            if( !openResources[resourceID] ) {
                const resource = fairCopyProject.getResourceEntry(resourceID)
                // can't select a tei doc this way, skip
                if( resource.type !== 'teidoc' ) {
                    nextResources[resourceID] = fairCopyProject.openResource(resourceID)
                    change = true    
                }
            }    
        }

        if( change ) {
            this.setState( {
                ...this.state, 
                selectedResource: nextSelection,
                openResources: nextResources, 
                resourceBrowserOpen: false, 
                currentSubmenuID: 'structure',
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
            popupMenuAnchorEl: null,
            currentSubmenuID: 'structure'
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

    onTogglePalette = () => {
        const { paletteWindowOpen } = this.state
        this.setState({...this.state, paletteWindowOpen: !paletteWindowOpen })
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

    onImportResource = (importType) => {
        if( importType === 'xml' ) {
            fairCopy.services.ipcSend('requestImport')
        } else {
            this.setState({...this.state, iiifDialogMode: true })
        }
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

    onDragElement = (elementID, startingPoint) => {
        const dragInfo = { elementID, startingPoint }
        this.setState( {...this.state, draggingElementActive: true, dragInfo })
    }

    onResourceAction = (actionID, resourceIDs) => {
        switch(actionID) {
            case 'open-teidoc':
                this.setState({...this.state, parentResourceID: resourceIDs})
                return false
            case 'close-teidoc':
                this.setState({...this.state, parentResourceID: null})
                return false
            case 'open':
                this.selectResources(resourceIDs)
                return false
            case 'close':
                this.closeResources(resourceIDs)
                return false
            case 'move':
                this.setState( {...this.state, moveResourceMode: true, moveResourceIDs: resourceIDs} )
                return true
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
        const { openResources, selectedResource, leftPaneWidth, expandedGutter, paletteWindowOpen } = this.state
        const { fairCopyProject } = this.props

        const editors = []
        for( const resource of Object.values(openResources) ) {
            const hidden = selectedResource !== resource.resourceID
            const key = `editor-${resource.resourceID}`
            const resourceEntry = fairCopyProject.getResourceEntry(resource.resourceID)

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
                            onTogglePalette={this.onTogglePalette}
                            paletteActive={paletteWindowOpen}
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
        const { resourceBrowserOpen, parentResourceID } = this.state
        const parentResource = parentResourceID ? fairCopyProject.getResourceEntry(parentResourceID) : null
        const resources = fairCopyProject.getResources(parentResource)
        
        return (
            <div>
                { resourceBrowserOpen && 
                    <ResourceBrowser
                        onResourceAction={this.onResourceAction}
                        onOpenPopupMenu={this.onOpenPopupMenu}
                        onEditResource={this.onEditResource}
                        onEditTEIDoc={ () => { this.setState({ ...this.state, editTEIDocDialogMode: true }) }}
                        onImportResource={this.onImportResource}
                        teiDoc={parentResource}
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
        const { editDialogMode, addImagesMode, releaseNotesMode, feedbackMode, currentSubmenuID, dragInfo, draggingElementActive, paletteWindowOpen, moveResourceMode, editTEIDocDialogMode, moveResourceIDs, openResources, selectedResource, elementMenuOptions, parentResourceID } = this.state
        const { fairCopyProject, appConfig } = this.props
        const { idMap } = fairCopyProject

        const selectedDoc = selectedResource ? openResources[selectedResource] : null
        const resourceEntry = selectedResource ? fairCopyProject.getResourceEntry(selectedResource) : null
        const parentEntry = resourceEntry ? fairCopyProject.getParent(resourceEntry) : fairCopyProject.getResourceEntry(parentResourceID)
        const projectInfo = { name: fairCopyProject.projectName, description: fairCopyProject.description, projectFilePath: fairCopyProject.projectFilePath }

        const { editProjectDialogMode, alertMessage, editSurfaceInfoMode, iiifDialogMode, surfaceInfo } = this.state
        const { popupMenuOptions, popupMenuAnchorEl } = this.state

        const onSaveResource = (name,localID,type) => {
            if( resourceEntry ) {
                fairCopyProject.updateResource({ ...resourceEntry, name, localID, type })
            } else {
                fairCopyProject.newResource( name, localID, type, parentResourceID )    
            }
            this.setState( {...this.state, editDialogMode: false} )
        }

        const onSaveTEIDoc = (name,localID,type) => {
            fairCopyProject.updateResource({ ...parentEntry, name, localID, type })
            this.setState( {...this.state, editTEIDocDialogMode: false} )
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
            <div className="dialog-container">
                { this.renderAlertDialog() }
                { editDialogMode && <EditResourceDialog
                    idMap={idMap}
                    resourceEntry={resourceEntry}
                    parentEntry={parentEntry}
                    onSave={onSaveResource}
                    onClose={()=>{ this.setState( {...this.state, editDialogMode: false} )}}
                ></EditResourceDialog> }
                { editTEIDocDialogMode && <EditResourceDialog
                    idMap={idMap}
                    resourceEntry={parentEntry}
                    parentEntry={null}
                    onSave={onSaveTEIDoc}
                    onClose={()=>{ this.setState( {...this.state, editTEIDocDialogMode: false} )}}
                ></EditResourceDialog> }
                { iiifDialogMode && <IIIFImportDialog
                    fairCopyProject={fairCopyProject}
                    parentResourceID={parentResourceID}
                    onClose={()=>{ this.setState( {...this.state, iiifDialogMode: false} )}}
                ></IIIFImportDialog> }
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
                { paletteWindowOpen && <StructurePalette
                    onDragElement={this.onDragElement}
                    teiDocument={selectedDoc}
                    currentSubmenuID={currentSubmenuID}
                    onChangeMenu={(currentSubmenuID)=>{ this.setState( {...this.state, currentSubmenuID} )}}
                    onClose={()=>{ this.setState( {...this.state, paletteWindowOpen: false} )}}
                ></StructurePalette> }
                { draggingElementActive && <DraggingElement
                    elementID={dragInfo.elementID}
                    teiDocument={selectedDoc}
                    startingPoint={dragInfo.startingPoint}
                    onDrop={()=>{ this.setState( {...this.state, dragInfo: null, draggingElementActive: false} )}}
                ></DraggingElement> }
                { elementMenuOptions && <ElementMenu
                    teiDocument={selectedDoc}
                    onAlertMessage={this.onAlertMessage}
                    onClose={this.onCloseElementMenu}
                    elementMenuAnchors={this.elementMenuAnchors}
                    {...elementMenuOptions}
                ></ElementMenu> }
                { moveResourceMode && <MoveResourceDialog
                    resourceIDs={moveResourceIDs}
                    fairCopyProject={fairCopyProject}
                    closeResources={this.closeResources}
                    onClose={()=>{ this.setState( {...this.state, moveResourceMode: false, moveResourceIDs: null} )}}
                ></MoveResourceDialog> }
                { popupMenuAnchorEl && <PopupMenu
                    menuOptions={popupMenuOptions}
                    anchorEl={popupMenuAnchorEl}
                    onClose={this.onClosePopupMenu}                
                ></PopupMenu> }
                { releaseNotesMode && <ReleaseNotesDialog
                    appConfig={appConfig}
                    onClose={()=> { this.setState( { ...this.state, releaseNotesMode: false })}}                
                ></ReleaseNotesDialog> }
                { feedbackMode && <FeedbackDialog
                    appConfig={appConfig}
                    onClose={()=> { this.setState( { ...this.state, feedbackMode: false })}}                
                ></FeedbackDialog> }
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
        const { appConfig } = this.props

        const onDragSplitPane = debounce((width) => {
            this.setState({...this.state, leftPaneWidth: width })
        }, resizeRefreshRate)
   
        return (
            <div>
                <div onKeyDown={this.onKeyDown} > 
                    <SplitPane split="vertical" minSize={initialLeftPaneWidth} maxSize={maxLeftPaneWidth} defaultSize={initialLeftPaneWidth} onChange={onDragSplitPane}>
                        { this.renderProjectSidebar() }
                        { this.renderContentPane() }
                    </SplitPane>
                    <MainWindowStatusBar
                        appConfig={appConfig}
                        onQuitAndInstall={()=>{ this.requestExitApp() }}
                        onFeedback={()=>{ this.setState({ ...this.state, feedbackMode: true })}}
                        onDisplayNotes={()=>{ this.setState({ ...this.state, releaseNotesMode: true })}}
                    ></MainWindowStatusBar>
                </div>
                { this.renderDialogs() }
            </div>
        )
    }

}
