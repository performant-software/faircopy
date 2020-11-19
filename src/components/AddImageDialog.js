import React, { Component } from 'react'

import { Button, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { TextField, MenuItem, Select } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class AddImageDialog extends Component {

    constructor(props) {
        super()
        this.state = {
            imagesData: []
        }
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('imagesOpened', (event, imagesData) => {
            this.setState({...this.state, imagesData})
        })
    }

    renderForm() {
        const { imagesData } = this.state

        const onClickBrowse = () => {
            fairCopy.services.ipcSend('requestImageData')
        }
        const s = imagesData.length === 1 ? '' : 's'
        
        return (
            <div>
                <Typography>{imagesData.length} file{s} selected.</Typography>
                <Button size='small' className='browse-button' onClick={onClickBrowse} variant='contained'>Browse...</Button>
            </div>
        )
    }
    
    render() {      
        const { onClose } = this.props
        
        const onAddImages = () => {
            const { facsDocument } = this.props
            const { imagesData } = this.state
            facsDocument.addLocalImages(imagesData)
            onClose()
        }

        return (
            <Dialog
                id="AddImageDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="add-image-title"
                aria-describedby="add-image-description"
            >
                <DialogTitle id="add-image-title">Add Images</DialogTitle>
                <DialogContent>
                    { this.renderForm() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={onAddImages} color="primary">Save</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
