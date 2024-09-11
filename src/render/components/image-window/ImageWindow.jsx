import React, { Component } from 'react'

import FacsEditor from '../main-window/facs-editor/FacsEditor'
import EditResourceDialog from '../main-window/dialogs/EditResourceDialog'
import AddImageDialog from '../main-window/dialogs/AddImageDialog'
import PopupMenu from '../common/PopupMenu'
import AlertDialog from '../main-window/dialogs/AlertDialog'
import EditSurfaceInfoDialog from '../main-window/dialogs/EditSurfaceInfoDialog'
import MoveResourceDialog from '../main-window/dialogs/MoveResourceDialog'

const fairCopy = window.fairCopy

export default class ImageWindow extends Component {

    constructor() {
        super()
        this.state = {
            localResources: [],
            editDialogMode: false,
            addImagesMode: false,
            popupMenuOptions: null, 
            popupMenuAnchorEl: null,
            surfaceInfo: null,
            editSurfaceInfoMode: false,
            alertDialogMode: 'closed',
            alertOptions: null,
        }	
    }

    componentDidMount() {
        const { imageView } = this.props
        imageView.addUpdateListener(this.updateListener)
        fairCopy.ipcRegisterCallback('localResources', this.onLocalResources )
    }
    
    componentWillUnmount() {
        const { imageView } = this.props
        imageView.removeUpdateListener(this.updateListener)
        fairCopy.ipcRemoveListener('localResources', this.onLocalResources )
    }

    onLocalResources = (event,localResources) => {
        this.setState({...this.state, localResources })
    }

    updateListener = () => { this.setState({...this.state}) }

    onEditResource = () => {
        this.setState({...this.state, editDialogMode: true })
    }

    onAddImages = () => {
        this.setState({...this.state, addImagesMode: true })
    }

    onOpenPopupMenu = (popupMenuOptions, popupMenuAnchorEl) => {
        this.setState({...this.state, popupMenuOptions, popupMenuAnchorEl })
    }

    onConfirmDeleteImages = ( alertOptions ) => {
        this.setState({ ...this.state, alertDialogMode: 'confirmDeleteImages', alertOptions })
    }

    onSaveResource = (name,localID,type,url) => {
        const { imageView } = this.props
        imageView.updateResource({ name, localID, type, url })
        this.setState( {...this.state, editDialogMode: false} )
    }

    onClosePopupMenu = () => {
        this.setState({...this.state, popupMenuOptions: null, popupMenuAnchorEl: null })
    }

    onEditSurfaceInfo = (surfaceInfo) => {
        this.setState( {...this.state, surfaceInfo: surfaceInfo, editSurfaceInfoMode: true} )
    }

    onMoveSurfaces = ( facsDocument, surfaces, onMoved ) => {
        const onMove = (movingItems, parentEntry)=>{ facsDocument.moveSurfaces( movingItems, parentEntry, onMoved ) }
        const moveResourceProps = { resourceType: 'facs', allowRoot: false, movingItems: surfaces, onMove, onMoved }
        this.setState( {...this.state, moveResourceMode: true, moveResourceProps } )
    }

    onSaveSurfaceInfo = (surfaceInfo) => {
        const { imageView } = this.props
        imageView.facsDocument.updateSurfaceInfo(surfaceInfo)
        this.setState( {...this.state, surfaceInfo: null, editSurfaceInfoMode: false} )
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

    render() {
        const { imageView } = this.props

        if(!imageView || imageView.facsDocument.loading ) return null
        const { facsDocument, resourceEntry, parentEntry, idMap, startingID } = imageView
        const { editDialogMode, addImagesMode, popupMenuAnchorEl, moveResourceMode, moveResourceProps, popupMenuOptions, surfaceInfo, editSurfaceInfoMode, localResources } = this.state

        const startIndex = facsDocument.getIndex(startingID)

        return (
            <div id="ImageWindow">
                <FacsEditor
                    facsDocument={imageView.facsDocument}
                    resourceEntry={resourceEntry}
                    onEditResource={this.onEditResource}    
                    onEditSurface={this.onEditSurface}
                    onAddImages={this.onAddImages}
                    onOpenPopupMenu={this.onOpenPopupMenu}
                    onConfirmDeleteImages={this.onConfirmDeleteImages}
                    onEditSurfaceInfo={this.onEditSurfaceInfo}
                    onMoveSurfaces={this.onMoveSurfaces}
                    startIndex={startIndex}
                    windowed={true}
                ></FacsEditor>
                { this.renderAlertDialog() }
                { editDialogMode && <EditResourceDialog
                    idMap={idMap}
                    resourceEntry={resourceEntry}
                    parentEntry={parentEntry}
                    onSave={this.onSaveResource}
                    onClose={()=>{ this.setState( {...this.state, editDialogMode: false} )}}
                ></EditResourceDialog> }
                { addImagesMode && <AddImageDialog
                    idMap={idMap}
                    facsDocument={imageView.facsDocument}
                    onClose={()=>{ this.setState( {...this.state, addImagesMode: false} )}}
                ></AddImageDialog> }
                { moveResourceMode && <MoveResourceDialog
                    { ...moveResourceProps }
                    localResources={localResources}
                    onClose={()=>{ this.setState( {...this.state, moveResourceMode: false, moveResourceProps: null, popupMenuOptions: null, popupMenuAnchorEl: null} )}}
                ></MoveResourceDialog> }
                { popupMenuAnchorEl && <PopupMenu
                    menuOptions={popupMenuOptions}
                    anchorEl={popupMenuAnchorEl}
                    onClose={this.onClosePopupMenu}                
                ></PopupMenu> }
                { editSurfaceInfoMode && <EditSurfaceInfoDialog
                    surfaceInfo={surfaceInfo}
                    onSave={this.onSaveSurfaceInfo}
                    onClose={()=>{ this.setState( {...this.state, editSurfaceInfoMode: false, surfaceInfo: null} )}}
                ></EditSurfaceInfoDialog> }
            </div>
        )
    }

}
