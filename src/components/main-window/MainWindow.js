import React, { Component } from 'react'
import { debounce } from "debounce";

import SplitPane from 'react-split-pane'

import ProjectSidebar from './ProjectSidebar'
import AlertDialog from './dialogs/AlertDialog'

import TEIEditor from './tei-editor/TEIEditor'
import ResourceBrowser from './resource-browser/ResourceBrowser'
import EditResourceDialog from './dialogs/EditResourceDialog'
import IIIFImportDialog from './dialogs/IIIFImportDialog'
import AddImageDialog from './dialogs/AddImageDialog'
import PopupMenu from '../common/PopupMenu'
import TEIDocument from '../../model/TEIDocument'
import FacsEditor from './facs-editor/FacsEditor'
import SnackAlert from '../common/SnackAlert'
import EditSurfaceInfoDialog from './dialogs/EditSurfaceInfoDialog'
import MoveResourceDialog from './dialogs/MoveResourceDialog'
import MainWindowStatusBar from './MainWindowStatusBar'
import ReleaseNotesDialog from './dialogs/ReleaseNotesDialog'
import FeedbackDialog from './dialogs/FeedbackDialog'
import EditorDraggingElement from './tei-editor/EditorDraggingElement'
import ImportTextsDialog from './dialogs/ImportTextsDialog'
import ImportConsoleDialog from './dialogs/ImportConsoleDialog'
import { highlightSearchResults, scrollToSearchResult } from '../../model/search'
import SearchDialog from './dialogs/SearchDialog'
import LicenseBar from './LicenseBar'
import LicenseDialog from './dialogs/LicenseDialog'
import CheckInDialog from './dialogs/CheckInDialog'
import { checkOut } from '../../model/resource-index-view';

const fairCopy = window.fairCopy

const initialLeftPaneWidth = 300
const maxLeftPaneWidth = 630
const resizeRefreshRate = 100

export default class MainWindow extends Component {

    constructor() {
        super()
        this.state = {
            selectedResource: null,
            openResources: {},
            resourceView: { 
                indexParentID: null,
                currentPage: 0, 
                rowsPerPage: 100
            },
            resourceIndex: [],
            resourceBrowserOpen: true,
            alertDialogMode: 'closed',
            alertOptions: null,
            exitOnClose: false,
            editDialogMode: false,
            addImagesMode: false,
            releaseNotesMode: false,
            feedbackMode: false,
            draggingElementActive: false,
            dragInfo: null,
            editSurfaceInfoMode: false,
            moveResourceMode: false,
            checkInMode: false,
            checkInResources: [],
            editTEIDocDialogMode: false,
            moveResourceIDs: null,
            surfaceInfo: null,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null,
            popupMenuPlacement: null,
            alertMessage: null,
            expandedGutter: true,
            iiifDialogMode: false,
            textImportDialogMode: false,
            searchQuery: null,
            searchResults: {},
            searchFilterOptions: { active: false, elementName: '', attrQs: []},
            searchSelectionIndex: 0,
            searchFilterMode: false,
            searchEnabled: false,
            licenseMode: false,
            leftPaneWidth: initialLeftPaneWidth
        }	
    }

    onResourceOpened = (event, resourceData) => {
        const { fairCopyProject } = this.props
        const { openResources } = this.state
        const { resourceEntry, parentEntry, resource } = resourceData
        const doc = fairCopyProject.onResourceOpened(resourceEntry, parentEntry, resource)
        if( doc ) {
            const nextOpenResources = { ...openResources }
            nextOpenResources[resourceEntry.id] = doc
            this.setState( {
                ...this.state, 
                openResources: nextOpenResources,
            })    
        }
    }

    onRequestExitApp = () => this.requestExitApp()
    onSearchSystemStatus = (event, status ) => { 
        if( status !== this.state.searchEnabled ) {
            this.setState({...this.state, searchEnabled: status })
        }
    }

