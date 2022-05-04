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
        const { onClose, project } = this.props
        
        const onClickSave = () => {
            const { onSave } = this.props
            const { filePath } = this.state
            onSave(filePath)
        }
        const onClickBrowse = () => {
            fairCopy.services.ipcSend('requestNewPath' )
        }
        const { name, description } = project
        const { filePath } = this.state
        const saveAllowed = (name.length > 0 && filePath.length > 0 )
        const saveButtonClass = saveAllowed ? "save-button-active" : "action-button"

        return (
            <div className="content new-project-form">
                <Typography variant="h6" component="h2">Choose Local File</Typography>
                <ul>
                    <li>
                        <TextField 
                            className="new-project-field"
                            value={name}
                            label="Project Name" 
                            disabled
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Short Description" 
                            value={description}
                            disabled
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Project File" 
                            value={filePath}
                            disabled
                        />
                        <Button size='small' className='browse-button'onClick={onClickBrowse} variant='contained'>Choose Save File Path</Button>
                    </li>
                    <li><Typography className="instructions"><i className="far fa-lightbulb-on fa-lg"></i> Give your project and name and a short description, then choose where you want the project file to be saved.</Typography></li>
                </ul>
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickSave} color='primary' variant='contained'>Save</Button>
                    <Button className='action-button' onClick={onClose} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
