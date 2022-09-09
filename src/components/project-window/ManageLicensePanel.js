import React, { Component } from 'react'
import { Button, Typography } from '@material-ui/core'

import { licenseDaysLeft, updateLicenseStatus } from '../../model/license-key'

const fairCopy = window.fairCopy

export default class ManageLicensePanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            errorMessage: null 
        }
        this.state = this.initialState
    }

    render() {
        const { onClose } = this.props

        const currentLicenseData = JSON.parse(localStorage.getItem('licenseData'))
        const { licenseKey, subscription, expiresAt, secureID } = currentLicenseData
        const renewalDate = new Date(expiresAt).toLocaleDateString()

        const onRenew = () => {
            fairCopy.services.ipcSend('openRenewalWebpage', secureID)
        }

        const devMode = true

        const onUpdateStatus = () => {
            updateLicenseStatus(devMode,licenseKey,
                () => {
                    this.setState({...this.state, errorMessage: null })
                },
                (errorMessage) => {
                    this.setState({...this.state, errorMessage })
                }
            )
        }

        let buttonLabel, renewalBlurb
        if( subscription ) {
            buttonLabel = "Manage Subscription"
            renewalBlurb = `Your license will automatically renew on ${renewalDate}`
    
        } else {
            const daysLeft = licenseDaysLeft()
            buttonLabel = "Renew License"
            if( daysLeft >= 0 ) {
                renewalBlurb = `Renew by ${renewalDate} to get 50% off next year.`
            } else {
                renewalBlurb = "Renew your license now to get access to the latest features."
            }
        }

        const { errorMessage } = this.state

        return (
            <div className="content">
                <Typography className="license-info" >License Key: {licenseKey}</Typography>
                <Typography className="license-info" >{renewalBlurb}</Typography>
                <Typography className="license-info" >Please click "Update Status" after you renew your license on the website.</Typography>
                { errorMessage && <Typography className="license-error" >{errorMessage}</Typography> }
                <Button className="license-button" size="small" onClick={onRenew} variant='contained'>{buttonLabel}<i className="fas fa-external-link-alt link"></i></Button>
                <Button className="license-button" size="small" onClick={onUpdateStatus} variant='contained'>Update Status</Button>
                <Button className="license-button" size="small" onClick={onClose} variant='contained'>Done</Button>
            </div>
        )
    }
}
