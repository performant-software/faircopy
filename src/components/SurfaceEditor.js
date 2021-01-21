import React, { Component } from 'react'
import axios from 'axios';
import { Typography } from '@material-ui/core'
import OpenSeadragon from 'openseadragon'
import OSDAnnoLayer from 'annotorious-openseadragon'
import { getImageInfoURL } from '../tei-document/iiif'
import SurfaceEditorToolbar from './SurfaceEditorToolbar'
import SurfaceDetailCard from './SurfaceDetailCard'

export default class SurfaceEditor extends Component {

    componentWillUnmount() {
        if(this.viewer){
            this.viewer.destroy();
        }    
    }

    loadZones() {
        // const { facsDocument, surfaceIndex } = this.props
        // const surface = facsDocument.getSurface(surfaceIndex)

        // TODO Load Zones
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
            this.annotationLayer = OSDAnnoLayer(this.viewer,{});

            // TODO
            // this.annotationLayer.on('createSelection', this.handleCreateSelection);
            // this.annotationLayer.on('select', this.handleSelect);
            // this.annotationLayer.on('updateTarget', this.handleUpdateTarget);
            // this.annotationLayer.on('moveSelection', this.handleMoveSelection);
            // this.annotationLayer.on('mouseEnterAnnotation', this.props.onMouseEnterAnnotation);
            // this.annotationLayer.on('mouseLeaveAnnotation', this.props.onMouseLeaveAnnotation);
            
            this.loadZones()
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

    onMouseDown = () => {
        console.log('mouse down')
    }
    
    onMouseMove = (o) => {
        const mouse = this.overlay.fabricCanvas().getPointer(o.e);
        console.log(`mouse move x:${mouse.x} y:${mouse.y}`)
    }

    onMouseUp = () => {
        console.log('mouse up')
    }

    onDrawSquare = () => {
        this.viewer.setMouseNavEnabled(false)
        this.annotationLayer.setDrawingEnabled(true)
    }

    onSelectMode = () => {
        this.viewer.setMouseNavEnabled(true)
        this.annotationLayer.setDrawingEnabled(false)
        const annos = this.annotationLayer.getAnnotations()
        console.log(JSON.stringify(annos))
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
  