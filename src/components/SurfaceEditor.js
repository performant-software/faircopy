import React, { Component } from 'react'
import axios from 'axios';
import { Typography } from '@material-ui/core'
import OpenSeadragon from 'openseadragon';

import { getImageInfoURL } from '../tei-document/iiif'
import SurfaceEditorToolbar from './SurfaceEditorToolbar'
import SurfaceDetailCard from './SurfaceDetailCard'
import SeaDragonComponent from './SeaDragonComponent'

export default class SurfaceEditor extends Component {

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

        if( surface.type === 'iiif') {
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
        } else {
            const imageFileURL = `local://${surface.resourceEntryID}`
            this.viewer = OpenSeadragon({
                element: el,
                tileSources: { type: 'image', url: imageFileURL },
                showHomeControl: false,
                showFullPageControl: false,
                maxZoomPixelRatio: Infinity,
                showZoomControl: false
            }) 
        }
    }
    
    setSurfaceIndex = ( nextIndex ) => {
        const { facsDocument, onChangeView, imageViewMode } = this.props
        const nextSurface = facsDocument.getSurface(nextIndex)
        const viewMode = imageViewMode ? 'imageView' : 'detail'

        if( nextSurface.type === 'iiif' ) {
            const imageInfoURL = getImageInfoURL( nextSurface )
            axios.get(imageInfoURL).then((response) => {
                const tileSource = response.data
                this.viewer.open(tileSource)
                onChangeView(nextIndex,viewMode)
            })    
        } else {
            const imageFileURL = `local://${nextSurface.resourceEntryID}`
            this.viewer.open({ type: 'image', url: imageFileURL })
            onChangeView(nextIndex,viewMode)
        }
    }

    render() {
        const { fairCopyProject, facsDocument, surfaceIndex, imageViewMode, onChangeView } = this.props
        const resourceName = fairCopyProject ? fairCopyProject.resources[facsDocument.resourceID].name : ""
    
        return (
            <div id="FacsDetail" >
                { !imageViewMode && 
                    <div>
                        <div className="titlebar">
                            <Typography component="h1" variant="h6">{resourceName}</Typography>
                        </div>        
                        <SurfaceEditorToolbar onChangeView={onChangeView} surfaceIndex={surfaceIndex}></SurfaceEditorToolbar>
                    </div>
                }
                <div className="editor">
                    <SurfaceDetailCard facsDocument={facsDocument} surfaceIndex={surfaceIndex} changeSurfaceIndex={this.setSurfaceIndex} ></SurfaceDetailCard>
                    <SeaDragonComponent showSearchBar={!imageViewMode} initViewer={this.initViewer} ></SeaDragonComponent>
                </div>
            </div>
        )
    }
}