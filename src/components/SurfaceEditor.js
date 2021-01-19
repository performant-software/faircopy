import React, { Component } from 'react'
import axios from 'axios';
import { Typography } from '@material-ui/core'
import OpenSeadragon from 'openseadragon-fabricjs-overlay/openseadragon/openseadragon';
import { fabric } from 'openseadragon-fabricjs-overlay/fabric/fabric.adapted';
import openSeaDragonFabricOverlay from 'openseadragon-fabricjs-overlay/openseadragon-fabricjs-overlay';

import { getImageInfoURL } from '../tei-document/iiif'
import SurfaceEditorToolbar from './SurfaceEditorToolbar'
import SurfaceDetailCard from './SurfaceDetailCard'

// overlay these modules
openSeaDragonFabricOverlay(OpenSeadragon, fabric);

// from https://stackoverflow.com/a/48343346/6126327 - show consistent stroke width regardless of object scaling
fabric.Object.prototype._renderStroke = function(ctx) {
    if (!this.stroke || this.strokeWidth === 0) {
        return;
    }
    if (this.shadow && !this.shadow.affectStroke) {
        this._removeShadow(ctx);
    }
    ctx.save();
    ctx.scale(1 / this.scaleX, 1 / this.scaleY);
    this._setLineDash(ctx, this.strokeDashArray, this._renderDashedStroke);
    this._applyPatternGradientTransform(ctx, this.stroke);
    ctx.stroke();
    ctx.restore();
};

export default class SurfaceEditor extends Component {

    componentWillUnmount() {
        if(this.viewer){
            this.viewer.destroy();
        }    
    }

    initViewer = (el) => {
        if( !el ) {
            this.viewer = null
            this.overlay = null
            return
        }
        const { facsDocument, surfaceIndex } = this.props
        const surface = facsDocument.getSurface(surfaceIndex)

        const createOSD = (tileSource) => {
            this.viewer = OpenSeadragon({
                element: el,
                tileSources: tileSource,
                showHomeControl: false,
                showFullPageControl: false,
                showZoomControl: false
            })    
            this.overlay = this.viewer.fabricjsOverlay({scale: 2000});
        }

        if( surface.type === 'iiif') {
            const imageInfoURL = getImageInfoURL( surface )
            axios.get(imageInfoURL).then((response) => {
                createOSD(response.data)   
            }, (err) => {
                console.log('Unable to load image: ' + err);
            })    
        } else {
            const imageFileURL = `local://${surface.resourceEntryID}`
            createOSD({ type: 'image', url: imageFileURL })
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
  