import React, { Component } from 'react'
import { Button, Typography, Card, CardContent, CardActionArea} from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ProjectWindow extends Component {
  
    render() {
        const projectPath = 'test-docs/example.faircopy'
        const onClickRecent = () => {
            fairCopy.services.ipcSend('requestProject', projectPath )
        }
        const onClickOpen = () => {
            fairCopy.services.ipcSend('requestFileOpen')
        }

        return (
            <div id="ProjectWindow" >
                <div className='header'>
                    <Typography variant="h5" component="h1"><i className='fas fa-feather-alt fa-lg'></i> FairCopy</Typography>
                    <Typography>A word processor for the humanities scholar.</Typography>
                </div>
                <div className="content">
                    <div className="left-side">
                        <ul>
                            <li><Button disabled variant='outlined'>New Project...</Button></li>
                            <li><Button onClick={onClickOpen} variant='outlined'>Open Project...</Button></li>
                        </ul>
                    </div>
                    <div className="right-side">
                        <Typography variant="h6" component="h2">Recent Projects</Typography>
                        <Card variant="outlined">
                            <CardActionArea onClick={onClickRecent}>
                                <CardContent>
                                    <Typography><i className='fas fa-book'></i> Example Project</Typography>
                                    <Typography variant="body2">{projectPath}</Typography>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    </div>
                </div>
                <div>
                    <Typography className='version'>Version: v0.6.0</Typography>
                    <Button className='quit-button' variant='outlined'>Quit</Button>
                </div>
            </div>
        )
    }

}
