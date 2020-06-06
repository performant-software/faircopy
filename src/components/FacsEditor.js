import React, { Component } from 'react'
import OpenSeadragon from 'openseadragon';
import axios from 'axios';
import { Typography } from '@material-ui/core';

import SearchBar from './SearchBar';

export default class FacsEditor extends Component {

    componentWillUnmount() {
        if(typeof this.viewer !== 'undefined'){
            this.viewer.destroy();
        }    
    }

    initViewer = (el) => {
        const { facsDocument } = this.props
        const { facs } = facsDocument
        const { surfaces } = facs

        // create an array of ajax get promises
        const requests = []
        for( const surface of surfaces.slice(0,3) ) {
            const slash = surface.imageAPIURL.endsWith('/') ? '' : '/'
            requests.push( axios.get(`${surface.imageAPIURL}${slash}info.json`) )
        }

        Promise.all(requests).then((responses) => {
            const tileSources = responses.map((response) => response.data )
            this.viewer = OpenSeadragon({
                element: el,
                tileSources,
                showHomeControl: false,
                showFullPageControl: false,
                showZoomControl: false,
                sequenceMode: true
            })    
        }, (err) => {
            console.log('Unable to load image: ' + err);
        })
	}
    
    render() {
        const { hidden } = this.props

        const style = hidden ? { display: 'none' } : {}

        return (
            <div id="FacsEditor" style={style} >
                <div className="titlebar">
                    <SearchBar></SearchBar>
                    <Typography component="h1" variant="h6">Image Name</Typography>
                </div>
                <SeaDragonComponent initViewer={this.initViewer} ></SeaDragonComponent>
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
  