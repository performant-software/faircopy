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
            nextZoneNumber: 1
        }
    }

    clearSelection() {
        this.setState({ ...this.state, selectedZone: null, selectedDOMElement: null })
    }
    
    componentWillUnmount() {
        if(this.viewer){
            this.viewer.destroy();
        }    
    }

    loadZones() {
        // const { facsDocument, surfaceIndex } = this.props
        // const surface = facsDocument.getSurface(surfaceIndex)

        this.setState({...this.state, nextZoneNumber: 3 })
        return [ 
            { id: '#zone1', n: 1, ulx: 100, uly: 100, lrx: 200, lry: 200, note: "note for zone 1" },
            { id: '#zone2', n: 2, ulx: 500, uly: 500, lrx: 600, lry: 600, note: "note zone 2"}
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
                showNavigator: true,
                navigatorPosition: 'BOTTOM_RIGHT',
                showHomeControl: false,
                showFullPageControl: false,
                showZoomControl: false
            })    

            this.zoneLayer = ZoneLayer(this.viewer,{})

            const zones = this.loadZones()
            this.zoneLayer.setZones(zones)

            this.zoneLayer.on('zoneSelected', (selectedZone, selectedDOMElement) => {
                let { nextZoneNumber } = this.state
                if( selectedZone.id === null ) {
                    selectedZone.id = `zone${nextZoneNumber++}`
                }
                this.setState({...this.state, selectedZone, selectedDOMElement, nextZoneNumber })
            })
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
                // TODO load the zones for this surface
                onChangeView(nextIndex,viewMode)
            })    
        } else {
            const imageFileURL = `local://${nextSurface.resourceEntryID}`
            this.viewer.open({ type: 'image', url: imageFileURL })
            // TODO load the zones for this surface
            onChangeView(nextIndex,viewMode)
        }
    }

    onSelectMode = () => {
        this.zoneLayer.setDrawingEnabled(false)
        this.zoneLayer.cancel();
        this.clearSelection()
    }

    onDrawSquare = () => {
        this.zoneLayer.setDrawingEnabled(true)
        this.zoneLayer.setDrawingTool('rect')
    }

    onSaveZone = () => {
        const { selectedZone } = this.state
        this.zoneLayer.save(selectedZone)
        // TODO write the zones to the facs document
        this.zoneLayer.setDrawingEnabled(false)
        this.clearSelection()
    }

    onCancelZone = () => {
        this.zoneLayer.cancel()
        this.clearSelection()
    }

    render() {
        const { fairCopyProject, facsDocument, surfaceIndex, imageViewMode, onChangeView } = this.props
        const { selectedDOMElement, selectedZone } = this.state
        const resourceName = fairCopyProject ? fairCopyProject.resources[facsDocument.resourceID].name : ""

        const onChangeZone = (e) => {
            const {name, value} = e.target
            const nextZone = { ...selectedZone }
            nextZone[name] = value
            this.setState({ ...this.state, selectedZone: nextZone })
        }
    
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
                    onChange={onChangeZone}
                    onSave={this.onSaveZone}
                    onCancel={this.onCancelZone}
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
  