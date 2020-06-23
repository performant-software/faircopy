import React, { Component } from 'react'
import OpenSeadragon from 'openseadragon';
import axios from 'axios';
import { Typography, Button } from '@material-ui/core';

import SearchBar from './SearchBar';
import { getImageInfoURL } from '../tei-document/iiif'

export default class FacsEditor extends Component {

    constructor(props) {
        super()
        
        let facsDocument = props.facsDocument ? props.facsDocument : null
        let startIndex = 0

        if( props.imageView ) {
            const { imageView } = props
            facsDocument = imageView.facsDocument
            const { surfaces } = facsDocument.facs
            startIndex = surfaces.findIndex( s => s.id === imageView.startingID )
            startIndex = startIndex === -1 ? 0 : startIndex
        } 

        const surfaces = facsDocument.getSurfaces()
        const surface = surfaces[startIndex]                

        this.state = {
            surface,
            surfaceIndex: startIndex
        }
    }

    componentWillUnmount() {
        if(this.viewer){
            this.viewer.destroy();
        }    
    }

    getFacsDocument() {
        if( this.props.imageView ) {
            const { imageView } = this.props
            return imageView.facsDocument
        } else {
            return this.props.facsDocument
        }
    }

    initViewer = (el) => {
        if( !el ) {
            this.viewer = null
            return
        }
        const { surface } = this.state
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
        const facsDocument = this.getFacsDocument()
        const surfaces = facsDocument.getSurfaces()
        const nextSurface = surfaces[nextIndex]
        const imageInfoURL = getImageInfoURL( nextSurface )
        axios.get(imageInfoURL).then((response) => {
            const tileSource = response.data
            this.viewer.open(tileSource)
            this.setState({ ...this.state, surface: nextSurface, surfaceIndex: nextIndex })
        })
    }
    
    render() {
        const { fairCopyProject, hidden } = this.props
        const facsDocument = this.getFacsDocument()
        const { surfaceIndex } = this.state
        const resourceName = fairCopyProject ? fairCopyProject.resources[facsDocument.resourceID].name : ""
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

        const showSearchBar = !!this.props.facsDocument

        return (
            <div id="FacsEditor" style={style} >
                { showSearchBar && 
                    <div className="titlebar">
                        <SearchBar></SearchBar>
                        <Typography component="h1" variant="h6">{resourceName}</Typography>
                    </div>        
                }
                <div className="editor">
                    { enablePrev && <Button onClick={onPrev} className='prev-nav-button'><i className='fas fa-caret-left fa-7x'></i></Button> }
                    { enableNext && <Button onClick={onNext} className='next-nav-button'><i className='fas fa-caret-right fa-7x'></i></Button> }
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
  