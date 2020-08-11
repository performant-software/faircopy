import React, { Component } from 'react'
import { Button, Typography, TextField} from '@material-ui/core'
import { activateLicense } from '../tei-document/license-key.js'

const fairCopy = window.fairCopy

export default class LicenseWindow extends Component {

    constructor(props) {
        super(props)
    
        const licenseData = JSON.parse(localStorage.getItem('licenseData'))
    
        this.state = {
          licenseData,
          licenseKeyBuf: licenseData.licenseKey
        }
    }
        
    render() {
        const { licenseKeyBuf } = this.state

        const onChange = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, licenseKeyBuf: value })
        }

        const onClickConfirm = () => {
            const { licenseData } = this.state
            const { onActivate } = this.props
            activateLicense(licenseKeyBuf,licenseData.machineID,onActivate,(err) => {
                alert(err)
            })
        }

        const onClickExit = () => {
            fairCopy.services.ipcSend('exitApp')
        }

        const saveAllowed = licenseKeyBuf && licenseKeyBuf.length > 0
        const saveButtonClass = saveAllowed ? "save-button-active" : "action-button"

        return (
            <div id="LicenseWindow">
                <div className="content">
                    <Typography variant="h6" component="h2">Please enter your license key</Typography>
                    <TextField 
                        className="new-project-field"
                        value={licenseKeyBuf}
                        onChange={onChange}
                        label="License Key" 
                    />
                    <div className='form-actions'>
                        <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickConfirm} color='primary' variant='contained'>Confirm</Button>
                        <Button className='action-button' onClick={onClickExit} variant='contained'>Exit</Button>
                    </div>
                </div>
            </div>
        )
    }

}
