import React, { Component } from 'react'
import { Button, Typography, TextField} from '@material-ui/core'
import { activateLicense } from '../tei-document/license-key.js'

const fairCopy = window.fairCopy

const numberOfWords = 6

export default class LicenseWindow extends Component {

    constructor(props) {
        super(props)
    
        const licenseData = JSON.parse(localStorage.getItem('licenseData'))

        const licenseWords = []
        for( let i=0; i < numberOfWords; i++) {
            licenseWords[i] = ""
        }

        this.state = {
          licenseData,
          licenseWords
        }
    }

    renderLicenseField() {
        const { licenseWords } = this.state
        const fieldParts = []

        for( let i=0; i < numberOfWords; i++) {
            const onChange = (e) => {
                const value = e.currentTarget.value.toLocaleUpperCase()
                if( value === "" || (value.length <= 4 && value.match(/^[A-Z0-9]+$/))) {
                    licenseWords[i] = value
                    this.setState({...this.state, licenseWords })
                }
                if( value.length > 4 ) {
                    // spill into the next field(s)
                }
            }
    
            fieldParts.push(
                <TextField 
                    key={`part${i}`}
                    size="small"
                    variant="outlined" 
                    className="word-field"
                    value={licenseWords[i]}
                    onChange={onChange}
                />
            )
             if( i < numberOfWords-1 ) {
                fieldParts.push(
                    <div className="dash" key={`dash${i}`}>-</div>
                )    
            }
        }
        return (
            <div className="license-field">
                { fieldParts }
            </div>
        )
    }
        
    render() {

        const onClickConfirm = () => {
            const { licenseData, licenseWords } = this.state
            const { machineID } = licenseData
            const { onActivate } = this.props
            const licenseKey = licenseWords.join('-')
            activateLicense(licenseKey, machineID, onActivate, (err) => {
                // TODO improve
                alert(err)
            })
        }

        const onClickExit = () => {
            fairCopy.services.ipcSend('exitApp')
        }

        const { licenseWords } = this.state
        const licenseKey = licenseWords.join('-')
        const saveAllowed = licenseKey.length === (numberOfWords * 4) + (numberOfWords-1) 
        const saveButtonClass = saveAllowed ? "save-button-active" : "action-button"

        return (
            <div id="LicenseWindow">
                <div className="content">
                    <Typography variant="h6" component="h1">Please enter your license key.</Typography>
                    { this.renderLicenseField() }
                    <div className='form-actions'>
                        <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickConfirm} color='primary' variant='contained'>Activate</Button>
                        <Button className='action-button' onClick={onClickExit} variant='contained'>Exit</Button>
                    </div>
                </div>
            </div>
        )
    }

}
