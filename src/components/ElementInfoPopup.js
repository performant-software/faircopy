import React, { Component } from 'react'
import { Popper, Card, CardContent, Typography } from '@material-ui/core'

export default class ElementInfoPopup extends Component {

    render() {
        const { anchorEl, elementSpec, containedBy, mayContain, notes } = this.props
        const { name, desc } = elementSpec

        return (
            <Popper className="element-menu-popup" placement='right-start' open={true} anchorEl={anchorEl} role={undefined} >
                <Card className="element-info-card" elevation={12}>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>{name}</Typography>
                        <Typography variant="body2" component="p">{desc}</Typography><br/>
                        { (containedBy||mayContain||notes) && 
                            <table className="rules-table">
                                <tbody>
                                    { containedBy && <tr>
                                        <td><Typography variant="body2" component="span">Contained By:</Typography></td>
                                        <td><Typography variant="body2" component="span">{containedBy}</Typography></td>
                                    </tr> }
                                    { mayContain && <tr>
                                        <td><Typography variant="body2" component="span">May Contain:</Typography></td>
                                        <td><Typography variant="body2" component="span">{mayContain}</Typography></td>
                                    </tr> }
                                    { notes && <tr>
                                        <td><Typography variant="body2" component="span">Notes:</Typography></td>
                                            <td><Typography variant="body2" component="span">{notes}</Typography></td>
                                    </tr> }
                                </tbody>
                            </table>
                        }
                    </CardContent>
                </Card>
            </Popper>
        )
    }

}
