import React, { Component } from 'react'
import { Typography } from '@material-ui/core'
import { IconButton, Tooltip } from '@material-ui/core'
import { inlineRingSpinner } from '../common/ring-spinner'
import { ellipsis } from '../../model/ellipsis'

const maxTitleLength = 50

export default class TitleBar extends Component {
    
    onClickView = () => {
        const { currentView, onResourceAction, remoteProject } = this.props
        if( remoteProject ) {
            const action = currentView === 'home' ? 'remote' : 'home'
            onResourceAction(action)    
        } else {
            this.onClickRoot()
        }
    }

    onClickRoot = () => {
        const { onResourceAction } = this.props
        onResourceAction('root')
    }

    onClickTeiDoc = () => {
        const { onResourceAction, parentResource } = this.props
        onResourceAction('open-teidoc',parentResource.id,parentResource)        
    }

    renderHomeButton() {         
        const { currentView, isLoggedIn } = this.props    
        const viewIcon = currentView === 'home' ? 'fa fa-home-alt' : isLoggedIn() ? 'fa fa-cloud' : 'far fa-cloud' 
        return (
            <Tooltip title="Local Resources">
                <span>            
                    <IconButton
                        onClick={this.onClickView}
                        className="home-icon" 
                    >
                        <i className={`${viewIcon} fa-sm`}></i>
                    </IconButton> 
                </span>
            </Tooltip>
        )
    }

    renderTitle() {
        const { parentResource, resourceName, surfaceName, isImageWindow, onClickResource, loading, currentView } = this.props

        // calculate shortened lengths
        const surfaceNameLength = surfaceName ? surfaceName.length > maxTitleLength ? maxTitleLength : surfaceName.length : 0
        const resourceNameLength = resourceName ? resourceName.length > (maxTitleLength - surfaceNameLength) ? (maxTitleLength - surfaceNameLength) : resourceName.length : 0
        const teiDocNameLength = parentResource ? parentResource.name.length > (maxTitleLength - surfaceNameLength - resourceNameLength) ? (maxTitleLength - surfaceNameLength  - resourceNameLength) : parentResource.name.length : 0

        const teiDocNameShort = parentResource ? ellipsis( parentResource.name, teiDocNameLength ) : ''
        const resourceNameShort = resourceName ? ellipsis( resourceName, resourceNameLength ) : ''
        const surfaceNameShort = surfaceName ? ellipsis( surfaceName, surfaceNameLength ) : ''

        const chevClass = "fa fa-chevron-right"
        const resourceNameSeperator = isImageWindow ? <i aria-label="images" className="far fa-images image-icon-padding"></i> : <i aria-label="/" className={chevClass}></i>
        const viewName = currentView === 'home' ? 'Local' : 'Remote'
        const rootEl = !isImageWindow ? <span onClick={this.onClickRoot} className="nav-link" >{viewName}</span> : ""
        const surfaceNameEl = surfaceName && <span className="nav-link" ><i aria-label="/" className={chevClass}></i> {surfaceNameShort}</span>
        const resourceNameEl = resourceName && <span className="nav-link" onClick={onClickResource}>{resourceNameSeperator} {resourceNameShort}</span>
        const teiDocNameEl = parentResource && <span className="nav-link" onClick={this.onClickTeiDoc} ><i aria-label="/" className={chevClass}></i> {teiDocNameShort}</span>
        return (
            <div className="breadcrumbs">                
                <Typography component="h2" variant="h6">
                    {rootEl} {teiDocNameEl} {resourceNameEl} {surfaceNameEl} { loading && inlineRingSpinner('light') }
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