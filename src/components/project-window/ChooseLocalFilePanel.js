import React, { Component } from 'react'
import { Button, Typography, TextField } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ChooseLocalFilePanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            filePath: '',
            errorMessage: null 
        }
        this.state = this.initialState
    }

    onPathSelected = (event, filePath) => this.onPathUpdated(filePath)

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('pathSelected', this.onPathSelected )
    }

    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('pathSelected', this.onPathSelected )
    }

    onPathUpdated(filePath) {
        if( filePath ) {
            this.setState({...this.state, filePath })
        }
    }

    render() {
        const { onClose } = this.props
        
        const onClickSave = () => {
            const { onSave } = this.props
            const { filePath } = this.state
            onSave(filePath)
        }
        const onClickBrowse = () => {
            fairCopy.services.ipcSend('requestNewPath' )
        }
        const { filePath } = this.state
        const saveAllowed = filePath.length > 0
        const saveButtonClass = saveAllowed ? "save-button-active" : "action-button"

        return (
            <div id="ChooseLocalFilePanel" className="content new-project-form">
                <Typography variant="h6" component="h2">Choose Local Project File</Typography>
                <ul>
                   
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Project File" 
                            value={filePath}
                            disabled
                        />
                        <Button size='small' className='browse-button'onClick={onClickBrowse} variant='contained'>Choose Project File Path</Button>
                    </li>
                    <li><Typography className="instructions"><i className="far fa-lightbulb-on fa-lg"></i> Choose a location for your project file, which will store work in progress.</Typography></li>
                </ul>
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickSave} color='primary' variant='contained'>Continue</Button>
                    <Button className='action-button' onClick={onClose} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
