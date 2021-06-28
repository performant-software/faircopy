import React, { Component } from 'react'

import { Button, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class AddImageDialog extends Component {

    constructor(props) {
        super()
        this.state = {
            spinner: false,
            imagesData: []
        }
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('imagesOpened', this.imagesOpenedCallback)
    }

    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('imagesOpened', this.imagesOpenedCallback)
    }

    imagesOpenedCallback = ( event, imagesData ) => {
        this.setState({...this.state, imagesData, spinner: false})
    }

    renderForm() {
        const { imagesData, spinner } = this.state

        const onClickBrowse = () => {
            this.setState({...this.state, spinner: true })
            fairCopy.services.ipcSend('requestImageData')
        }
        const s = imagesData.length === 1 ? '' : 's'
        
        return (
            <div>
                { spinner ? 
                    <div>
                        <img className='spinner' alt='loading images' src='img/spinner.gif'></img>
                    </div> : 
                    <div>
                        <Typography>{imagesData.length} file{s} selected.</Typography>
                        <Button size='small' className='browse-button' onClick={onClickBrowse} variant='contained'>Browse...</Button>                   
                    </div>
                }
            </div>
        )
    }
    
    render() {      
        const { spinner } = this.state
        const { onClose } = this.props
        
        const onAddImages = () => {
            const { facsDocument } = this.props
            const { imagesData } = this.state
            facsDocument.addLocalImages(imagesData)
            onClose()
        }
        const disabled = spinner

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
                    <Button disabled={disabled} variant="contained" onClick={onAddImages} color="primary">Add</Button>
                    <Button disabled={disabled} variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
