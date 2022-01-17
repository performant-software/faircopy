import React, { Component } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@material-ui/core'

import LicensePanel from '../../license-window/LicensePanel'
import { activateLicense } from '../../../model/license-key'

export default class LicenseDialog extends Component {

    renderLicensePanel() {
        const { onClose } = this.props

        const onActivateSuccess = () => {
            // TODO activation success 
            onClose()
        }

        const onActivateLicense = ( licenseKey, onError ) => {
            const { appConfig } = this.props
            activateLicense( appConfig.devMode, licenseKey, onActivateSuccess, onError)
        }

        const onCancel = () => {            
            onClose()
        }
        
        return (
            <LicensePanel
                mode='buy'
                onActivate={onActivateLicense}
                onCancel={onCancel}
            ></LicensePanel>
        )
    }
    
    render() {
        const { onClose } = this.props

        return (
            <Dialog id="LicenseDialog" maxWidth="lg" open={true} onClose={onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog">License Activation</DialogTitle>
                <DialogContent >
                    { this.renderLicensePanel() }
                </DialogContent>
            </Dialog>
        )
    }

}
