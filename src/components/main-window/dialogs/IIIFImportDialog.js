import React, { Component } from 'react'
import { Button, IconButton} from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@material-ui/core'

import IIIFTreeView from '../IIIFTreeView';

import { validateURL } from '../../../model/attribute-validators'
import { importPresentationEndpoint, ammendIIIFTree } from '../../../model/iiif-presentation'


export default class IIIFImportDialog extends Component {
 
    constructor() {
        super()
        this.initialState = {
            url: "",
            iiifTree: null,            
            loading: false,
            selection: null,
            validationErrors: {}
        }
        this.state = this.initialState
    }

    onOpen = () => {
        const { url } = this.state
        const { fairCopyProject, teiDocEntry } = this.props

        const nextErrors = {}
        const validURL = validateURL(url)
        if( validURL.error ) nextErrors['url'] = validURL.errorMessage
        
        const hasErrors = Object.keys(nextErrors).length > 0
        if( hasErrors ) {
            this.setState({ ...this.state, validationErrors: nextErrors })
        } else {
            const onError = (errorMsg) => {
                const nextErrors = { url: errorMsg }            
                this.setState({ ...this.state, loading: false, validationErrors: nextErrors, iiifTree: null })
            }
    
            const onSuccess = (iiifTree) => {
                this.setState({ ...this.state, loading: false, validationErrors: {}, iiifTree })
            }
    
            const nextSurfaceID = fairCopyProject.getNextSurfaceID(teiDocEntry)
            importPresentationEndpoint(url, nextSurfaceID, onSuccess, onError)
            this.setState({ ...this.state, loading: true })
        }
    }

    onRequestItem = (itemID) => {
        const { fairCopyProject, teiDocEntry } = this.props

        const onError = (errorMsg) => {
            const nextErrors = { url: errorMsg }            
            this.setState({ ...this.state, loading: false, validationErrors: nextErrors })
        }

        const onSuccess = (itemTree) => {
            const { iiifTree } = this.state
            const nextTree = ammendIIIFTree(itemTree, iiifTree)
            if( nextTree ) {
                this.setState({ ...this.state, loading: false, validationErrors: {}, iiifTree: nextTree })
            }
        }

        const nextSurfaceID = fairCopyProject.getNextSurfaceID(teiDocEntry)
        importPresentationEndpoint( itemID, nextSurfaceID, onSuccess, onError )
    }

    onSaveResource = () => {
        const { onClose } = this.props
        // TODO
        onClose()
    }

    renderURLField() {
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            if( name === 'type' && (value === 'text' 
            || value === 'header') ) {
                nextState['url'] = ''
            }
            nextState[name] = value
            this.setState(nextState)
        }

        const onKeyPress = (e) => {
            if( e.keyCode === 13 ) this.onOpen()
        }

        const { url, validationErrors } = this.state

        return (
            <div style={{ display: 'flex' }}>
                <TextField 
                    name="url"
                    autoFocus={true}
                    className="name-field"
                    value={url}
                    onChange={onChange}
                    error={validationErrors['url'] !== undefined }
                    helperText={validationErrors['url']}
                    aria-label="IIIF Manifest URL" 
                    label="IIIF Manifest URL" 
                    onKeyPress={onKeyPress}
                />
                <IconButton 
                    onClick={this.onOpen} 
                    tooltip={"Open IIIF Resource"}
                >
                    <i className="fas fa-sm fa-globe"></i>
                </IconButton>
            </div>
        )
    }

    render() {      
        const { onClose } = this.props
        
        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const { selection, loading, iiifTree } = this.state

        return (
            <Dialog
                id="IIIFImportDialog"
                open={true}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Import IIIF Manifest</DialogTitle>
                <DialogContent>
                    { this.renderURLField() }
                    { iiifTree && <IIIFTreeView
                        iiifTree={iiifTree}
                        onRequestItem={this.onRequestItem}
                    ></IIIFTreeView> }
                </DialogContent>
                <DialogActions>
                    <Button disabled={loading || !selection } variant="contained" color="primary" onClick={this.onSaveResource}>Import</Button>
                    <Button disabled={loading} variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
