import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core'

export default class AlertDialog extends Component {

    renderActions(actions) {
        if( !actions ) return null

        const actionButtons = []
        let i = 0
        for( const action of actions ) {
            const { label, defaultAction, handler } = action
            const buttonKey = `action-button-${i++}`
            const actionOptions = defaultAction ? { autoFocus: true } : {}
            actionButtons.push(
                <Button
                    key={buttonKey}
                    onClick={handler}
                    { ...actionOptions }
                >
                    { label }
                </Button>
            )
        }

        return actionButtons
    }

    renderDialog( title, message, actions ) {
        const { onCloseAlert } = this.props

        return (
            <Dialog
                open={true}
                onClose={onCloseAlert}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        { message }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    { this.renderActions(actions) }
                </DialogActions>
            </Dialog>
        )
    }

    renderImportError() {
        const { alertOptions, onCloseAlert } = this.props

        const title = "Import Error"
        const message = alertOptions.errorMessage
        const actions = [
            {
                label: "OK",
                defaultAction: true,
                handler: onCloseAlert
            }
        ]

        return this.renderDialog( title, message, actions )
    }

    renderConfirmDelete() {
        const { alertOptions, onCloseAlert, closeResources, fairCopyProject } = this.props

        const { resourceIDs } = alertOptions

        const onDelete = () => {
            fairCopyProject.removeResources(resourceIDs)
            closeResources(resourceIDs, false, false )    
        }

        const onCancel = () => {
            onCloseAlert()
        }

        const title = "Confirm Delete"
        const s = resourceIDs.length === 1 ? '' : 's'
        const message = `Do you wish to delete ${resourceIDs.length} resource${s}?`
        const actions = [
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

        return this.renderDialog( title, message, actions )
    }


    renderConfirmDeleteImages() {
        const { alertOptions, onCloseAlert } = this.props

        const { onDelete, surfaceCount } = alertOptions

        const onClickDelete = () => {
            onDelete()
            onCloseAlert()
        }

        const onCancel = () => {
            onCloseAlert()
        }

        const title = "Confirm Delete"
        const s = surfaceCount === 1 ? '' : 's'
        const message = `Do you wish to delete ${surfaceCount} surface${s}?`
        const actions = [
            {
                label: "Delete",
                defaultAction: true,
                handler: onClickDelete
            },
            {
                label: "Cancel",
                handler: onCancel
            }
        ]

        return this.renderDialog( title, message, actions )
    }

    renderConfirmSave() {
        const { alertOptions, closeResources, exitOnClose, fairCopyProject } = this.props

        const onSave = () => {
            const { resource, resourceIDs } = alertOptions
            resource.save()
            closeResources(resourceIDs,exitOnClose)
        }

        const onCloseWithoutSave = () => {
            const { resource, resourceIDs } = alertOptions
            resource.changedSinceLastSave = false       
            closeResources(resourceIDs,exitOnClose)
        }

        const { resource } = alertOptions
        const resourceName = fairCopyProject.resources[resource.resourceID].name
        const title = "Confirm Close"
        const message = `Close "${resourceName}" without saving?`
        const actions = [
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

        return this.renderDialog( title, message, actions )
    }

    render() {      
        const { alertDialogMode } = this.props
        switch(alertDialogMode) {
            case 'importError':
                return this.renderImportError()
            case 'confirmSave':
                return this.renderConfirmSave()
            case 'confirmDelete':
                return this.renderConfirmDelete()
            case 'confirmDeleteImages':
                return this.renderConfirmDeleteImages()
            case 'closed':
            default:
                return null
        }
    }
}
