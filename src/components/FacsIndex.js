import React, { Component } from 'react'
import FacsModeControl from './FacsModeControl';
import { Button, Typography } from '@material-ui/core';

export default class FacsIndex extends Component {   
    
    
    renderToolbar() {
        const { onChangeMode } = this.props
        
        const buttonProps = {
            disableRipple: true,
            disableFocusRipple: true
        }

        return (
            <div className='top-bar' >
                <Button
                    disabled
                    className="toolbar-button-right"
                    {...buttonProps}
                >
                    <i className="fas fa-save fa-2x"></i>
                </Button> 
                <FacsModeControl
                    selected={'index'}
                    buttonProps={buttonProps}
                    onChangeMode={onChangeMode}
                ></FacsModeControl>
            </div>
        )
    }

    getFacsDocument() {
        if( this.props.imageView ) {
            const { imageView } = this.props
            return imageView.facsDocument
        } else {
            return this.props.facsDocument
        }
    }
    
    render() {
        const { fairCopyProject } = this.props
        const facsDocument = this.getFacsDocument()
        const resourceName = fairCopyProject ? fairCopyProject.resources[facsDocument.resourceID].name : ""

        const showSearchBar = !!this.props.facsDocument

        return (
            <div id="FacsIndex" >
                { showSearchBar && 
                    <div>
                        <div className="titlebar">
                            <Typography component="h1" variant="h6">{resourceName}</Typography>
                        </div>        
                        { this.renderToolbar() }
                    </div>
                }
                <div className="facs-index-list">
                    <br></br><br></br><h1>INDEX</h1>
                </div>
            </div>
        )
    }
}

