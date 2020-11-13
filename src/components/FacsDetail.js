import React, { Component } from 'react'
import OpenSeadragon from 'openseadragon';
import axios from 'axios';
import { Typography, Button, Card, CardHeader, CardActions, CardContent } from '@material-ui/core';

import { getImageInfoURL, getLocalString } from '../tei-document/iiif'
import FacsModeControl from './FacsModeControl';

export default class FacsDetail extends Component {

    componentWillUnmount() {
        if(this.viewer){
            this.viewer.destroy();
        }    
    }

    initViewer = (el) => {
        if( !el ) {
            this.viewer = null
            return
        }
        const { facsDocument, surfaceIndex } = this.props
        const surface = facsDocument.getSurface(surfaceIndex)
        const imageInfoURL = getImageInfoURL( surface )
        axios.get(imageInfoURL).then((response) => {
            const tileSource = response.data
            this.viewer = OpenSeadragon({
                element: el,
                tileSources: tileSource,
                showHomeControl: false,
                showFullPageControl: false,
                showZoomControl: false
            })    
        }, (err) => {
            console.log('Unable to load image: ' + err);
        })
    }
    
    setSurfaceIndex( nextIndex ) {
        const { facsDocument, onChangeView } = this.props
        const nextSurface = facsDocument.getSurface(nextIndex)
        const imageInfoURL = getImageInfoURL( nextSurface )
        axios.get(imageInfoURL).then((response) => {
            const tileSource = response.data
            this.viewer.open(tileSource)
            onChangeView(nextIndex,'detail')
        })
    }

    renderSubHeadings(subHeadings) {
        if( subHeadings.length === 0 ) return null

        const subHeadingEls = []
        let n = 0
        for( const subHeading of subHeadings ) {
            subHeadingEls.push(
                <Typography
                    key={`subheading-${n++}`}
                >
                    {subHeading}
                </Typography>
            )
        }

        return ( <div>{ subHeadingEls }</div>)
    }

    renderToolbar() {
        const { onChangeView, surfaceIndex } = this.props
        
        const buttonProps = {
            disableRipple: true,
            disableFocusRipple: true
        }

        return (
            <div className='top-bar' >
                <Button
                    disabled
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-mouse-pointer fa-2x"></i>
                </Button> 
                <Button
                    disabled
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-draw-square fa-2x"></i>
                </Button> 
                <Button
                    disabled
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-draw-circle fa-2x"></i>
                </Button> 
                <Button
                    disabled
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-draw-eraser fa-2x"></i>
                </Button> 
                <Button
                    disabled
                    className="toolbar-button-right"
                    {...buttonProps}
                >
                    <i className="fas fa-save fa-2x"></i>
                </Button> 
                <FacsModeControl
                    surfaceIndex={surfaceIndex}
                    selected={'detail'}
                    buttonProps={buttonProps}
                    onChangeView={onChangeView}
                ></FacsModeControl>
            </div>
        )
    }
    
    render() {
        const { fairCopyProject, facsDocument, surfaceIndex } = this.props
        const surface = facsDocument.getSurface(surfaceIndex)
        const resourceName = fairCopyProject ? fairCopyProject.resources[facsDocument.resourceID].name : ""
        const {surfaces} = facsDocument.facs

        const enablePrev = surfaceIndex > 0
        const enableNext = surfaceIndex < surfaces.length-1

        const onPrev = () => {
            if(enablePrev) {
                this.setSurfaceIndex( surfaceIndex - 1 )
            }
        }

        const onNext = () => {
            if(enableNext) {
                this.setSurfaceIndex( surfaceIndex + 1 )
            }
        }

        const labels = getLocalString(surface.localLabels, 'en')
        const title = labels[0]
        const subHeadings = labels.slice(1)

        const showSearchBar = !!this.props.facsDocument

        return (
            <div id="FacsDetail" >
                { showSearchBar && 
                    <div>
                        <div className="titlebar">
                            <Typography component="h1" variant="h6">{resourceName}</Typography>
                        </div>        
                        { this.renderToolbar() }
                    </div>
                }
                <div className="editor">
                    <Card className='bottom-bar' >
                        <CardHeader 
                            title={title}
                            subheader={`#${surface.id}`}
                            className="nav-controls"
                        >
                        </CardHeader>
                        { subHeadings &&
                            <CardContent>
                                { this.renderSubHeadings(subHeadings) }
                            </CardContent>
                        }
                        <CardActions>
                            { enablePrev && <Button onClick={onPrev} className='prev-nav-button'><i className='fas fa-chevron-circle-left fa-2x'></i></Button> }
                            { enableNext && <Button onClick={onNext} className='next-nav-button'><i className='fas fa-chevron-circle-right fa-2x'></i></Button> }
                        </CardActions>
                    </Card>
                    <SeaDragonComponent showSearchBar={showSearchBar} initViewer={this.initViewer} ></SeaDragonComponent>
                </div>
            </div>
        )
    }
}



class SeaDragonComponent extends Component {
  
    shouldComponentUpdate() {
      return false;
    }
  
    render() {
      const { initViewer, showSearchBar } = this.props
      const searchFlag = showSearchBar ? 'search-on' : 'search-off' 
      return <div className={`osd-viewer ${searchFlag}`} ref={(el)=> { initViewer(el) }}></div>
    }
  }
  