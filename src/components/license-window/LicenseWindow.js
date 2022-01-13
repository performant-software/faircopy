import React, { Component } from 'react'
import { activateLicense } from '../../model/license-key.js'
import LicensePanel from './LicensePanel.js'

const fairCopy = window.fairCopy

export default class LicenseWindow extends Component {

    constructor(props) {
        super(props)
    
        const licenseData = JSON.parse(localStorage.getItem('licenseData'))

        this.state = {
          licenseData
        }
    }

   
    render() {

        const onActivateLicense = ( licenseKey, onError ) => {
            const { licenseData } = this.state
            const { machineID } = licenseData
            const { onActivate, appConfig } = this.props
            activateLicense( appConfig.devMode, licenseKey, machineID, onActivate, onError)
        }

        const onCancel = () => {
            fairCopy.services.ipcSend('exitApp')
        }

        return (
            <main id="LicenseWindow">
                <LicensePanel
                    onActivate={onActivateLicense}
                    onCancel={onCancel}
                ></LicensePanel>
            </main>
        )
    }

}
