import React, { Component } from 'react'
import { Button, Typography, Card, CardContent, CardActions} from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ProjectWindow extends Component {

    // constructor() {
    //     super()
    //     this.state = {
    //     }	
    // }

    // componentDidMount() {
    //     const {services} = fairCopy
    //     services.ipcRegisterCallback('resourceOpened', (event, resourceData) => this.receiveResourceData(resourceData))
    // }
    
    render() {

        const onClick = () => {
            // request open project
            fairCopy.services.ipcSend('requestProject', 'test-docs/test-project.zip' )
        }

        return (
            <div id="ProjectWindow" >
                <Typography variant="h5" component="h1">Welcome to FairCopy!</Typography>
                <div className="content">
                    <div className="left-side">
                        <ul>
                            <li><Button variant='outlined'>New Project</Button></li>
                            <li><Button variant='outlined'>Open Project</Button></li>
                        </ul>
                    </div>
                    <div className="right-side">
                        <Typography variant="h6" component="h2">Recent Projects</Typography>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography>Example Project</Typography>
                            </CardContent>
                            <CardActions>
                                <Button onClick={onClick} size="small">Open</Button>
                            </CardActions>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

}
