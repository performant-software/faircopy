import React, { Component } from 'react'
import { Button, Typography, Card } from '@material-ui/core'
import IDField from '../../main-window/tei-editor/attribute-fields/IDField'
import { getLicenseType } from '../../../model/license-key'

export default class SurfaceDetailCard extends Component {

    renderSubHeadings(subHeadings) {
        if( !subHeadings || subHeadings.length === 0 ) return null

        const subHeadingEls = []
        let n = 0
        for( const subHeading of subHeadings ) {
            subHeadingEls.push(
                <Typography
                    key={`subheading-${n++}`}
                >
                    {subHeading}
                </Typography>
            )
        }

        return ( <div>{ subHeadingEls }</div>)
    }

    render() {
        const { facsDocument, facsID, surfaceIndex, changeSurfaceIndex, onChange, isWindowed } = this.props
        const surface = facsDocument.getSurface(surfaceIndex)
        const {surfaces} = facsDocument.facs
        // const names = getSurfaceNames(surface)
        const readOnly = !facsDocument.isEditable()

        const enablePrev = surfaceIndex > 0
        const enableNext = surfaceIndex < surfaces.length-1

        const onPrev = () => {
            if(enablePrev) {
                changeSurfaceIndex( surfaceIndex - 1 )
            }
        }

        const onNext = () => {
            if(enableNext) {
                changeSurfaceIndex( surfaceIndex + 1 )
            }
        }
        const onChangeID = (value,error) => onChange('id',value,error)
        const licenseType = getLicenseType()
        
        let modeClass
        if( licenseType === 'free' ) {
            modeClass = isWindowed ? 'windowed-card' : 'full-card-with-bar'
        } else {
            modeClass = isWindowed ? 'windowed-card' : 'full-card'
        }

        return (
            <Card id="SurfaceDetailCard" className={modeClass} >
                <IDField
                    hasID={facsDocument.hasID}
                    value={surface.id}
                    onChangeCallback={onChangeID}
                    readOnly={readOnly}
                    idPrefix={facsID}
                ></IDField>           
                <Button size="small" disabled={!enablePrev} onClick={onPrev} className='prev-nav-button'><i className='fas fa-chevron-circle-left fa-2x'></i></Button>
                <Button size="small" disabled={!enableNext} onClick={onNext} className='next-nav-button'><i className='fas fa-chevron-circle-right fa-2x'></i></Button>
            </Card>
        )
    }
}