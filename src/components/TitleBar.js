import React, { Component } from 'react'
import { Typography } from '@material-ui/core'

export default class TitleBar extends Component {
    
    onClickHome = () => {
        const { onResourceAction } = this.props
        onResourceAction('home')
    }

    onClickTeiDoc = () => {
        const { onResourceAction, teiDocID } = this.props
        onResourceAction('open-teidoc',[teiDocID])        
    }

    renderTitle() {
        const { teiDocName, resourceName, surfaceName, isImageWindow, onClickResource } = this.props

        const chevClass = "fa fa-chevron-right"
        const resourceNameSeperator = isImageWindow ? <i className="far fa-images"></i> : <i className={chevClass}></i>
        const surfaceNameEl = surfaceName && <span><i className={chevClass}></i> {surfaceName}</span>
        const resourceNameEl = resourceName && <span className="nav-link" onClick={onClickResource}>{resourceNameSeperator} {resourceName}</span>
        const teiDocNameEl = teiDocName && <span className="nav-link" onClick={this.onClickTeiDoc} ><i className={chevClass}></i> {teiDocName}</span>
        return (
            <span>
                {teiDocNameEl} {resourceNameEl} {surfaceNameEl}
            </span>
        )
    }

    render() {
        const { isImageWindow } = this.props
        
        return (
            <div id="TitleBar" >
                <Typography component="h1" variant="h6">
                    { !isImageWindow && <span className="nav-link" onClick={this.onClickHome}><i className="fa fa-home-alt"></i> Home </span> }
                    { this.renderTitle() }
                </Typography>
            </div>
        )
    }
}