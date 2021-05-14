import React, { Component } from 'react'
import { Typography } from '@material-ui/core'

export default class TitleBar extends Component {
    
    constructor() {
        super()
        this.state = {
        }
    }

    onClickHome = () => {
        const { onResourceAction, teiDocName } = this.props

        if( teiDocName ) {
            onResourceAction('close-teidoc')
        } else {
            onResourceAction('home')
        }
    }

    renderTitle() {
        const { teiDocName, resourceName, surfaceName } = this.props

        const chevClass = "fa fa-chevron-right"
        const surfaceNameEl = surfaceName && <span><i className={chevClass}></i> {surfaceName}</span>
        const resourceNameEl = resourceName && <span><i className={chevClass}></i> {resourceName}</span>
        const teiDocNameEl = teiDocName && <span><i className={chevClass}></i> <i className="fa fa-books"></i> {teiDocName}</span>
        return (
            <span>
                {teiDocNameEl} {resourceNameEl} {surfaceNameEl}
            </span>
        )
    }

    render() {
        return (
            <div id="TitleBar" >
                <Typography component="h1" variant="h6">
                    <span className="home-link" onClick={this.onClickHome}><i className="fa fa-home-alt"></i> Project </span> { this.renderTitle() }
                </Typography>
            </div>
        )
    }
}