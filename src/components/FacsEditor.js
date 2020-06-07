import React, { Component } from 'react'
import OpenSeadragon from 'openseadragon';
import axios from 'axios';
import { Typography, Button } from '@material-ui/core';

import SearchBar from './SearchBar';

export default class FacsEditor extends Component {

    constructor(props) {
        super()
        
        const { facsDocument } = props
        const surfaces = facsDocument.getSurfaces()
        const surface = surfaces[0]

        this.state = {
            surface,
            surfaceIndex: 0
        }
    }

    componentWillUnmount() {
        if(typeof this.viewer !== 'undefined'){
            this.viewer.destroy();
        }    
    }

    getImageInfoURL( surface ) {
        const slash = surface.imageAPIURL.endsWith('/') ? '' : '/'
        return `${surface.imageAPIURL}${slash}info.json`
    }

    initViewer = (el) => {
        if( !el ) {
            this.viewer = null
            return
        }
        const { surface } = this.state
        const imageInfoURL = this.getImageInfoURL( surface )
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
        const { facsDocument } = this.props
        const surfaces = facsDocument.getSurfaces()
        const nextSurface = surfaces[nextIndex]
        const imageInfoURL = this.getImageInfoURL( nextSurface )
        axios.get(imageInfoURL).then((response) => {
            const tileSource = response.data
            this.viewer.open(tileSource)
            this.setState({ ...this.state, surface: nextSurface, surfaceIndex: nextIndex })
        })
    }
    
    render() {
        const { fairCopyProject, facsDocument, hidden } = this.props
        const { surfaceIndex } = this.state
        const resourceName = fairCopyProject.resources[facsDocument.resourceID].name
        const surfaces = facsDocument.getSurfaces()

        const style = hidden ? { display: 'none' } : {}
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

        return (
            <div id="FacsEditor" style={style} >
                <div className="titlebar">
                    <SearchBar></SearchBar>
                    <Typography component="h1" variant="h6">{resourceName}</Typography>
                </div>
                <div className="editor">
                    { enablePrev && <Button onClick={onPrev} className='prev-nav-button'><i className='fas fa-caret-left fa-7x'></i></Button> }
                    { enableNext && <Button onClick={onNext} className='next-nav-button'><i className='fas fa-caret-right fa-7x'></i></Button> }
                    <SeaDragonComponent initViewer={this.initViewer} ></SeaDragonComponent>
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
      const { initViewer } = this.props
      return <div className="osd-viewer" ref={(el)=> { initViewer(el) }}></div>
    }
  }
  