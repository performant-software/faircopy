import React, { Component } from 'react'
import axios from 'axios';
import { Typography } from '@material-ui/core'
import OpenSeadragon from 'openseadragon'
import * as ZoneLayer from 'annotorious-openseadragon'
import { getImageInfoURL } from '../tei-document/iiif'
import SurfaceEditorToolbar from './SurfaceEditorToolbar'
import SurfaceDetailCard from './SurfaceDetailCard'
import ZonePopup from './ZonePopup';
import { getSurfaceNames } from '../tei-document/convert-facs'

export default class SurfaceEditor extends Component {

    constructor() {
        super()
        this.state = {
            selectedTool: 'select',
            selectedZone: null,
            selectedDOMElement: null,
        }
    }

    clearSelection() {
        this.setState({ ...this.state, selectedZone: null, selectedDOMElement: null, selectedTool: 'select'})
    }

    componentDidMount() {
        const { facsDocument } = this.props
        facsDocument.addUpdateListener(this.updateListener)
    }
    
    componentWillUnmount() {
        if(this.viewer){
            this.viewer.destroy();
        }    
        const { facsDocument } = this.props
        facsDocument.removeUpdateListener(this.updateListener)
    }

    // listen for updates from other processes to the zones 
    updateListener = () => {
        const { facsDocument, surfaceIndex } = this.props
        const surface = facsDocument.getSurface(surfaceIndex)
        this.loadZones(surface)
    }

    loadZones(surface) {
        const { zones } = surface
        // TODO look at n values to determine next zone number
        this.zoneLayer.cancel()
        this.zoneLayer.setZones(zones)
        this.setState({...this.state, selectedZone: null, selectedDOMElement: null })
    }

    createOSD(el,tileSource)  {
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

        this.zoneLayer.on('zoneSelected', (selectedZone, selectedDOMElement) => {
            if( selectedZone.id === null ) {
                const { facsDocument, surfaceIndex } = this.props
                const surface = facsDocument.getSurface(surfaceIndex)
                selectedZone.id = facsDocument.nextZoneID(surface.id)
            }
            this.setState({...this.state, selectedZone, selectedDOMElement })
        })
    }

    initViewer = (el) => {
        if( !el ) {
            this.viewer = null
            this.overlay = null
            return
        }
        const { facsDocument, surfaceIndex } = this.props
        const surface = facsDocument.getSurface(surfaceIndex)

        if( surface.type === 'iiif') {
            const imageInfoURL = getImageInfoURL( surface )
            axios.get(imageInfoURL).then((response) => {
                this.createOSD(el,response.data)   
                this.loadZones(surface)
            }, (err) => {
                console.log('Unable to load image: ' + err);
            })    
        } else {
            const imageFileURL = `local://${surface.resourceEntryID}`
            this.createOSD(el,{ type: 'image', url: imageFileURL })
            this.loadZones(surface)
        }
    }

    setSurfaceIndex = ( nextIndex ) => {
        const { facsDocument, onChangeView } = this.props
        const nextSurface = facsDocument.getSurface(nextIndex)
        const viewMode = 'detail'

        if( nextSurface.type === 'iiif' ) {
            const imageInfoURL = getImageInfoURL( nextSurface )
            axios.get(imageInfoURL).then((response) => {
                const tileSource = response.data
                this.viewer.open(tileSource)
                this.loadZones(nextSurface)
                onChangeView(nextIndex,viewMode)
            })    
        } else {
            const imageFileURL = `local://${nextSurface.resourceEntryID}`
            this.viewer.open({ type: 'image', url: imageFileURL })
            this.loadZones(nextSurface)
            onChangeView(nextIndex,viewMode)
        }
    }

    onChangeTool = (tool) => {
        if( tool === 'select' ) {
            this.zoneLayer.setDrawingEnabled(false)
            this.zoneLayer.cancel()
            this.setState({ ...this.state, selectedZone: null, selectedDOMElement: null, selectedTool: 'select' })
        } else {
            this.zoneLayer.setDrawingEnabled(true)
            if( tool === 'rect' || tool === 'polygon') this.zoneLayer.setDrawingTool(tool)                
            this.setState({ ...this.state, selectedTool: tool })
        }
    }

    onSaveZone = () => {
        const { facsDocument, surfaceIndex } = this.props
        const { selectedZone } = this.state
        
        this.zoneLayer.save(selectedZone)
        const surface = facsDocument.getSurface(surfaceIndex)
        surface.zones = this.zoneLayer.getZones()
        facsDocument.save()

        this.zoneLayer.setDrawingEnabled(false)
        this.clearSelection()
    }

    onCancelZone = () => {
        this.zoneLayer.cancel()
        this.clearSelection()
    }

    onEraseZone = () => {
        const { facsDocument, surfaceIndex } = this.props
        this.zoneLayer.removeSelectedZone()
        this.onCancelZone()
        const surface = facsDocument.getSurface(surfaceIndex)
        surface.zones = this.zoneLayer.getZones()
        facsDocument.save()
    }

    render() {
        const { resourceEntry, facsDocument, surfaceIndex, onChangeView, onWindow } = this.props
        const { selectedDOMElement, selectedZone, selectedTool } = this.state
        const surface = facsDocument.getSurface(surfaceIndex)
        const surfaceNames = getSurfaceNames(surface)
        const facsID = resourceEntry.localID

        const onChangeZone = (name,value,error) => {
            if( !error ) {
                const nextZone = { ...selectedZone }
                nextZone[name] = value
                this.setState({ ...this.state, selectedZone: nextZone })    
            }
        }

        const onChangeSurface = (name,value,error) => {
            if( !error ) {
                const surface = facsDocument.getSurface(surfaceIndex)
                surface[name] = value
                facsDocument.save()
                this.setState({ ...this.state })    
            }
        }
    
        return (
            <div id="SurfaceEditor" >
                <div>
                    <div className="titlebar">
                        <Typography component="h1" variant="h6">{resourceEntry.name} - {surfaceNames.title}</Typography>
                    </div>        
                    <SurfaceEditorToolbar 
                        surfaceIndex={surfaceIndex}
                        selectedTool = {selectedTool}
                        onChangeTool={this.onChangeTool}
                        onChangeView={onChangeView} 
                        onWindow={onWindow}
                    ></SurfaceEditorToolbar>
                </div>
                <div className="editor">
                    <SurfaceDetailCard facsDocument={facsDocument} facsID={facsID} surfaceIndex={surfaceIndex} onChange={onChangeSurface} changeSurfaceIndex={this.setSurfaceIndex} ></SurfaceDetailCard>
                    <SeaDragonComponent initViewer={this.initViewer} ></SeaDragonComponent>
                    <ZonePopup
                        zone={selectedZone}
                        anchorEl={selectedDOMElement}
                        facsDocument={facsDocument}
                        facsID={facsID}
                        onChange={onChangeZone}
                        onErase={this.onEraseZone}
                        onSave={this.onSaveZone}
                        onCancel={this.onCancelZone}
                    ></ZonePopup>
                </div>
            </div>
        )
    }
}

class SeaDragonComponent extends Component {
  
    shouldComponentUpdate() {
        return false
    }

    render() {
        const { initViewer } = this.props
        return <div className={`osd-viewer`} ref={(el)=> { initViewer(el) }}></div>
    }
}
  