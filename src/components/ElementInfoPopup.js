import React, { Component } from 'react'
import { Popper, Card, CardContent, Typography } from '@material-ui/core'


export default class ElementInfoPopup extends Component {

    render() {
        const { anchorEl, elementSpec } = this.props
        const { name, desc } = elementSpec

        return (
            <Popper className="element-menu-popup" placement='right' open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                <Card className="element-info-card" elevation={12}>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{name}</Typography>
                        <Typography variant="body2" component="p">{desc}</Typography>
                    </CardContent>
                </Card>
            </Popper>
        )
    }

}
