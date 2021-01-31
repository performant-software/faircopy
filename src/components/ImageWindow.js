import React, { Component } from 'react'

import FacsEditor from './FacsEditor'
import EditResourceDialog from './EditResourceDialog'
import AddImageDialog from './AddImageDialog'
import PopupMenu from './PopupMenu'
import AlertDialog from './AlertDialog'
import EditSurfaceInfoDialog from './EditSurfaceInfoDialog'

export default class ImageWindow extends Component {

    constructor() {
        super()
        this.state = {
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
    }
    
    componentWillUnmount() {
        const { imageView } = this.props
        imageView.removeUpdateListener(this.updateListener)
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

        if(!imageView) return null

        const { facsDocument, resourceEntry, idMap, startingID } = imageView
        const { editDialogMode, addImagesMode, popupMenuAnchorEl, popupMenuOptions, surfaceInfo, editSurfaceInfoMode } = this.state
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
                    startIndex={startIndex}
                    windowed={true}
                ></FacsEditor>
                { this.renderAlertDialog() }
                { editDialogMode && <EditResourceDialog
                    idMap={idMap}
                    resourceEntry={resourceEntry}
                    onSave={this.onSaveResource}
                    onClose={()=>{ this.setState( {...this.state, editDialogMode: false} )}}
                ></EditResourceDialog> }
                { addImagesMode && <AddImageDialog
                    idMap={idMap}
                    facsDocument={imageView.facsDocument}
                    onClose={()=>{ this.setState( {...this.state, addImagesMode: false} )}}
                ></AddImageDialog> }
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