    onResourceViewUpdate = (event, resourceData ) => {
        const { resourceView, resourceIndex } = resourceData
        this.setState({...this.state, resourceView, resourceIndex })
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('resourceOpened', this.onResourceOpened )
        services.ipcRegisterCallback('resourceViewUpdate', this.onResourceViewUpdate )
        services.ipcRegisterCallback('requestExitApp', this.onRequestExitApp  ) 
        services.ipcRegisterCallback('searchSystemStatus', this.onSearchSystemStatus )
        this.checkReleaseNotes()
    }

    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('resourceOpened', this.onResourceOpened )
        services.ipcRemoveListener('resourceViewUpdate', this.onResourceViewUpdate )
        services.ipcRemoveListener('requestExitApp', this.onRequestExitApp  ) 
        services.ipcRemoveListener('searchSystemStatus', this.onSearchSystemStatus )
    }

    refreshWindow() {
        const { selectedResource, openResources } = this.state

        if( selectedResource ) {
            const resource = openResources[selectedResource]
            if( resource instanceof TEIDocument && resource.editorView ) {
                this.setState({...this.state})
            }
        }
    }

    updateView = () => { 
        // TODO need a different mechanism for closing deleted files
        // const { openResources } = this.state
        // const { fairCopyProject } = this.props
        // if any open resources no longer exist, close them
        // const doomedResources = []
        // for( const openResourceID of Object.keys(openResources) ) {
        //     if( !fairCopyProject.resources[openResourceID]) {
        //         doomedResources.push(openResourceID)
        //     }
        // }        
        // if( doomedResources.length > 0 ) this.closeResources(doomedResources,false,false)

        // push forward state to update resource entries in components
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

    selectResources(resourceIDs) {
        const { fairCopyProject } = this.props
        const { openResources, selectedResource } = this.state

        let nextSelection = resourceIDs[0]
        let change = (selectedResource !== nextSelection)

        for( const resourceID of resourceIDs ) {
            if( !openResources[resourceID] ) {                
                fairCopyProject.openResource(resourceID)
            }    
        }

        if( change ) {
            this.setState({
                ...this.state,
                selectedResource: nextSelection,
                resourceBrowserOpen: false, 
                currentSubmenuID: 0,
                searchSelectionIndex: 0,
                popupMenuOptions: null, 
                popupMenuAnchorEl: null,
                popupMenuPlacement: null

            })
        } else {
            this.setState( {
                ...this.state, 
                resourceBrowserOpen: false, 
                popupMenuOptions: null, 
                popupMenuAnchorEl: null,
                popupMenuPlacement: null
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
            popupMenuPlacement: null
        })

        if( exitOnClose ) {
            fairCopy.services.ipcSend('exitApp')
        }    
    }

    // a bit of a hack - need to refresh after it renders
    refreshWhenReady( searchQuery, searchResults, openToSearchResult ) {
        setTimeout( () => { 
            const { selectedResource, openResources } = this.state
            const resource = openResources[selectedResource]
            if( resource && resource.getActiveView() ) {
                this.updateSearchResults(resource, searchQuery, searchResults)
                resource.refreshView()     
                if( openToSearchResult ) {
                    scrollToSearchResult( resource, 0 )
                }
            } else {
                this.refreshWhenReady(searchQuery,searchResults, openToSearchResult)
            }
        }, 60 )
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

    checkInResources(checkInResources) {
        this.setState({...this.state, checkInMode: true, checkInResources})
    }

    checkOutResources(resourceIDs) {
        const { fairCopyProject } = this.props
        checkOut( fairCopyProject, resourceIDs, (message) => { 
            this.onAlertMessage(message)
        } )
    }

    onOpenPopupMenu = (popupMenuOptions, popupMenuAnchorEl, popupMenuPlacement ) => {
        this.setState({...this.state, popupMenuOptions, popupMenuAnchorEl, popupMenuPlacement })
    }

    onClosePopupMenu = () => {
        this.setState({...this.state, popupMenuOptions: null, popupMenuAnchorEl: null, popupMenuPlacement: null })
    }

    onEditResource = () => {
        this.setState({...this.state, editDialogMode: true })
    }

    onImportResource = (importType) => {
        if( importType === 'xml' ) {
            this.setState({...this.state, textImportDialogMode: true })
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

    onDragElement = (elementID, clientOffset, startingPoint, dragTarget) => {
        const dragInfo = { elementID, clientOffset, dragTarget, startingPoint }
        this.setState( {...this.state, draggingElementActive: true, dragInfo })
    }

    onResourceAction = (actionID, resourceIDs) => {
        switch(actionID) {
            case 'open-teidoc':
                {
                // send resourceIDs as new parent ID
                const nextResourceView = { ...this.state.resourceView, indexParentID: resourceIDs, currentPage: 0 }
                fairCopy.services.ipcSend('requestResourceView', nextResourceView )
                this.setState({...this.state, selectedResource: null, resourceBrowserOpen: true })
                }
                return false
            case 'open':
                this.selectResources(resourceIDs)
                return false
            case 'open-search-result':
                this.selectResources(resourceIDs, true)
                return false
            case 'check-in':
                this.checkInResources(resourceIDs)
                return true
            case 'check-out':
                this.checkOutResources(resourceIDs)
                return false
            case 'close':
                this.closeResources(resourceIDs)
                return false
            case 'home':
                {
                const nextResourceView = { ...this.state.resourceView, indexParentID: null, currentPage: 0 }
                fairCopy.services.ipcSend('requestResourceView', nextResourceView )
                this.setState( {...this.state, selectedResource: null, resourceBrowserOpen: true })    
                }
                return false
            case 'move':
                this.setState( {...this.state, moveResourceMode: true, moveResourceIDs: resourceIDs} )
                return true
            case 'save':
                this.saveResources(resourceIDs)
                return false
            case 'delete':
                {
                    const { fairCopyProject } = this.props
                    const alertOptions = { resourceIDs }
                    if( fairCopyProject.areEditable( resourceIDs ) ) {
                        this.setState({ ...this.state, alertDialogMode: 'confirmDelete', alertOptions })    
                    } else {
                        this.onAlertMessage("To delete a resource, you must first check it out.")
                    }
                }
                return true
            case 'recover':
                {
                    const { fairCopyProject } = this.props
                    fairCopyProject.recoverResources(resourceIDs)                    
                }
                return true                
            case 'export':
                fairCopy.services.ipcSend('requestExport', resourceIDs)
                return false
            default:
                console.error(`Unrecognized resource action id: ${actionID}`)
                return false
        }
    }

    onSearchResults = ( searchQuery, searchResults, popupMenuOptions, searchBarEl) => {
        const { selectedResource, openResources } = this.state

        if( selectedResource ) {
            const resource = openResources[selectedResource]
            this.updateSearchResults(resource, searchQuery, searchResults)
        }
        if( popupMenuOptions.length === 0 ) {
            this.setState({...this.state, searchQuery, searchResults, searchSelectionIndex: 0, popupMenuOptions: null, popupMenuAnchorEl: null, popupMenuPlacement: null })    
        } else {
            const popupMenuPlacement = { vertical: 'top', horizontal: 'left' }
            this.setState({...this.state, searchQuery, searchResults, searchSelectionIndex: 0, popupMenuOptions, popupMenuAnchorEl: searchBarEl, popupMenuPlacement })
        }
    }

    onSearchFilter = () => {        
        this.setState({...this.state, searchFilterMode: true })
    }

    onLicense = () => {
        this.setState({...this.state, licenseMode: true })
    }

    updateSearchFilter = ( elementName, attrQs, active, open ) => {
        const { searchQuery } = this.state
        const query = searchQuery ? searchQuery.query : ""
        const searchQ = { query, elementName, attrQs }
        fairCopy.services.ipcSend('searchProject', searchQ)

        const searchFilterOptions = { elementName, attrQs, active }
        this.setState({...this.state, searchQuery: searchQ, searchFilterOptions, searchFilterMode: open })    
    }

    updateSearchResults(resource, searchQuery, searchResults) {
        const { resourceID } = resource
        const resourceSearchResults = searchResults[resourceID] ?  searchResults[resourceID] : -1
        highlightSearchResults(resource, searchQuery, resourceSearchResults)
    }

    renderEditors() {
        const { openResources, selectedResource, leftPaneWidth, expandedGutter } = this.state
        const { fairCopyProject, onProjectSettings } = this.props
        const remoteProject = fairCopyProject.remote

        const editors = []
        for( const resource of Object.values(openResources) ) {
            const hidden = selectedResource !== resource.resourceID
            const key = `editor-${resource.resourceID}`
            const { resourceEntry, parentEntry } = resource

            const onSave = () => { this.onResourceAction('save',[resource.resourceID]) }
            const onConfirmDeleteImages = ( alertOptions ) => {
                this.setState({ ...this.state, alertDialogMode: 'confirmDeleteImages', alertOptions })
            }

            // bump state to update sidebar
            const onErrorCountChange = () => { this.setState({...this.state})}
        
            if( resource instanceof TEIDocument ) {
                editors.push(
                    <TEIEditor 
                        key={key}
                        hidden={hidden}
                        teiDocument={resource}
                        resourceEntry={resourceEntry}
                        parentResource={parentEntry}
                        onOpenElementMenu={this.onOpenElementMenu}
                        onProjectSettings={onProjectSettings}
                        onDragElement={this.onDragElement}
                        onEditResource={this.onEditResource}
                        onAlertMessage={this.onAlertMessage}
                        onResourceAction={this.onResourceAction}
                        onErrorCountChange={onErrorCountChange}
                        onSave={onSave}
                        leftPaneWidth={leftPaneWidth}
                        expandedGutter={expandedGutter}
                        remoteProject={remoteProject}
                    ></TEIEditor>
                )        
            } else {
                editors.push(
                    <FacsEditor
                        key={key}
                        hidden={hidden}
                        facsDocument={resource}
                        resourceEntry={resourceEntry}
                        parentResource={parentEntry}
                        fairCopyProject={fairCopyProject}
                        onEditResource={this.onEditResource}    
                        onResourceAction={this.onResourceAction}
                        onAddImages={this.onAddImages}
                        onOpenPopupMenu={this.onOpenPopupMenu}
                        onConfirmDeleteImages={onConfirmDeleteImages}
                        onEditSurfaceInfo={this.onEditSurfaceInfo}
                    ></FacsEditor>
                )                     
            }
        }

        return editors 
    }

    renderContentPane() {
        const { fairCopyProject } = this.props
        const { resourceBrowserOpen, resourceView, resourceIndex } = this.state
        const { indexParentID } = resourceView
        const parentResource = indexParentID ? fairCopyProject.getResourceEntry(indexParentID) : null
        
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
                        resourceView={resourceView}
                        resourceIndex={resourceIndex}
                        fairCopyProject={fairCopyProject}
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
        const { editDialogMode, searchFilterMode, searchFilterOptions, checkInResources, checkInMode, addImagesMode, releaseNotesMode, licenseMode, feedbackMode, dragInfo, draggingElementActive, moveResourceMode, editTEIDocDialogMode, moveResourceIDs, openResources, selectedResource, resourceView } = this.state
        const { fairCopyProject, appConfig } = this.props
        const { idMap } = fairCopyProject
        const { indexParentID } = resourceView

        const selectedDoc = selectedResource ? openResources[selectedResource] : null
        const resourceEntry = selectedResource ? fairCopyProject.getResourceEntry(selectedResource) : null
        const parentEntry = resourceEntry ? fairCopyProject.getParent(resourceEntry) : indexParentID ? fairCopyProject.getResourceEntry(indexParentID) : null

        const { alertMessage, editSurfaceInfoMode, iiifDialogMode, textImportDialogMode, surfaceInfo } = this.state
        const { popupMenuOptions, popupMenuAnchorEl, popupMenuPlacement } = this.state

        const onSaveResource = (name,localID,type) => {
            if( resourceEntry ) {
                fairCopyProject.updateResource({ ...resourceEntry, name, localID, type })
            } else {
                fairCopyProject.newResource( name, localID, type, indexParentID )    
            }
            this.setState( {...this.state, editDialogMode: false} )
        }

        const onSaveTEIDoc = (name,localID,type) => {
            fairCopyProject.updateResource({ ...parentEntry, name, localID, type })
            this.setState( {...this.state, editTEIDocDialogMode: false} )
        }        

        const onSaveSurfaceInfo = (surfaceInfo) => {
            const facsDocument = openResources[surfaceInfo.resourceID]
            facsDocument.updateSurfaceInfo(surfaceInfo)
            this.setState( {...this.state, surfaceInfo: null, editSurfaceInfoMode: false} )
        }

        return (
            <div className="dialog-container">
                { this.renderAlertDialog() }
                <ImportConsoleDialog
                    fairCopyProject={fairCopyProject}
                    parentResourceID={indexParentID}
                ></ImportConsoleDialog>
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
                    parentResourceID={indexParentID}
                    onClose={()=>{ this.setState( {...this.state, iiifDialogMode: false} )}}
                ></IIIFImportDialog> }
                { textImportDialogMode && < ImportTextsDialog
                    fairCopyProject={fairCopyProject}
                    parentResourceID={indexParentID}
                    onClose={()=>{ this.setState( {...this.state, textImportDialogMode: false} )}}
                ></ImportTextsDialog> }
                { addImagesMode && <AddImageDialog
                    idMap={idMap}
                    facsDocument={selectedDoc}
                    onClose={()=>{ this.setState( {...this.state, addImagesMode: false} )}}
                ></AddImageDialog> }
                { draggingElementActive && <EditorDraggingElement
                    elementID={dragInfo.elementID}
                    teiDocument={selectedDoc}
                    onAlertMessage={this.onAlertMessage}
                    dragTarget={dragInfo.dragTarget}
                    startingPoint={dragInfo.startingPoint}
                    clientOffset={dragInfo.clientOffset}
                    onDraggedAway={()=>{}}
                    onDrop={()=>{ this.setState( {...this.state, dragInfo: null, draggingElementActive: false} )}}
                ></EditorDraggingElement> }
                { moveResourceMode && <MoveResourceDialog
                    resourceIDs={moveResourceIDs}
                    fairCopyProject={fairCopyProject}
                    closeResources={this.closeResources}
                    onClose={()=>{ this.setState( {...this.state, moveResourceMode: false, moveResourceIDs: null} )}}
                ></MoveResourceDialog> }
                { popupMenuAnchorEl && <PopupMenu
                    menuOptions={popupMenuOptions}
                    anchorEl={popupMenuAnchorEl}
                    placement={popupMenuPlacement}
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
                { searchFilterMode && <SearchDialog
                    searchFilterOptions={searchFilterOptions}
                    updateSearchFilter={this.updateSearchFilter}
                    onClose={()=>{ this.setState( {...this.state, searchFilterMode: false} )}}
                ></SearchDialog> }
                { licenseMode && <LicenseDialog
                    appConfig={appConfig}
                    onClose={()=>{ this.setState( {...this.state, licenseMode: false} )}}
                ></LicenseDialog> }
                { checkInMode && <CheckInDialog
                    fairCopyProject={fairCopyProject}
                    checkInResources={checkInResources}
                    onClose={()=>{ this.setState( {...this.state, checkInMode: false} )}}
                ></CheckInDialog> }
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
        const { fairCopyProject, onProjectSettings } = this.props

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
                onEditProjectInfo={onProjectSettings}
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
        const { appConfig, hidden, fairCopyProject } = this.props
        const { searchEnabled, searchFilterOptions, selectedResource, openResources, searchSelectionIndex, resourceBrowserOpen } = this.state

        const onDragSplitPane = debounce((width) => {
            this.setState({...this.state, leftPaneWidth: width })
        }, resizeRefreshRate)

        // TODO fix for search ( selectedResource && isIndexable(openResources[selectedResource].resourceType) ) 
        const currentResource = selectedResource ? openResources[selectedResource] : null

        // hide the interface (to suspend state)
        const style = hidden ? { display: 'none' } : {}

        return (
            <div style={style}>
                <div onKeyDown={this.onKeyDown} > 
                    { resourceBrowserOpen && <LicenseBar
                        onLicense={this.onLicense}
                    ></LicenseBar> }
                    <SplitPane split="vertical" minSize={initialLeftPaneWidth} maxSize={maxLeftPaneWidth} defaultSize={initialLeftPaneWidth} onChange={onDragSplitPane}>
                        { this.renderProjectSidebar() }
                        { this.renderContentPane() }
                    </SplitPane>
                    <MainWindowStatusBar
                        appConfig={appConfig}
                        fairCopyProject={fairCopyProject}
                        onSearchResults={this.onSearchResults}
                        onSearchFilter={this.onSearchFilter}
                        onAlertMessage={this.onAlertMessage}
                        currentResource={currentResource}
                        searchSelectionIndex={searchSelectionIndex}
                        searchFilterOptions={searchFilterOptions}
                        searchEnabled={searchEnabled}
                        onUpdateSearchSelection={(searchSelectionIndex)=> { this.setState({...this.state, searchSelectionIndex })}}
                        onResourceAction={this.onResourceAction}
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
