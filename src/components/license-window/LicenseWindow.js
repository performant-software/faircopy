import React, { Component } from 'react'
import { activateLicense } from '../../model/license-key.js'
import LicensePanel from './LicensePanel.js'

const fairCopy = window.fairCopy

export default class LicenseWindow extends Component {   
    render() {
        const onActivateLicense = ( licenseKey, onError ) => {
            const { onActivate, appConfig } = this.props
            activateLicense( appConfig.devMode, licenseKey, onActivate, onError)
        }

        const onCancel = () => {
            fairCopy.services.ipcSend('exitApp')
        }

        return (
            <main id="LicenseWindow">
                <LicensePanel
                    onActivate={onActivateLicense}
                    onCancel={onCancel}
                    mode='activate'
                ></LicensePanel>
            </main>
        )
    }

}
