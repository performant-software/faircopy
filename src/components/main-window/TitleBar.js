import React, { Component } from 'react'
import { Typography } from '@material-ui/core'

const maxTitleLength = 120

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

        let titleCount = 0
        if( teiDocName ) titleCount++
        if( resourceName ) titleCount++
        if( surfaceName ) titleCount++
        const titleLength = maxTitleLength/titleCount

        const teiDocNameShort = teiDocName ? shorten( teiDocName, titleLength ) : ''
        const resourceNameShort = resourceName ? shorten( resourceName, titleLength ) : ''
        const surfaceNameShort = surfaceName ? shorten( surfaceName, titleLength ) : ''

        const chevClass = "fa fa-chevron-right"
        const resourceNameSeperator = isImageWindow ? <i className="far fa-images"></i> : <i className={chevClass}></i>
        const surfaceNameEl = surfaceName && <span><i className={chevClass}></i> {surfaceNameShort}</span>
        const resourceNameEl = resourceName && <span className="nav-link" onClick={onClickResource}>{resourceNameSeperator} {resourceNameShort}</span>
        const teiDocNameEl = teiDocName && <span className="nav-link" onClick={this.onClickTeiDoc} ><i className={chevClass}></i> {teiDocNameShort}</span>
        return (
            <span>
                {teiDocNameEl} {resourceNameEl} {surfaceNameEl}
            </span>
        )
    }

    render() {
        const { isImageWindow } = this.props
        
        return (
            <header id="TitleBar" >
                <Typography component="h2" variant="h6">
                    { !isImageWindow && <span className="nav-link" onClick={this.onClickHome}><i className="fa fa-home-alt"></i> Home </span> }
                    { this.renderTitle() }
                </Typography>
            </header>
        )
    }
}

function shorten( originalString, length ) {
    if( originalString.length <= length ) return originalString
    let shortString = originalString.substr(0,length)
    return `${shortString}...`
}
