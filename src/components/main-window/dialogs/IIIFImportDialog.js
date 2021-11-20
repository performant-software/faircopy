import React, { Component } from 'react'
import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@material-ui/core'

import { validateURL } from '../../../model/attribute-validators'

export default class IIIFImportDialog extends Component {

    constructor() {
        super()
        this.initialState = {
            url: "",
            loading: false,
            validationErrors: {}
        }
        this.state = this.initialState
    }

    importManifest(url) {
        const { onClose, parentResourceID, fairCopyProject } = this.props

        const onError = (errorMsg) => {
            const nextErrors = { url: errorMsg }            
            this.setState({ ...this.state, loading: false, validationErrors: nextErrors })
        }

        const onSuccess = () => {
            this.setState(this.initialState)
            onClose()
        }

        fairCopyProject.importIIIF(url, parentResourceID, onError, onSuccess)
    }

    render() {      
        const { onClose } = this.props
        
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

        const onSaveResource = () => {
            const { url } = this.state

            const nextErrors = {}
            const validURL = validateURL(url)
            if( validURL.error ) nextErrors['url'] = validURL.errorMessage
            
            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                this.setState({ ...this.state, loading: true })
                this.importManifest(url)    
            }
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const onKeyUp = (e) => {
            if( e.keyCode === 13 ) onSaveResource()
        }

        const { url, loading, validationErrors } = this.state

        return (
            <Dialog
                id="IIIFManifestDialog"
                open={true}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Import IIIF Manifest</DialogTitle>
                <DialogContent>
                    { loading ? 
                        <div>
                            <img className='spinner' alt='loading images' src='img/spinner.gif'></img>
                        </div> : 
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
                            onKeyUp={onKeyUp}
                        />
                    }
                </DialogContent>
                <DialogActions>
                    <Button disabled={loading} variant="contained" color="primary" onClick={onSaveResource}>Save</Button>
                    <Button disabled={loading} variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
