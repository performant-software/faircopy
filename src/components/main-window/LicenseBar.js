import React, { Component } from 'react';
import { Button, Typography } from '@material-ui/core'
import { licenseDaysLeft } from '../../model/license-key'

export default class LicenseBar extends Component {
    render() {
        const onBuyNow = () => {
            // TODO
        }

        const daysLeft = licenseDaysLeft()
        const s = daysLeft !== 1 ? "s" : ""

        return (
            <div id="LicenseBar">
                <Typography className="license-blurb">You have {daysLeft} day{s} left in your free trial.</Typography>
                <Button className="license-button" size="small" onClick={onBuyNow} variant='contained'>Buy Now</Button>
            </div>
        )
    }
}