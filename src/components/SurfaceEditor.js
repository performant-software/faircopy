import React, { Component } from 'react'
import axios from 'axios';
import { Typography } from '@material-ui/core'
import OpenSeadragon from 'openseadragon'
import * as ZoneLayer from 'annotorious-openseadragon'
import { getImageInfoURL } from '../tei-document/iiif'
import SurfaceEditorToolbar from './SurfaceEditorToolbar'
import SurfaceDetailCard from './SurfaceDetailCard'
import ZonePopup from './ZonePopup';

export default class SurfaceEditor extends Component {

    constructor() {
        super()
        this.state = {
            selectedZone: null,
            selectedDOMElement: null,
        }
    }
    
    componentWillUnmount() {
        if(this.viewer){
            this.viewer.destroy();
        }    
    }

    loadZones() {
        // const { facsDocument, surfaceIndex } = this.props
        // const surface = facsDocument.getSurface(surfaceIndex)

        return [ 
            { id: '#zone1', ulx: 100, uly: 100, lrx: 200, lry: 200 },
            { id: '#zone2', ulx: 500, uly: 500, lrx: 600, lry: 600 }
        ]
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

            this.zoneLayer = ZoneLayer(this.viewer,{})

            const zones = this.loadZones()
            this.zoneLayer.setZones(zones)

            this.zoneLayer.on('zoneSelected', function(zone) {
                console.log('zone selected: '+zone.id);
            });
      
            this.zoneLayer.on('zoneSaved', function(zone) {
                console.log('zone saved: '+zone.id);
            });
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

    onSelectMode = () => {
        this.zoneLayer.setDrawingEnabled(false)
        this.zoneLayer.cancel();
    }

    onDrawSquare = () => {
        this.zoneLayer.setDrawingEnabled(true)
        this.zoneLayer.setDrawingTool('rect')
    }

    render() {
        const { fairCopyProject, facsDocument, surfaceIndex, imageViewMode, onChangeView } = this.props
        const { selectedDOMElement, selectedZone } = this.state
        const resourceName = fairCopyProject ? fairCopyProject.resources[facsDocument.resourceID].name : ""
    
        return (
            <div id="FacsDetail" >
                { !imageViewMode && 
                    <div>
                        <div className="titlebar">
                            <Typography component="h1" variant="h6">{resourceName}</Typography>
                        </div>        
                        <SurfaceEditorToolbar 
                            surfaceIndex={surfaceIndex}
                            onDrawSquare={this.onDrawSquare}
                            onSelectMode={this.onSelectMode}
                            onChangeView={onChangeView} 
                        ></SurfaceEditorToolbar>
                    </div>
                }
                <div className="editor">
                    <SurfaceDetailCard facsDocument={facsDocument} surfaceIndex={surfaceIndex} changeSurfaceIndex={this.setSurfaceIndex} ></SurfaceDetailCard>
                    <SeaDragonComponent showSearchBar={!imageViewMode} initViewer={this.initViewer} ></SeaDragonComponent>
                </div>
                <ZonePopup
                    zone={selectedZone}
                    anchorEl={selectedDOMElement}
                ></ZonePopup>
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
  