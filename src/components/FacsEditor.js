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

		this.viewer = OpenSeadragon({
            // showNavigator: true,
            showHomeControl: false,
            showFullPageControl: false,
            showZoomControl: false,
            element: el
        });

        const urls = []
        for( const surface of surfaces ) {
            const slash = surface.imageAPIURL.endsWith('/') ? '' : '/'
            urls.push( `${surface.imageAPIURL}${slash}info.json` )
        }
        
		axios.get(urls[0]).then(
			(resp) => {
				this.viewer.addTiledImage({
					tileSource: resp.data
				});
			},
			(error) => {
				console.log('Unable to load image: ' + error);
			}
		);
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
  