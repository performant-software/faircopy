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
		const url = 'https://ids.lib.harvard.edu/ids/iiif/47174896/info.json'

		this.viewer = OpenSeadragon({
            // showNavigator: true,
            showHomeControl: false,
            showFullPageControl: false,
            showZoomControl: false,
            element: el
        });
        
		axios.get(url).then(
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
  