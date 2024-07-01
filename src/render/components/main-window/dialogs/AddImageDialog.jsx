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
        fairCopy.ipcRegisterCallback('imagesOpened', this.imagesOpenedCallback)
    }

    componentWillUnmount() {
        fairCopy.ipcRemoveListener('imagesOpened', this.imagesOpenedCallback)
    }

    imagesOpenedCallback = ( event, imagesData ) => {
        this.setState({...this.state, imagesData, spinner: false})
    }

    renderForm() {
        const { imagesData, spinner } = this.state

        const onClickBrowse = () => {
            this.setState({...this.state, spinner: true })
            fairCopy.ipcSend('requestImageData')
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
        const { spinner, imagesData } = this.state
        const { onClose } = this.props
        
        const onAddImages = () => {
            const { facsDocument } = this.props
            const { imagesData } = this.state
            facsDocument.addLocalImages(imagesData)
            onClose()
        }
        const disableAdd = imagesData.length === 0
        const disableCancel = spinner

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
                    <Button disabled={disableAdd} variant="contained" onClick={onAddImages} color="primary">Add</Button>
                    <Button disabled={disableCancel} variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
