import React, { Component } from 'react'
import { Button, Typography, TextField} from '@material-ui/core'

const fairCopy = window.fairCopy

const numberOfWords = 6

export default class LicensePanel extends Component {

    constructor(props) {
        super(props)
    
        const licenseWords = []
        for( let i=0; i < numberOfWords; i++) {
            licenseWords[i] = ""
        }

        this.state = {
          licenseWords,
          errorMessage: null
        }
    }

    renderLicenseField() {
        const { licenseWords } = this.state
        const fieldParts = []

        const onPaste = () => {
            const value = fairCopy.services.readClipBoardText()
            if( value ) {
                const keyValue = value.toLocaleUpperCase().trim()
                const keyWords = keyValue.split('-')
                // verify that this is a well formed key
                if( keyWords.length === numberOfWords ) {
                    for( const keyWord of keyWords ) {
                        if( (keyWord.length === 0 || keyWord.length > 4 || !keyWord.match(/^[A-Z0-9]+$/)) ) return
                    }    
                    // looks good!
                    this.setState({...this.state, licenseWords: keyWords })
                }

            }
        }

        for( let i=0; i < numberOfWords; i++) {
            const onChange = (e) => {
                const value = e.currentTarget.value.toLocaleUpperCase()
                if( value === "" || (value.length <= 4 && value.match(/^[A-Z0-9]+$/))) {
                    licenseWords[i] = value
                    this.setState({...this.state, licenseWords })
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
                    onPaste={onPaste}
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

        const onError = (errorMessage) => {
            this.setState({...this.state, errorMessage})
        }

        const onClickConfirm = () => {
            const { licenseWords } = this.state
            const { onActivate } = this.props
            const licenseKey = licenseWords.join('-')
            onActivate(licenseKey,onError)
        }

        const { onCancel } = this.props
        const { licenseWords, errorMessage } = this.state
        const licenseKey = licenseWords.join('-')
        const saveAllowed = licenseKey.length === (numberOfWords * 4) + (numberOfWords-1) 
        const saveButtonClass = saveAllowed ? "save-button-active" : "action-button"

        return (
            <div id="LicensePanel">
                <Typography variant="h6" component="h1">Please enter your license key.</Typography>
                { this.renderLicenseField() }
                { errorMessage && 
                    <div className="errorMessage">
                        <Typography>{errorMessage}</Typography>
                    </div> 
                }
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickConfirm} color='primary' variant='contained'>Activate</Button>
                    <Button className='action-button' onClick={onCancel} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }

}
