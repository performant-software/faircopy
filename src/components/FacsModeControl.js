import React, { Component } from 'react'
import { Button, Tooltip } from '@material-ui/core';

export default class FacsModeControl extends Component {    
    render() {
        const { selected, buttonProps, onChangeView, surfaceIndex, onWindow } = this.props

        return (
            <div id="FacsModeControl" >
                <Tooltip title="Index View">
                    <span>
                        <Button
                            {...buttonProps}
                            onClick={ () => onChangeView(surfaceIndex,'index') }
                        >
                            <i className={`${ selected === 'index' ? 'selected-action' : ''} fas fa-list fa-2x`}></i>
                        </Button> 
                    </span>
                </Tooltip>
                <Tooltip title="Detail View">
                    <span>
                        <Button
                            {...buttonProps}
                            onClick={ () => onChangeView(surfaceIndex,'detail') }
                        >
                            <i className={`${ selected === 'detail' ? 'selected-action' : ''} fas fa-image fa-2x`}></i>
                        </Button> 
                    </span>
                </Tooltip>
                { onWindow && 
                    <Tooltip title="Display in New Window">
                        <span>
                            <Button
                                {...buttonProps}
                                onClick={onWindow}
                            >
                                <i className={`fas fa-external-link fa-lg`}></i>
                            </Button> 
                        </span>
                    </Tooltip>            
                }
            </div>
        )
    }
}

