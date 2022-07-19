import React, { Component } from 'react'
import { Typography } from '@material-ui/core'
import { IconButton, Tooltip } from '@material-ui/core'

const maxTitleLength = 120

export default class TitleBar extends Component {
    
    onClickHome = () => {
        const { onResourceAction } = this.props
        onResourceAction('home')
    }

    onClickTeiDoc = () => {
        const { onResourceAction, teiDocID } = this.props
        onResourceAction('open-teidoc',teiDocID)        
    }

    renderHomeButton() {         
        const { remoteProject, isLoggedIn } = this.props    
        const homeIcon = remoteProject ? isLoggedIn() ? 'fa fa-cloud' : 'far fa-cloud' : 'fa fa-home-alt'
        return (
            <Tooltip title="Home">
                <span>            
                    <IconButton
                        onClick={this.onClickHome}
                        className="home-icon" 
                    >
                        <i className={`${homeIcon} fa-sm`}></i>
                    </IconButton> 
                </span>
            </Tooltip>
        )
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
        const resourceNameSeperator = isImageWindow ? <i aria-label="images" className="far fa-images image-icon-padding"></i> : <i aria-label="/" className={chevClass}></i>
        const homeEl = !isImageWindow ? <span onClick={this.onClickHome} className="nav-link" >Home</span> : ""
        const surfaceNameEl = surfaceName && <span className="nav-link" ><i aria-label="/" className={chevClass}></i> {surfaceNameShort}</span>
        const resourceNameEl = resourceName && <span className="nav-link" onClick={onClickResource}>{resourceNameSeperator} {resourceNameShort}</span>
        const teiDocNameEl = teiDocName && <span className="nav-link" onClick={this.onClickTeiDoc} ><i aria-label="/" className={chevClass}></i> {teiDocNameShort}</span>
        return (
            <div className="breadcrumbs">
                <Typography component="h2" variant="h6">
                    {homeEl} {teiDocNameEl} {resourceNameEl} {surfaceNameEl}
                </Typography>
            </div>
        )
    }

    render() {
        const { isImageWindow } = this.props
        
        return (
            <header id="TitleBar" >                
                    { !isImageWindow && this.renderHomeButton() }
                    { this.renderTitle() }
            </header>
        )
    }
}

function shorten( originalString, length ) {
    if( originalString.length <= length ) return originalString
    let shortString = originalString.substr(0,length)
    return `${shortString}...`
}
