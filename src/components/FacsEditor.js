import React, { Component } from 'react'
import OpenSeadragon from 'openseadragon';
import axios from 'axios';

export default class FacsEditor extends Component {

    componentDidMount() {
		const url = 'https://ids.lib.harvard.edu/ids/iiif/47174896/info.json'
        this.loadFolio(url);
    }

    loadFolio(url){
		if(typeof this.viewer !== 'undefined'){
			this.viewer.destroy();
		}
		this.viewer = OpenSeadragon({
            element: this.viewerEl
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
                <div className="osd-viewer" ref={(el)=> { this.viewerEl = el }}></div>
            </div>
        )
    }
}
