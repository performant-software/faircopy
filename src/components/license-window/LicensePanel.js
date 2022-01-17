import React, { Component } from 'react'
import { Button, Typography, TextField} from '@material-ui/core'
import { licenseDaysLeft } from '../../model/license-key'

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

    renderBlurb() {
        const { mode } = this.props

        const onBuyNow = () => {
            fairCopy.services.ipcSend('openBuyNowWebpage')
        }
        const daysLeft = licenseDaysLeft()
        const s = daysLeft !== 1 ? "s" : ""

        switch(mode) {
            case 'buy':
                return (
                    <div>
                        <div className="buy-pitch">
                            <Typography>You have {daysLeft} day{s} left of your free trial of FairCopy. Visit our website to purchase a license. Then, copy and paste the license key in the form below.</Typography>
                            <Button className="license-button" onClick={onBuyNow} variant='contained'>Visit Website <i className="fas fa-external-link-alt link"></i></Button>
                        </div>
                        <Typography variant="h6" component="h1">Enter your license key to activate.</Typography>
                    </div>
                )
            case 'activate':
                return (
                    <div>
                        <Typography variant="h6" component="h1">Please enter your license key.</Typography>
                    </div>                    
                )
            default:
                return null
        }
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
                { this.renderBlurb() }
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
